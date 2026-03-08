import { createClient } from 'npm:@insforge/sdk';

module.exports = async function (req) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
        const bodyText = await req.text();
        const body = bodyText ? JSON.parse(bodyText) : {};
        const { email_id } = body;

        if (!email_id) {
            return new Response(JSON.stringify({ error: 'Missing email_id in request body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const authHeader = req.headers.get('Authorization');
        const userToken = authHeader ? authHeader.replace('Bearer ', '') : null;

        const client = createClient({
            baseUrl: Deno.env.get('INSFORGE_BASE_URL'),
            edgeFunctionToken: userToken
        });

        // 1. Fetch Email
        const { data: emailData, error: emailError } = await client.database
            .from('emails')
            .select('subject, body')
            .eq('id', email_id)
            .single();

        if (emailError || !emailData) {
            return new Response(JSON.stringify({ error: 'Email not found', details: emailError }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // 2. Call AI
        const prompt = `Analiza el correo electrónico:
Asunto: ${emailData.subject}
Cuerpo: ${emailData.body}

Tareas:
1. Clasifica el correo en una de estas categorías: "Soporte", "Ventas", "Consultas Generales", "Notificaciones".
2. Escribe un resumen de 1 línea.

Responde ÚNICAMENTE con JSON en este formato exacto:
{"classification": "Soporte", "ai_summary": "Un resumen corto..."}`;

        const completion = await client.ai.chat.completions.create({
            model: 'anthropic/claude-3.5-haiku',
            messages: [{ role: 'user', content: prompt }]
        });

        const aiResponseText = completion.choices[0].message.content;
        let aiResult;
        try {
            const jsonStr = aiResponseText.match(/\{[\s\S]*\}/)?.[0] || aiResponseText;
            aiResult = JSON.parse(jsonStr);
        } catch (e) {
            return new Response(JSON.stringify({ error: 'AI returned invalid JSON', text: aiResponseText }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // 3. Update Email
        const { error: updateError } = await client.database
            .from('emails')
            .update({
                classification: aiResult.classification,
                ai_summary: aiResult.ai_summary
            })
            .eq('id', email_id);

        if (updateError) {
            return new Response(JSON.stringify({ error: 'Failed to update email', details: updateError }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({ success: true, classification: aiResult.classification, summary: aiResult.ai_summary }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
