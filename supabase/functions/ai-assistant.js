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

        if (!action || !content) {
            return new Response(JSON.stringify({ error: 'Missing action or content' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const client = createClient({
            baseUrl: Deno.env.get('INSFORGE_BASE_URL'),
            anonKey: Deno.env.get('INSFORGE_ANON_KEY')
        });

        let systemPrompt = "You are a helpful AI assistant for Hispanaweb Panel.";

        if (action === 'summarize') {
            systemPrompt = "Resume el siguiente correo electrónico de forma muy concisa (máximo 2-3 frases), capturando los puntos clave y cualquier acción requerida. Responde en español.";
        } else if (action === 'reply_suggestion') {
            systemPrompt = `Genera una sugerencia de respuesta para el siguiente correo electrónico. 
            Tono: ${context?.tone || 'profesional'}
            Contexto: ${context?.additionalInfo || ''}
            Responde en español y sé directo.`;
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
        console.error('AI Assistant Error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
}
