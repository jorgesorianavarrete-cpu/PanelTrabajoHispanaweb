import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

// GET /api/vapi/stats
export async function GET() {
    try {
        const { data: calls, count } = await insforge.database
            .from('call_notifications')
            .select('*', { count: 'exact' });

        const totalCalls = count || 0;
        const totalCost = (calls || []).reduce((sum: number, c: any) => sum + (c.cost || 0), 0);

        // Last sync (most recently created)
        const lastSync = calls && calls.length > 0
            ? calls.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
            : null;

        return NextResponse.json({
            configured: true,
            totalCalls,
            totalMinutes: 0, // VAPI doesn't store duration separately
            totalCost: parseFloat(totalCost.toFixed(4)),
            lastSync,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
