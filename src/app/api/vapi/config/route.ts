import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

// GET /api/vapi/config
export async function GET() {
    const { data } = await insforge.database
        .from('system_settings')
        .select('value')
        .eq('category', 'vapi_config')
        .maybeSingle();
    const hasApiKey = !!(data?.value?.apiKey || data?.value?.api_key);
    return NextResponse.json({ hasApiKey, configured: hasApiKey });
}

// POST /api/vapi/config — save VAPI API key
export async function POST(req: Request) {
    try {
        const { apiKey } = await req.json();
        await insforge.database
            .from('system_settings')
            .upsert({ category: 'vapi_config', value: { apiKey } }, { onConflict: 'category' });
        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
