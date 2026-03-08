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
        const { query } = body;

        if (!query) {
            return new Response(JSON.stringify({ error: 'Missing query in request body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const authHeader = req.headers.get('Authorization');
        const userToken = authHeader ? authHeader.replace('Bearer ', '') : null;

        // We can use the service role key or user token depending on RLS
        // Let's use userToken to respect RLS
        const client = createClient({
            baseUrl: Deno.env.get('INSFORGE_BASE_URL'),
            edgeFunctionToken: userToken,
            anonKey: Deno.env.get('INSFORGE_ANON_KEY')
        });

        // 1. Generate Embedding for the search query
        const embeddingResponse = await client.ai.embeddings.create({
            model: 'openai/text-embedding-3-small',
            input: query
        });

        const queryEmbedding = embeddingResponse.data[0].embedding;

        // 2. Perform vector search
        const { data: documents, error: matchError } = await client.rpc('match_emails', {
            query_embedding: queryEmbedding,
            match_threshold: 0.5,
            match_count: 10
        });

        if (matchError) {
            return new Response(JSON.stringify({ error: 'Failed to match emails', details: matchError }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({ success: true, results: documents }), {
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
