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
        const { action, clientName, clientSector, textModel, imageModel, prompt, topic } = body;

        const client = createClient({
            baseUrl: Deno.env.get('INSFORGE_BASE_URL'),
            anonKey: Deno.env.get('INSFORGE_ANON_KEY')
        });

        // ACTION: GET SUGGESTIONS (General or Topic-based)
        if (action === 'get_suggestions' || action === 'search_ideas') {
            const systemPrompt = `You are a strategic marketing consultant. 
            Client: ${clientName}
            Sector: ${clientSector || 'General'}
            ${topic ? `Focus specifically on the topic: ${topic}` : 'Generate general strategy-aligned ideas.'}

            Generate 3 distinct, high-impact content ideas (articles or social campaigns). 
            Return valid JSON ONLY with this structure:
            {
                "suggestions": [
                    { "title": "Catchy Title", "reasoning": "Why this works for the target audience" }
                ]
            }`;

            const completion = await client.ai.chat.completions.create({
                model: textModel || 'anthropic/claude-3.5-haiku',
                messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: 'Generate ideas.' }]
            });

            const content = completion.choices[0].message.content;
            const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();

            return new Response(JSON.stringify({ success: true, data: { suggestions: JSON.parse(cleanJson).suggestions } }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // ACTION: WRITE FULL ARTICLE (Already partially implemented in page.tsx calls, but lets make it explicit)
        if (body.isArticle || action === 'write_article') {
            const articlePrompt = body.prompt || `Escribe un artículo completo sobre el título: ${body.title || 'Marketing Digital'}`;

            const textCompletion = await client.ai.chat.completions.create({
                model: textModel || 'anthropic/claude-3.5-haiku',
                messages: [
                    {
                        role: 'system',
                        content: `Eres un redactor experto. Genera un artículo de blog en HTML (sin etiquetas body/html, solo contenido semántico) y 2 copys cortos para redes sociales. 
                        Cliente: ${clientName}
                        Sector: ${clientSector}`
                    },
                    { role: 'user', content: articlePrompt }
                ]
            });

            const content = textCompletion.choices[0].message.content;

            // Extract JSON or structured output (for simplicity here we assume a certain format or return a combined object)
            // Ideally we'd use JSON mode or specific separators.
            const titlesMatch = content.match(/<h.>(.*?)<\/h.>/);
            const title = titlesMatch ? titlesMatch[1] : 'Artículo Generado';

            // Generate an image if requested
            let base64Image = null;
            if (imageModel) {
                const imageGen = await client.ai.images.generate({
                    model: imageModel,
                    prompt: `Professional cinematic illustration for a blog post about: ${title}. High quality, marketing style, no text.`,
                    size: '1024x1024',
                });
                base64Image = `data:image/jpeg;base64,${imageGen.data[0].b64_json}`;
            }

            return new Response(JSON.stringify({
                success: true,
                data: {
                    article: { title, content: content },
                    social_copies: ["Check out our new post!", "Latest news from our team."],
                    base64Image
                }
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // DEFAULT: Legacy/General prompt handling
        const textCompletion = await client.ai.chat.completions.create({
            model: textModel || 'anthropic/claude-3.5-haiku',
            messages: [
                {
                    role: 'system',
                    content: `You are an expert Marketing Copywriter. Client: ${clientName}. Sector: ${clientSector}.
                    Generate 2 copies and target audience strategy.`
                },
                { role: 'user', content: prompt || 'Generate general marketing content.' }
            ]
        });

        return new Response(JSON.stringify({ success: true, data: { raw: textCompletion.choices[0].message.content } }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Marketing Copilot Error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
}

