import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { prompt, aspectRatio, usePro } = body;

        // TODO: Implementar llamada real a Gemini Image
        return NextResponse.json({
            success: true,
            data: {
                imageData: '', // Base64 vacía para pruebas
                mimeType: 'image/jpeg',
                model: usePro ? 'gemini-3-pro' : 'gemini-2.5-flash'
            }
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
