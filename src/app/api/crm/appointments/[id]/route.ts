import { NextResponse } from 'next/server';
import { auth } from '@insforge/nextjs/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();

        const payload: any = {};
        if (body.title !== undefined) payload.title = body.title;
        if (body.description !== undefined) payload.description = body.description;
        if (body.location !== undefined) payload.location = body.location;
        if (body.startTime !== undefined) payload.start_time = body.startTime;
        if (body.endTime !== undefined) payload.end_time = body.endTime;
        if (body.status !== undefined) payload.status = body.status;
        if (body.clientId !== undefined) payload.client_id = body.clientId;

        const { data, error } = await supabase.database
            .from('crm_appointments')
            .update(payload)
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { error } = await supabase.database
            .from('crm_appointments')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
