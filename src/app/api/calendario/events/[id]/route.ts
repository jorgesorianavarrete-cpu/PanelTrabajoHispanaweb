import { NextResponse } from 'next/server';
import { auth } from '@insforge/nextjs/server';
import { supabase } from '@/lib/supabase';
import { syncEventToGoogle, deleteEventFromGoogle } from '@/lib/google-calendar';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data, error } = await supabase.database
            .from('events')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();

        const { data: event } = await supabase.database.from('events').select('google_event_id').eq('id', id).single();

        let newGoogleId = event?.google_event_id;

        try {
            const syncPayload = { ...body, google_event_id: event?.google_event_id };
            const syncedId = await syncEventToGoogle(userId, syncPayload);
            if (syncedId) newGoogleId = syncedId;
        } catch (e) {
            console.error("Sync error", e);
        }

        const { data, error } = await supabase.database
            .from('events')
            .update({
                title: body.title,
                description: body.description,
                start_time: body.start_time,
                end_time: body.end_time,
                event_type: body.event_type,
                location: body.location,
                client_name: body.client_name,
                client_phone: body.client_phone,
                notes: body.notes,
                google_event_id: newGoogleId
            })
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: event } = await supabase.database.from('events').select('google_event_id').eq('id', id).single();

        if (event?.google_event_id) {
            try {
                await deleteEventFromGoogle(userId, event.google_event_id);
            } catch (e) {
                console.error("Delete sync error", e);
            }
        }

        const { error } = await supabase.database
            .from('events')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
