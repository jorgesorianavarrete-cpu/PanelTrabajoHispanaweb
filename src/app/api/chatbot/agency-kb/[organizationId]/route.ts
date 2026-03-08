import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

// GET /api/chatbot/agency-kb/:organizationId
export async function GET(_req: Request, { params }: { params: Promise<{ organizationId: string }> }) {
    const { organizationId } = await params;
    const { data, error } = await insforge.database
        .from('agency_chatbot_documents')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
}

// POST /api/chatbot/agency-kb/:organizationId — create document
export async function POST(req: Request, { params }: { params: Promise<{ organizationId: string }> }) {
    const { organizationId } = await params;
    const body = await req.json();
    const { data, error } = await insforge.database
        .from('agency_chatbot_documents')
        .insert({ ...body, organization_id: organizationId })
        .select()
        .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
}
