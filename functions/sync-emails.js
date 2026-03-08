import { createClient } from "npm:@insforge/sdk";
import { ImapFlow } from "npm:imapflow";
import { simpleParser } from "npm:mailparser";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export default async function (req) {
    console.log("Sync Emails Function Started");

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const baseUrl = Deno.env.get('INSFORGE_BASE_URL') ?? Deno.env.get('INSFORGE_URL') ?? '';
        const anonKey = Deno.env.get('ANON_KEY') ?? Deno.env.get('INSFORGE_ANON_KEY') ?? '';

        const insforgeClient = createClient({ baseUrl, anonKey });

        const body = await req.json();
        const account_id = body?.account_id;

        if (!account_id) {
            return new Response(JSON.stringify({ error: 'Missing account_id' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
            });
        }

        return new Response(JSON.stringify({ success: true, message: "Sync function is reachable and ESM is working!" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
        });
    }
}
