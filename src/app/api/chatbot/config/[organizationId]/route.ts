import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

// GET /api/chatbot/config/:organizationId
export async function GET(_req: Request, { params }: { params: Promise<{ organizationId: string }> }) {
    const { organizationId } = await params;
    const { data } = await insforge.database
        .from('chatbot_configs')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();
    return NextResponse.json(data || {
        organization_id: organizationId,
        llm_provider: 'openai',
        llm_model: 'gpt-4o-mini',
        temperature: 0.7,
        system_prompt: '',
        bot_name: 'Asistente',
        bot_color: '#6366f1',
        web_widget_enabled: true,
    });
}

// POST /api/chatbot/config/:organizationId
export async function POST(req: Request, { params }: { params: Promise<{ organizationId: string }> }) {
    const { organizationId } = await params;
    const body = await req.json();
    const { data, error } = await insforge.database
        .from('chatbot_configs')
        .upsert({ ...body, organization_id: organizationId, updated_at: new Date().toISOString() }, { onConflict: 'organization_id' })
        .select()
        .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}
