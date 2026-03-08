import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || '';

// We need the service role key to forcefully update, or use Anon if RLS permits
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { serverId, action } = body;

        if (!serverId || !action) {
            return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
        }

        // Simular un retardo de conexión SSH y estado intermedio
        if (action === 'reboot') {
            await supabase.from('hosting_servers').update({ status: 'rebooting' }).eq('id', serverId);
        }

        await new Promise(res => setTimeout(res, 3000));

        let newStatus = 'online';
        if (action === 'stop') {
            newStatus = 'offline';
        } else if (action === 'reboot') {
            newStatus = 'online';
        }

        const { error } = await supabase
            .from('hosting_servers')
            .update({
                status: newStatus,
                uptime: action === 'reboot' ? '0 min' : '-',
                updated_at: new Date().toISOString()
            })
            .eq('id', serverId);

        if (error) {
            console.error('Error updating server status:', error);
            return NextResponse.json({ error: 'Error interno DB' }, { status: 500 });
        }

        return NextResponse.json({ success: true, status: newStatus });

    } catch (error) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
