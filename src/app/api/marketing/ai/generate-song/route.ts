import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { prompt, style, title, instrumental, vocalGender } = body;

        // TODO: Implementar KIE.AI (Suno V4.5 / V5)
        return NextResponse.json({
            success: true,
            data: {
                tracks: [
                    { audio_url: '', image_url: '', title: title + ' (Track 1)' },
                    { audio_url: '', image_url: '', title: title + ' (Track 2)' }
                ]
            }
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
