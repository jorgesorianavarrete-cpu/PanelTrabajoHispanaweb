import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

// POST /api/vapi/calls/bulk-delete
export async function POST(req: Request) {
    try {
        const { ids } = await req.json(); // array of vapi_call_ids
        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'ids array required' }, { status: 400 });
        }
        const rows = ids.map((id: string) => ({ vapi_call_id: id }));
        const { error } = await insforge.database
            .from('trashed_conversations')
            .upsert(rows, { onConflict: 'vapi_call_id' });
        if (error) throw error;
        return NextResponse.json({ ok: true, trashed: ids.length });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
