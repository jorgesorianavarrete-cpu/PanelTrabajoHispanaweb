import { createClient } from "npm:@insforge/sdk";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function (req) {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const {
            action,
            clientName,
            clientSector,
            clientContext,
            websiteUrl,
            sitemapUrl,
            blogMapUrl,
            textModel,
            imageModel,
            prompt,
            topic,
            count = 10,
            additionalHtml = '',
            fullGen = false
        } = body;

        const client = createClient({
            baseUrl: Deno.env.get('INSFORGE_BASE_URL'),
            anonKey: Deno.env.get('INSFORGE_ANON_KEY')
        });

        // ACTION: GET SUGGESTIONS (General or Topic-based)
        if (action === 'get_suggestions' || action === 'search_ideas') {
            const systemPrompt = `Eres un consultor estratégico de marketing SEO y Content Manager experto.
            
            CLIENTE: ${clientName}
            SECTOR: ${clientSector || 'General'}
            CONTEXTO: ${clientContext || 'Sin contexto adicional.'}
            WEB: ${websiteUrl || 'No disponible'}
            BLOG/MAP: ${blogMapUrl || 'No disponible'}
            
            ${topic ? `TEMA ESPECÍFICO: ${topic}` : 'Genera una estrategia de contenidos basada en el sector y contexto del cliente.'}

            INSTRUCCIONES:
            1. Analiza el sector y el contexto para proponer temas que posicionen a la empresa como autoridad.
            2. Evita temas genéricos. Busca "puntos de dolor" del cliente ideal.
            3. Genera exactamente ${count} títulos de artículos de blog/redes.
            4. Para cada título, proporciona un "reasoning" (por qué es bueno) y "strategy" (qué objetivo busca: SEO, Conversión, Branding).

            RETORNA EXCLUSIVAMENTE UN JSON VÁLIDO CON ESTA ESTRUCTURA:
            {
                "suggestions": [
                    { "title": "Título del post", "reasoning": "Explicación breve", "strategy": "SEO/Branding/..." }
                ]
            }`;

            const completion = await client.ai.chat.completions.create({
                model: textModel || 'anthropic/claude-3.5-sonnet', // Using Sonnet for better strategy
                messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: 'Generar listado de títulos estratégicos.' }]
            });

            const content = completion.choices[0].message.content;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const cleanJson = jsonMatch ? jsonMatch[0] : content;

            return new Response(JSON.stringify({ success: true, data: { suggestions: JSON.parse(cleanJson).suggestions } }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // ACTION: WRITE FULL ARTICLE (SEO Optimized, +2000 words)
        if (body.isArticle || action === 'write_article' || fullGen) {
            const articleTitle = prompt || body.title || 'Marketing Digital';

            const systemPrompt = `Eres un redactor SEO Senior especializado en artículos de "Long-form content" de alta autoridad.
            
            OBJETIVO: Escribir un artículo de blog DE MÁS DE 2000 PALABRAS.
            ESTRUCTURA: HTML semántico (h1, h2, h3, p, ul, li, blockquote, strong). SIN etiquetas html/body/head.
            
            CLIENTE: ${clientName}
            SECTOR: ${clientSector}
            CONTEXTO MARCA: ${clientContext}
            
            DIRECTRICES:
            1. Título H1 impactante y optimizado para la palabra clave principal.
            2. Introducción "Hook" que retenga al lector.
            3. Tabla de contenidos (en HTML).
            4. Desarrollo profundo: Mínimo 6-8 secciones con H2 y H3.
            5. Datos, consejos accionables y tono profesional pero cercano.
            6. Conclusión con llamada a la acción (CTA).
            7. Optimización SEO: Uso natural de términos relacionados, densidad equilibrada.
            8. Incluye este código HTML adicional si se requiere: ${additionalHtml}

            SALIDA DEBE INCLUIR:
            ---ARTICLE_START---
            [Contenido HTML del artículo]
            ---ARTICLE_END---
            ---SOCIAL_START---
            [Genera 3 copys para redes: 1 para LinkedIn (profesional), 1 para Instagram (visual/emojis), 1 para FB (familiar)]
            ---SOCIAL_END---`;

            const textCompletion = await client.ai.chat.completions.create({
                model: textModel || 'anthropic/claude-3.5-sonnet', // Sonnet for long writing
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Escribe el artículo completo sobre: ${articleTitle}` }
                ]
            });

            const rawContent = textCompletion.choices[0].message.content;

            const articleContent = rawContent.split('---ARTICLE_START---')[1]?.split('---ARTICLE_END---')[0]?.trim() || rawContent;
            const socialContent = rawContent.split('---SOCIAL_START---')[1]?.split('---SOCIAL_END---')[0]?.trim() || "";

            // Generate an image if requested
            let base64Image = null;
            if (imageModel) {
                try {
                    const imageGen = await client.ai.images.generate({
                        model: imageModel,
                        prompt: `Cinematic professional photography, high-end editorial style, for a blog article about: ${articleTitle}. Representing the business context of ${clientName} in ${clientSector}. No text, high resolution, 16:9 aspect ratio.`,
                        size: '1024x1024',
                    });
                    base64Image = `data:image/jpeg;base64,${imageGen.data[0].b64_json}`;
                } catch (imgError) {
                    console.error('Image Gen Error:', imgError);
                }
            }

            return new Response(JSON.stringify({
                success: true,
                data: {
                    article: { title: articleTitle, content: articleContent },
                    social_copies: socialContent ? socialContent.split('\n').filter(l => l.trim()) : ["Post generado correctamente."],
                    base64Image
                }
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // DEFAULT: Generic chat
        const textCompletion = await client.ai.chat.completions.create({
            model: textModel || 'anthropic/claude-3.5-haiku',
            messages: [
                { role: 'system', content: `Copista de marketing experto para ${clientName}.` },
                { role: 'user', content: prompt || 'Hola' }
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

