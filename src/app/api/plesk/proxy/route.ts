import { NextRequest, NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';
import https from 'https';
import { Client } from 'ssh2';
// Ignorar advertencias de certificados autofirmados (típico en instalaciones Plesk por IP)
// Nota: Solo para entornos de desarrollo/pruebas si no hay certificados válidos.

export async function GET() {
    return NextResponse.json({ status: 'Plesk Proxy Active', timestamp: new Date().toISOString() });
}

export async function POST(req: NextRequest) {
    // Asegurar que no rechazamos certificados no autorizados para esta petición específica
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    try {
        const body = await req.json();
        const { serverId, method = 'GET', endpoint, payload } = body;

        if (!serverId || !endpoint) {
            return NextResponse.json({ error: 'Faltan parámetros: serverId y endpoint requeridos' }, { status: 400 });
        }

        // 1. Obtener credenciales del servidor desde DB o desde testConfig
        let serverApiKey = '';
        let serverApiUrl = '';
        let server: any = null;

        if (body.testConfig && body.testConfig.api_url && body.testConfig.api_key) {
            // Modo de prueba de conexión directa: bypass DB
            serverApiUrl = body.testConfig.api_url;
            serverApiKey = body.testConfig.api_key;
            server = { ip: new URL(serverApiUrl).hostname };
        } else {
            const { data: dbServer, error: dbError } = await insforge.database
                .from('hosting_servers')
                .select('*')
                .eq('id', serverId)
                .single();

            if (dbError || !dbServer) {
                return NextResponse.json({ error: 'Servidor no encontrado' }, { status: 404 });
            }

            if (!dbServer.api_key) {
                return NextResponse.json({ error: 'El servidor no tiene configurada la API Key' }, { status: 400 });
            }

            server = dbServer;
            serverApiKey = server.api_key;
            serverApiUrl = server.api_url || `https://${server.ip}:8443`;
        }

        // Limpieza de URL robusta
        let rawUrl = serverApiUrl.trim().replace(/\s+/g, '');
        if (!rawUrl.startsWith('http')) {
            rawUrl = `https://${rawUrl}`;
        }
        let baseUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
        let path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

        const apiUrl = `${baseUrl}${path}`;

        // --- CUSTOM: Generate One-Time Login Link via SSH ---
        if (endpoint === 'get_login_link' && server && server.ip && (server.ssh_user || server.root_password)) {
            try {
                const link = await getSSHLoginLink(server.ip, server.ssh_user || 'root', server.ssh_password || server.root_password);
                return NextResponse.json({ success: true, link });
            } catch (e) {
                console.error('SSH Login Link Error:', e);
                return NextResponse.json({ error: 'Error generando enlace de login' }, { status: 500 });
            }
        }

        // 2. Realizar petición real a la API de Plesk
        const headers: Record<string, string> = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-API-Key': serverApiKey
        };

        const fetchOptions: RequestInit = {
            method: method.toUpperCase(),
            headers,
        };

        if (payload && ['POST', 'PUT', 'PATCH'].includes(fetchOptions.method as string)) {
            fetchOptions.body = JSON.stringify(payload);
        }
        const { hostname, port, pathname, search } = new URL(apiUrl);

        let responseData: string = '';
        let statusCode = 200;

        await new Promise<void>((resolve, reject) => {
            const agent = new https.Agent({
                rejectUnauthorized: false
            });

            const reqOptions: https.RequestOptions = {
                hostname,
                port: port || 443,
                path: `${pathname}${search}`,
                method: method.toUpperCase(),
                headers,
                agent
            };

            const clientReq = https.request(reqOptions, (res) => {
                statusCode = res.statusCode || 200;
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                res.on('end', () => {
                    resolve();
                });
            });

            clientReq.on('error', (err) => {
                reject(err);
            });

            if (payload && ['POST', 'PUT', 'PATCH'].includes(reqOptions.method as string)) {
                clientReq.write(JSON.stringify(payload));
            }

            clientReq.end();
        });

        let data;
        try {
            data = responseData ? JSON.parse(responseData) : {};
        } catch {
            data = responseData; // En caso de que Plesk devuelva texto plano
        }

        if (statusCode < 200 || statusCode >= 300) {
            // --- FALLBACK: FS API 404/500 -> SSH FS ---
            if (endpoint.includes('/api/v2/fs') && server && server.ip && (server.ssh_user || server.root_password)) {
                try {
                    const urlParams = new URLSearchParams(endpoint.split('?')[1]);
                    const path = urlParams.get('file');
                    if (path) {
                        const files = await getSSHFiles(server.ip, server.ssh_user || 'root', server.ssh_password || server.root_password, path);
                        return NextResponse.json({ success: true, data: files });
                    }
                } catch (e) {
                    console.error('SSH FS Fallback Error:', e);
                }
            }
            return NextResponse.json({ error: 'Error en la API de Plesk', details: data }, { status: statusCode });
        }

        // --- ENHANCEMENT: System Metrics via SSH ---
        if (endpoint === '/api/v2/server' && body.withMetrics && server && server.ip && (server.ssh_user || server.root_password)) {
            try {
                const metrics = await getSSHMetrics(server.ip, server.ssh_user || 'root', server.ssh_password || server.root_password);
                data = { ...data, ...metrics };
            } catch (e) {
                console.error('SSH Metrics Error:', e);
                // Non-blocking, return just the API data if SSH fails
            }
        }

        // --- ENHANCEMENT: Domain Details (SSL, Folder) via SSH/CLI ---
        if (endpoint === '/api/v2/domains' && body.withDetails && server && server.ip && (server.ssh_user || server.root_password)) {
            try {
                const detailedDomains = await getEnhancedDomainInfo(server.ip, server.ssh_user || 'root', server.ssh_password || server.root_password, data);
                data = detailedDomains;
            } catch (e) {
                console.error('SSH Domain Details Error:', e);
            }
        }

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error('Plesk Proxy Error:', error);
        return NextResponse.json({ error: error.message || 'Error interno del proxy' }, { status: 500 });
    }
}

