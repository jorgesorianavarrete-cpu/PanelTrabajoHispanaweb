import { NextRequest, NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

// POST /api/whatsapp/llm/suggest  { threadId }
export async function POST(req: NextRequest) {
    const { threadId, context } = await req.json();

    // Get last 10 messages for context
    const { data: messages } = await insforge.database
        .from('whatsapp_messages')
        .select('text, sender, created_at')
        .eq('chat_id', threadId)
        .order('created_at', { ascending: false })
        .limit(10);

    const chatContext = (messages || []).reverse().map((m: any) =>
        `${m.sender === 'me' ? 'Agente' : 'Cliente'}: ${m.text}`
    ).join('\n');

    // Get AI config
    const { data: settings } = await insforge.database
        .from('system_settings')
        .select('value')
        .eq('category', 'ai_config')
        .single();

    const apiKey = settings?.value?.openai_api_key;
    if (!apiKey) return NextResponse.json({ suggestion: '' });

    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'Eres un asistente de atención al cliente para una agencia web. Sugiere UNA respuesta breve, profesional y amigable en español al último mensaje del cliente. Solo responde con el texto de la sugerencia, sin comillas ni explicaciones.' },
                    { role: 'user', content: `Conversación:\n${chatContext}\n\nSugiere una respuesta para el agente:` }
                ],
                max_tokens: 150,
                temperature: 0.7,
            }),
        });
        const data = await res.json();
        const suggestion = data.choices?.[0]?.message?.content?.trim() || '';
        return NextResponse.json({ suggestion });
    } catch (e) {
        return NextResponse.json({ suggestion: '' });
    }
}
