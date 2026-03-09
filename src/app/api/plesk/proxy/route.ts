import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import https from 'https';
// Ignorar advertencias de certificados autofirmados (típico en instalaciones Plesk por IP)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const supabaseUrl = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || '';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { serverId, method = 'GET', endpoint, payload } = body;

        if (!serverId || !endpoint) {
            return NextResponse.json({ error: 'Faltan parámetros: serverId y endpoint requeridos' }, { status: 400 });
        }

        // 1. Obtener credenciales del servidor desde DB o desde testConfig
        let serverApiKey = '';
        let serverApiUrl = '';

        if (body.testConfig && body.testConfig.api_url && body.testConfig.api_key) {
            // Modo de prueba de conexión directa: bypass DB
            serverApiUrl = body.testConfig.api_url;
            serverApiKey = body.testConfig.api_key;
        } else {
            const supabase = createClient(supabaseUrl, supabaseAnonKey);
            const { data: server, error: dbError } = await supabase
                .from('hosting_servers')
                .select('api_key, api_url, ip')
                .eq('id', serverId)
                .single();

            if (dbError || !server) {
                return NextResponse.json({ error: 'Servidor no encontrado' }, { status: 404 });
            }

            if (!server.api_key) {
                return NextResponse.json({ error: 'El servidor no tiene configurada la API Key' }, { status: 400 });
            }

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
            return NextResponse.json({ error: 'Error en la API de Plesk', details: data }, { status: statusCode });
        }

        return NextResponse.json({ success: true, data });

    } catch (e: any) {
        console.error('Plesk Proxy Error:', e);
        return NextResponse.json({ error: 'Error interno conectando con el panel Plesk', details: e.message }, { status: 500 });
    }
}
