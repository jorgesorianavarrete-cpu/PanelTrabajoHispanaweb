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
        if (body.priority !== undefined) payload.priority = body.priority;
        if (body.status !== undefined) {
            payload.status = body.status;
            if (body.status === 'COMPLETED') {
                payload.completed_at = new Date().toISOString();
            } else {
                payload.completed_at = null;
            }
        }
        if (body.dueDate !== undefined) payload.due_date = body.dueDate;
        if (body.clientId !== undefined) payload.client_id = body.clientId;

        const { data, error } = await supabase.database
            .from('crm_tasks')
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
            .from('crm_tasks')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
