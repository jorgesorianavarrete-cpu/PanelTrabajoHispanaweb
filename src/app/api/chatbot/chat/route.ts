import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

// POST /api/chatbot/chat — test chat endpoint
export async function POST(req: Request) {
    try {
        const { message, organizationId = 'default', history = [] } = await req.json();

        // Forward to message endpoint
        const res = await fetch(
            new URL(`/api/chatbot/message/${organizationId}`, req.url).toString(),
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, channel: 'web', history }),
            }
        );
        const data = await res.json();
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
