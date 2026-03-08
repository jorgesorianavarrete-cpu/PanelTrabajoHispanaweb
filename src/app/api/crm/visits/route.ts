import { NextResponse } from 'next/server';
import { auth } from '@insforge/nextjs/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const url = new URL(request.url);
        const clientId = url.searchParams.get('clientId');
        const eventId = url.searchParams.get('eventId');
        const limit = parseInt(url.searchParams.get('limit') || '100');

        let query = supabase.database
            .from('visit_reports')
            .select(`
                *,
                client:client_id(first_name, last_name, email),
                appointment:event_id(title, start_time)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (clientId) query = query.eq('client_id', clientId);
        if (eventId) query = query.eq('event_id', eventId);

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();

        const payload: any = {
            user_id: userId,
            client_id: body.clientId,
            event_id: body.eventId || null,
            content: body.content
        };

        const { data, error } = await supabase.database
            .from('visit_reports')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
