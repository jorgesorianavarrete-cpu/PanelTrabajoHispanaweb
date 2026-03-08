import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { text, voiceName, style, speed } = body;

        // TODO: Implementar OpenAI tts-1-hd
        return NextResponse.json({
            success: true,
            data: {
                audioData: '',
                mimeType: 'audio/mpeg'
            }
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
