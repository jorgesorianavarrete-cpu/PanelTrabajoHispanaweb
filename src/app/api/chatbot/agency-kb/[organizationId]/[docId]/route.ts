import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

type Params = Promise<{ organizationId: string; docId: string }>;

// PATCH /api/chatbot/agency-kb/:organizationId/:docId
export async function PATCH(req: Request, { params }: { params: Params }) {
    const { organizationId, docId } = await params;
    const body = await req.json();
    const { data, error } = await insforge.database
        .from('agency_chatbot_documents')
        .update(body)
        .eq('id', docId)
        .eq('organization_id', organizationId)
        .select()
        .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

// DELETE /api/chatbot/agency-kb/:organizationId/:docId
export async function DELETE(_req: Request, { params }: { params: Params }) {
    const { organizationId, docId } = await params;
    const { error } = await insforge.database
        .from('agency_chatbot_documents')
        .delete()
        .eq('id', docId)
        .eq('organization_id', organizationId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