async function getSSHMetrics(ip: string, user: string, pass: string): Promise<any> {
    console.log(`[SSH] Fetching metrics for ${ip}...`);
    return new Promise((resolve, reject) => {
        const conn = new Client();
        const timeout = setTimeout(() => {
            conn.end();
            resolve({ cpu_usage: 0, ram_usage: 0, ram_total: '0 GB', ram_used: '0 GB', disk_usage: 0 });
        }, 15000);

        conn.on('ready', () => {
            // Get core count, load, ram and disk usage
            conn.exec("nproc && uptime && free -m && df -h / | tail -1 | awk '{print $5}'", (err, stream) => {
                if (err) {
                    clearTimeout(timeout);
                    conn.end();
                    return resolve({ cpu_usage: 0, ram_usage: 0, ram_total: '0 GB', ram_used: '0 GB', disk_usage: 0, load: [0, 0, 0] });
                }
                let out = '';
                stream.on('data', (d: any) => out += d);
                stream.on('close', () => {
                    const lines = out.split('\n').filter(l => l.trim());
                    if (lines.length < 4) {
                        clearTimeout(timeout);
                        conn.end();
                        return resolve({ cpu_usage: 0, ram_usage: 0, ram_total: '0 GB', ram_used: '0 GB', disk_usage: 0, load: [0, 0, 0] });
                    }

                    const cores = parseInt(lines[0]) || 1;
                    const uptimeLine = lines[1];
                    const ramLine = lines.find(l => l.includes('Mem:'));
                    const diskLine = lines[lines.length - 1]; // Last line from df -h

                    // Parse CPU Load (e.g., "load average: 3.11, 1.89, 1.76")
                    const loadMatch = uptimeLine.match(/load average:\s+([\d.]+),\s+([\d.]+),\s+([\d.]+)/);
                    const load = loadMatch ? [parseFloat(loadMatch[1]), parseFloat(loadMatch[2]), parseFloat(loadMatch[3])] : [0, 0, 0];
                    const cpu_load_1m = load[0];

                    // Parse RAM
                    let ram_used = 0, ram_total = 0;
                    if (ramLine) {
                        const parts = ramLine.split(/\s+/).filter(Boolean);
                        ram_total = parseInt(parts[1]);
                        ram_used = parseInt(parts[2]);
                    }

                    // Parse Disk (e.g., "45%")
                    const disk_usage = parseInt(diskLine.replace('%', '')) || 0;

                    clearTimeout(timeout);
                    conn.end();
                    resolve({
                        cpu_usage: Math.min(Math.round((cpu_load_1m / cores) * 100), 100),
                        ram_usage: ram_total > 0 ? Math.round((ram_used / ram_total) * 100) : 0,
                        ram_total: `${(ram_total / 1024).toFixed(1)} GB`,
                        ram_used: `${(ram_used / 1024).toFixed(1)} GB`,
                        disk_usage,
                        load
                    });
                });
            });
        }).on('error', (err) => {
            clearTimeout(timeout);
            resolve({ cpu_usage: 0, ram_usage: 0, ram_total: '0 GB', ram_used: '0 GB', disk_usage: 0, load: [0, 0, 0] });
        }).connect({ host: ip, port: 22, username: user, password: pass, readyTimeout: 10000 });
    });
}

