import { NextResponse } from 'next/server';
import { Client } from 'ssh2';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { ip, username, password } = body;

        if (!ip || !username || !password) {
            return NextResponse.json({ success: false, error: 'Faltan datos de conexión SSH (IP, usuario o contraseña)' }, { status: 400 });
        }

        return new Promise<NextResponse>((resolve) => {
            const conn = new Client();
            conn.on('ready', () => {
                conn.exec('plesk bin secret_key -c -description "Hispanaweb Panel API"', (err, stream) => {
                    if (err) {
                        conn.end();
                        resolve(NextResponse.json({ success: false, error: 'Error ejecutando comando en Plesk: ' + err.message }, { status: 500 }));
                        return;
                    }

                    let dataString = '';
                    let errString = '';

                    stream.on('close', (code: any) => {
                        conn.end();
                        if (code !== 0) {
                            resolve(NextResponse.json({ success: false, error: 'El comando devolvió error: ' + errString }, { status: 500 }));
                        } else {
                            // Extract just the key, which might be on the last line or the only line
                            const key = dataString.replace(/[\r\n]/g, '').trim();

                            // Validar que solo devuelve un hash y no un mega texto
                            if (key.length > 100) {
                                resolve(NextResponse.json({ success: false, error: 'La salida de Plesk fue demasiado larga (' + key.length + ' chars). ¿Es posible que no esté instalado localmente?' }, { status: 500 }));
                            } else {
                                resolve(NextResponse.json({ success: true, key }));
                            }
                        }
                    }).on('data', (data: any) => {
                        dataString += data.toString();
                    }).stderr.on('data', (data: any) => {
                        errString += data.toString();
                    });
                });
            }).on('error', (err) => {
                resolve(NextResponse.json({ success: false, error: 'Error de conexión SSH: ' + err.message }, { status: 500 }));
            }).connect({
                host: ip,
                port: 22,
                username: username,
                password: password,
                readyTimeout: 10000 // 10 segundos timeout
            });
        });

    } catch (e: any) {
        console.error('API Plesk Generate Key Error:', e);
        return NextResponse.json({ success: false, error: e.message || 'Error interno del servidor SSH' }, { status: 500 });
    }
}
