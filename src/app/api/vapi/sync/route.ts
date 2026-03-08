import { NextResponse } from 'next/server';
import { syncVapiCalls, getLastSyncTime } from '@/lib/vapi-sync';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST() {
    try {
        const result = await syncVapiCalls();
        return NextResponse.json({
            ok: true,
            synced: result.synced,
            errors: result.errors,
            lastSyncTime: getLastSyncTime()?.toISOString() || null,
        });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}

export async function GET() {
    try {
        const { data: calls } = await import('@/lib/insforge').then(m =>
            m.insforge.database
                .from('call_notifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50)
        );
        return NextResponse.json({
            calls: calls || [],
            lastSyncTime: getLastSyncTime()?.toISOString() || null,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