async function getEnhancedDomainInfo(ip: string, user: string, pass: string, domains: any[]): Promise<any> {
    if (!domains || domains.length === 0) return domains;
    console.log(`[SSH] Fetching detailed domain info for ${ip} (Optimized)...`);

    return new Promise((resolve, reject) => {
        const conn = new Client();
        const timeout = setTimeout(() => {
            conn.end();
            console.error(`[SSH] Timeout for ${ip}`);
            resolve(domains);
        }, 15000); // 15s timeout is plenty for file checks

        conn.on('ready', () => {
            // We fetch everything in one optimized script using direct file system checks
            // bypassing the slow 'plesk bin domain --info' CLI tool completely.
            let checks = domains.map(d => {
                const root = d.www_root || `/var/www/vhosts/${d.name}/httpdocs`;
                return `
                    cms="HTML"
                    [ -f "${root}/wp-config.php" ] && cms="WordPress"
                    [ -f "${root}/configuration.php" ] && cms="Joomla"
                    [ -d "${root}/app/etc" ] && cms="Magento"
                    
                    ssl="false"
                    if [ -f "/etc/nginx/plesk.conf.d/vhosts/${d.name}.conf" ]; then
                        grep -q "ssl_certificate " "/etc/nginx/plesk.conf.d/vhosts/${d.name}.conf" 2>/dev/null && ssl="true"
                    fi
                    
                    echo "DATA|${d.name}|${root}|$ssl|$cms"
                `;
            }).join('\n');

            conn.exec(`\n${checks}\n`, (err, stream) => {
                if (err) {
                    clearTimeout(timeout);
                    conn.end();
                    return resolve(domains);
                }
                let out = '';
                stream.on('data', (d: any) => out += d);
                stream.on('close', () => {
                    const infoMap: Record<string, any> = {};
                    out.split('\n').filter(l => l.startsWith('DATA|')).forEach(line => {
                        const [, name, root, ssl, cms] = line.split('|');
                        const isSsl = ssl?.toLowerCase().includes('true') || ssl?.toLowerCase().includes('enabled') || ssl?.toLowerCase().includes('on') || ssl?.toLowerCase().includes('si');
                        infoMap[name] = {
                            www_root: root?.trim(),
                            ssl: isSsl,
                            cms: cms?.trim() || ''
                        };
                    });

                    const enriched = domains.map(d => ({
                        ...d,
                        ...(infoMap[d.name] || { ssl: false, cms: '' })
                    }));

                    clearTimeout(timeout);
                    conn.end();
                    resolve(enriched);
                });
            });
        }).on('error', (err) => {
            clearTimeout(timeout);
            resolve(domains);
        }).connect({ host: ip, port: 22, username: user, password: pass, readyTimeout: 10000 });
    });
}
async function getSSHFiles(ip: string, user: string, pass: string, path: string): Promise<any> {
    console.log(`[SSH] Fetching files for ${ip} at ${path}...`);
    return new Promise((resolve, reject) => {
        const conn = new Client();
        const timeout = setTimeout(() => {
            conn.end();
            resolve([]);
        }, 15000);

        conn.on('ready', () => {
            // List files with type, size, date and permissions
            const cmd = `ls -ap --full-time "${path}" 2>/dev/null | grep -v "^total"`;
            conn.exec(cmd, (err, stream) => {
                if (err) {
                    clearTimeout(timeout);
                    conn.end();
                    return resolve([]);
                }
                let out = '';
                stream.on('data', (d: any) => out += d);
                stream.on('close', () => {
                    const files = out.split('\n').filter(Boolean).map(line => {
                        const parts = line.split(/\s+/).filter(Boolean);
                        if (parts.length < 9) return null;

                        const name = parts.slice(8).join(' ');
                        const isDir = name.endsWith('/');
                        const cleanName = isDir ? name.slice(0, -1) : name;

                        if (cleanName === '.' || cleanName === '..') return null;

                        return {
                            name: cleanName,
                            is_directory: isDir,
                            size: parseInt(parts[4]) || 0,
                            modification_date: `${parts[5]}T${parts[6]}Z`,
                            permissions: parts[0]
                        };
                    }).filter(Boolean);

                    clearTimeout(timeout);
                    conn.end();
                    resolve(files);
                });
            });
        }).on('error', (err) => {
            clearTimeout(timeout);
            resolve([]);
        }).connect({ host: ip, port: 22, username: user, password: pass, readyTimeout: 10000 });
    });
}

async function getSSHLoginLink(ip: string, user: string, pass: string): Promise<string> {
    console.log(`[SSH] Generating one-time login link for ${ip}...`);
    return new Promise((resolve, reject) => {
        const conn = new Client();
        const timeout = setTimeout(() => {
            conn.end();
            reject(new Error('SSH Timeout generate login link'));
        }, 15000);

        conn.on('ready', () => {
            conn.exec('plesk login', (err, stream) => {
                if (err) {
                    clearTimeout(timeout);
                    conn.end();
                    return reject(err);
                }
                let out = '';
                stream.on('data', (d: any) => out += d);
                stream.on('close', () => {
                    clearTimeout(timeout);
                    conn.end();
                    const match = out.match(/https?:\/\/[^\s]+/);
                    if (match) {
                        resolve(match[0]);
                    } else {
                        reject(new Error('No login link found in SSH output'));
                    }
                });
            });
        }).on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        }).connect({ host: ip, port: 22, username: user, password: pass, readyTimeout: 10000 });
    });
}
