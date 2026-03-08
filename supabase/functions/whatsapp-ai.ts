import { createClient } from "npm:@insforge/sdk";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function (req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const { action, content, context } = body;

        const client = createClient({
            baseUrl: Deno.env.get('INSFORGE_BASE_URL'),
            anonKey: Deno.env.get('INSFORGE_ANON_KEY')
        });

        let systemPrompt = "Eres un asistente experto en WhatsApp para el Panel Hispanaweb.";

        if (action === 'generate_replies') {
            systemPrompt = `Genera 3 respuestas rápidas y naturales para el siguiente hilo de chat de WhatsApp. 
            Sé conciso y usa un tono adecuado al contexto. 
            Responde en formato JSON: { "replies": ["opcion 1", "opcion 2", "opcion 3"] }. 
            Responde SOLO el JSON.`;
        } else if (action === 'summarize_chat') {
            systemPrompt = "Resume este chat de WhatsApp de forma muy concisa, destacando el estado actual del cliente y cualquier asunto pendiente. Máximo 2 frases. Responde en español.";
        } else if (action === 'refine_draft') {
            systemPrompt = "Mejora el siguiente borrador de mensaje para que suene más profesional y claro, sin perder la esencia original. Responde SOLO el texto mejorado.";
        }

        const completion = await client.ai.chat.completions.create({
            model: 'anthropic/claude-3.5-haiku',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: content }
            ],
        });

        const result = completion.choices[0].message.content;

        return new Response(JSON.stringify({ success: true, result }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('WhatsApp AI Error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
}
