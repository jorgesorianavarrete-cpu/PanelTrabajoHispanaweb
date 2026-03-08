import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

// Builds the full system prompt for an organization
async function buildSystemPrompt(organizationId: string): Promise<string> {
    const parts: string[] = [];

    // 1. Global common prompt
    const { data: global } = await insforge.database
        .from('chatbot_global_config')
        .select('common_system_prompt')
        .maybeSingle();
    if (global?.common_system_prompt) parts.push(global.common_system_prompt);

    // 2. Org-specific system prompt
    const { data: config } = await insforge.database
        .from('chatbot_configs')
        .select('system_prompt')
        .eq('organization_id', organizationId)
        .maybeSingle();
    if (config?.system_prompt) parts.push(config.system_prompt);

    // 3. Active knowledge base
    const { data: docs } = await insforge.database
        .from('agency_chatbot_documents')
        .select('title, content, category')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

    if (docs && docs.length > 0) {
        const kbSection = 'BASE DE CONOCIMIENTO:\n' + docs.map((d: any) =>
            `### ${d.title} [${d.category || 'General'}]\n${d.content}`
        ).join('\n\n');
        parts.push(kbSection);
    }

    return parts.join('\n\n');
}

async function callLLM(messages: any[], config: any): Promise<string> {
    const provider = config.llm_provider || 'openai';
    const model = config.llm_model || 'gpt-4o-mini';
    const temperature = config.temperature ?? 0.7;

    if (provider === 'openai') {
        // Get API key from settings
        const { data: setting } = await insforge.database
            .from('system_settings')
            .select('value')
            .eq('category', 'openai_config')
            .maybeSingle();
        const apiKey = setting?.value?.apiKey || setting?.value?.api_key;
        if (!apiKey) throw new Error('OpenAI API key not configured');

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages, temperature }),
        });
        const data = await res.json();
        return data.choices?.[0]?.message?.content || 'Sin respuesta';
    }

    if (provider === 'gemini') {
        const { data: setting } = await insforge.database
            .from('system_settings')
            .select('value')
            .eq('category', 'gemini_config')
            .maybeSingle();
        const apiKey = setting?.value?.apiKey || setting?.value?.api_key;
        if (!apiKey) throw new Error('Gemini API key not configured');

        const geminiModel = model || 'gemini-1.5-flash';
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: messages
                        .filter((m: any) => m.role !== 'system')
                        .map((m: any) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
                    systemInstruction: { parts: [{ text: messages.find((m: any) => m.role === 'system')?.content || '' }] },
                    generationConfig: { temperature },
                }),
            }
        );
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta';
    }

    throw new Error(`LLM provider "${provider}" not supported`);
}

// POST /api/chatbot/message/:organizationId
export async function POST(req: Request, { params }: { params: Promise<{ organizationId: string }> }) {
    const { organizationId } = await params;
    try {
        const { message, channel, sessionId, phoneNumber } = await req.json();

        const { data: config } = await insforge.database
            .from('chatbot_configs')
            .select('*')
            .eq('organization_id', organizationId)
            .maybeSingle();

        const systemPrompt = await buildSystemPrompt(organizationId);

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
        ];

        const response = await callLLM(messages, config || {});

        // WhatsApp channel: send via WhatsApp
        if (channel === 'whatsapp' && phoneNumber) {
            try {
                const { data: waAccounts } = await insforge.database
                    .from('whatsapp_accounts')
                    .select('id')
                    .eq('is_connected', true)
                    .limit(1);
                if (waAccounts && waAccounts.length > 0) {
                    await fetch('/api/whatsapp/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            accountId: waAccounts[0].id,
                            jid: phoneNumber + '@s.whatsapp.net',
                            message: response,
                        }),
                    });
                }
            } catch (e) {
                console.error('WhatsApp send error:', e);
            }
        }

        return NextResponse.json({ response, sessionId });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
