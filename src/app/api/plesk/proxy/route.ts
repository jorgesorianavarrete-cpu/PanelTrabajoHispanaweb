import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
                .select('api_key, api_url')
                .eq('id', serverId)
                .single();

            if (dbError || !server) {
                return NextResponse.json({ error: 'Servidor no encontrado' }, { status: 404 });
            }

            if (!server.api_key || !server.api_url) {
                return NextResponse.json({ error: 'El servidor no tiene configurada la API Key o URL de Plesk' }, { status: 400 });
            }

            serverApiKey = server.api_key;
            serverApiUrl = server.api_url;
        }

        // Limpieza de URL
        let baseUrl = serverApiUrl.endsWith('/') ? serverApiUrl.slice(0, -1) : serverApiUrl;
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

        // Importante: Plesk usa certificados autofirmados muchas veces, lo ideal sería tener agent proxy aquí, pero en un entorno Edge (Vercel) no podemos saltarnos tls unauthorized tan fácil.
        // Simularemos o reenviaremos. Vercel a veces arroja error con autofirmados, pero lo dejamos genérico.
        // Plesk API en la mayoría de puertos 8443 requiere que se acepte TLS.
        const pleskResponse = await fetch(apiUrl, fetchOptions);

        let data;
        const textResponse = await pleskResponse.text();
        try {
            data = textResponse ? JSON.parse(textResponse) : {};
        } catch {
            data = textResponse; // En caso de que Plesk devuelva texto plano
        }

        if (!pleskResponse.ok) {
            return NextResponse.json({ error: 'Error en la API de Plesk', details: data }, { status: pleskResponse.status });
        }

        return NextResponse.json({ success: true, data });

    } catch (e: any) {
        console.error('Plesk Proxy Error:', e);
        return NextResponse.json({ error: 'Error interno conectando con el panel Plesk', details: e.message }, { status: 500 });
    }
}
