import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { message, isGlobal, propertyContext } = body;

        // TODO: Implementar Gemini Chat con acciones de ruteo
        return NextResponse.json({
            success: true,
            data: {
                text: "Hola, soy tu asistente de marketing. Aún estoy en fase de configuración.",
                actions: isGlobal ? [{ label: 'Ir a Foto Studio', path: '/marketing/foto-studio' }] : []
            }
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
