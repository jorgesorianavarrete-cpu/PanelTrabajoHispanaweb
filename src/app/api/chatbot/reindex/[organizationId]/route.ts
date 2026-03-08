import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

// POST /api/chatbot/reindex/:organizationId (no-op, placeholder for future vector search)
export async function POST(_req: Request, { params }: { params: Promise<{ organizationId: string }> }) {
    const { organizationId } = await params;
    const { data } = await insforge.database
        .from('agency_chatbot_documents')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('is_active', true);
    return NextResponse.json({ ok: true, indexed: (data || []).length, organizationId });
}
