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
        const { prompt, clientName, clientSector } = body;

        if (!prompt || !clientName) {
            return new Response(JSON.stringify({ error: 'Missing prompt or client data' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const client = createClient({
            baseUrl: Deno.env.get('INSFORGE_BASE_URL'),
            anonKey: Deno.env.get('INSFORGE_ANON_KEY')
        });

        // 1. Generate Text Copy Variations
        const textCompletion = await client.ai.chat.completions.create({
            model: 'anthropic/claude-3.5-haiku',
            messages: [
                {
                    role: 'system',
                    content: `You are an expert Marketing Copywriter in Spain. 
                    Client Name: ${clientName}
                    Client Sector: ${clientSector || 'General Business'}
                    
                    Generate 2 distinct copy variations for a social media ad campaign based on the user's prompt.
                    Also generate a target audience profile (Interests, Location, Budget).
                    Return valid JSON ONLY with the following structure:
                    {
                        "copies": ["copy variation 1", "copy variation 2"],
                        "audience": {
                            "interests": "String describing interests",
                            "location": "String describing location strategy",
                            "budget": "String describing daily budget"
                        }
                    }`
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            stream: false
        });

        const aiResponseText = textCompletion.choices[0].message.content;
        let aiData;
        try {
            // Trim potential markdown blocks
            const cleanJsonString = aiResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
            aiData = JSON.parse(cleanJsonString);
        } catch (e) {
            console.error("Failed to parse JSON from AI model:", aiResponseText);
            throw new Error("Failed to parse marketing text from AI");
        }

        // 2. Generate Image Variations
        // Generate a concise prompt for the image model based on the user's original prompt
        const imagePromptCompletion = await client.ai.chat.completions.create({
            model: 'anthropic/claude-3.5-haiku',
            messages: [
                {
                    role: 'system',
                    content: `Extract a highly visual, short, standard image generation prompt containing no text overlays for this marketing campaign for ${clientName} (${clientSector}). Be concise.`
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            maxTokens: 50
        });

        const imagePrompt = imagePromptCompletion.choices[0].message.content;

        // Note: For speed/demo purposes we're generating 1 image, then faking variations on the frontend, 
        // but the architecture supports array of Base64s.
        const imageGeneration = await client.ai.images.generate({
            model: 'google/gemini-3-pro-image-preview', // Or any other available image model
            prompt: `Cinematic, highly professional marketing photo: ${imagePrompt}`,
            size: '512x512',
        });

        const b64Image = imageGeneration.data[0].b64_json;

        // 3. Construct Payload
        return new Response(JSON.stringify({
            success: true,
            data: {
                ...aiData,
                base64Image: `data:image/jpeg;base64,${b64Image}`
            }
        }), {
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
