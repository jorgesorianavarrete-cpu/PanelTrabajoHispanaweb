import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import ical from 'ical-generator';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_INSFORGE_BASE_URL!,
    process.env.INSFORGE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!
);

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const uid = url.searchParams.get('uid');

        if (!uid) {
            return NextResponse.json({ error: 'Missing uid parameter' }, { status: 400 });
        }

        const { data: events, error } = await supabaseAdmin
            .from('events')
            .select('*')
            .eq('user_id', uid)
            .order('start_time', { ascending: true });

        if (error) throw error;

        const calendar = ical({ name: 'Hispanaweb Subscription', timezone: 'Europe/Madrid' });

        events.forEach((event: any) => {
            calendar.createEvent({
                start: new Date(event.start_time),
                end: new Date(event.end_time),
                summary: event.title,
                description: event.description || event.notes || '',
                location: event.location,
            });
        });

        const headers = new Headers();
        headers.set('Content-Type', 'text/calendar; charset=utf-8');

        return new NextResponse(calendar.toString(), { status: 200, headers });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
