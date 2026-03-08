import { NextResponse } from 'next/server';
import { auth } from '@insforge/nextjs/server';
import { supabase } from '@/lib/supabase';
import { syncEventToGoogle } from '@/lib/google-calendar';

export async function GET(request: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const url = new URL(request.url);
        const start = url.searchParams.get('start');
        const end = url.searchParams.get('end');

        let query = supabase.database
            .from('events')
            .select('*')
            .eq('user_id', userId)
            .order('start_time', { ascending: true });

        if (start) query = query.gte('start_time', start);
        if (end) query = query.lte('end_time', end);

        const { data, error } = await query;

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        let googleEventId = null;

        try {
            googleEventId = await syncEventToGoogle(userId, body);
        } catch (e) {
            console.error("Failed to sync event to Google on CREATE", e);
        }

        const { data, error } = await supabase.database
            .from('events')
            .insert({
                user_id: userId,
                title: body.title,
                description: body.description,
                start_time: body.start_time,
                end_time: body.end_time,
                event_type: body.event_type || 'meeting',
                location: body.location,
                client_name: body.client_name,
                client_phone: body.client_phone,
                notes: body.notes,
                google_event_id: googleEventId
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
