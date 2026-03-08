import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { prompt, model } = body;

        // TODO: Implementar KIE.AI (Veo3, Sora2, Kling3)
        return NextResponse.json({
            success: true,
            data: {
                videoData: '',
            }
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
