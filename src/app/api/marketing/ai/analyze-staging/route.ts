import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { mimeType } = body;

        // TODO: Implementar Gemini Flash analysis para staging json
        return NextResponse.json({
            success: true,
            data: {
                description: "Habitación vacía simulada",
                roomType: "Living Room",
                style: "Modern",
                reasoning: "Basado en la estructura."
            }
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
