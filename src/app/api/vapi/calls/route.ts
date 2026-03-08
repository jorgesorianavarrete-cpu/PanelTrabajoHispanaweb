import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

// GET /api/vapi/calls — list all non-trashed calls
export async function GET() {
    try {
        // Get trashed IDs first
        const { data: trashed } = await insforge.database
            .from('trashed_conversations')
            .select('vapi_call_id');

        const trashedIds = (trashed || []).map((t: any) => t.vapi_call_id);

        let query = insforge.database
            .from('call_notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (trashedIds.length > 0) {
            query = query.not('vapi_call_id', 'in', `(${trashedIds.map((id: string) => `"${id}"`).join(',')})`);
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json(data || []);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
