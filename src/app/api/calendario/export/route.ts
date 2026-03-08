import { NextResponse } from 'next/server';
import { auth } from '@insforge/nextjs/server';
import { supabase } from '@/lib/supabase';
import ical from 'ical-generator';

export async function GET(request: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: events, error } = await supabase.database
            .from('events')
            .select('*')
            .eq('user_id', userId)
            .order('start_time', { ascending: true });

        if (error) throw error;

        const calendar = ical({ name: 'Hispanaweb Calendar', timezone: 'Europe/Madrid' });

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
        headers.set('Content-Disposition', 'attachment; filename="calendar.ics"');

        return new NextResponse(calendar.toString(), { status: 200, headers });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
