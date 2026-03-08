import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { mimeType } = body; // imageData o imageUrl

        // TODO: Implementar Gemini Flash analysis
        return NextResponse.json({
            success: true,
            data: {
                text: "Análisis de imagen simulado."
            }
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
