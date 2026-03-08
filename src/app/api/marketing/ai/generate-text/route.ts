import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { propertyData, type } = body;

        // TODO: Implementar llamada real a Gemini 2.5 Flash
        return NextResponse.json({
            success: true,
            data: {
                text: `Contenido generado para ${type}:\n\nAquí iría el texto redactado por IA basado en: ${propertyData?.substring(0, 50)}...`
            }
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
