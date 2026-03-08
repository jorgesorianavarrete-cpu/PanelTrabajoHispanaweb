import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

// GET /api/vapi/calls/:id — get call detail
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const { data, error } = await insforge.database
            .from('call_notifications')
            .select('*')
            .eq('vapi_call_id', id)
            .maybeSingle();

        if (error) throw error;
        if (!data) return NextResponse.json({ error: 'Call not found' }, { status: 404 });

        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// DELETE /api/vapi/calls/:id — trash a call (move to trashedConversations)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const { error: trashError } = await insforge.database
            .from('trashed_conversations')
            .upsert({ vapi_call_id: id }, { onConflict: 'vapi_call_id' });

        if (trashError) throw trashError;

        return NextResponse.json({ ok: true, trashed: id });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
