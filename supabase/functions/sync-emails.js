const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export default async function (req) {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true, message: 'Minimal function deployed!' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
    });
}
