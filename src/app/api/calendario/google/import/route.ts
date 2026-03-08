import { NextResponse } from 'next/server';
import { auth } from '@insforge/nextjs/server';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedGoogleClient } from '@/lib/google-calendar';

export async function POST(request: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const calendar = await getAuthenticatedGoogleClient(userId);
        if (!calendar) {
            return NextResponse.json({ error: 'Google Calendar no conectado' }, { status: 400 });
        }

        // Get events from the next 6 months to avoid importing too much
        const timeMin = new Date();
        const timeMax = new Date();
        timeMax.setMonth(timeMax.getMonth() + 6);

        const res = await calendar.events.list({
            calendarId: 'primary',
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            maxResults: 250,
            singleEvents: true,
            orderBy: 'startTime',
        });

        const items = res.data.items || [];

        let importedCount = 0;

        // Parallel imports
        await Promise.all(items.map(async (item) => {
            if (!item.start?.dateTime || !item.summary) return; // Skip all-day events or empty titles for now

            // Check if exists
            const { data: existing } = await supabase.database
                .from('events')
                .select('id')
                .eq('google_event_id', item.id)
                .eq('user_id', userId)
                .single();

            if (!existing) {
                await supabase.database.from('events').insert({
                    user_id: userId,
                    title: item.summary,
                    description: item.description,
                    start_time: item.start.dateTime,
                    end_time: item.end?.dateTime || item.start.dateTime,
                    event_type: 'personal', // Default to personal for imported
                    location: item.location,
                    google_event_id: item.id
                });
                importedCount++;
            }
        }));

        return NextResponse.json({ success: true, imported: importedCount });
    } catch (error: any) {
        console.error("Google Import Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
