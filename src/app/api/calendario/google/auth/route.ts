import { NextResponse } from 'next/server';
import { auth } from '@insforge/nextjs/server';
import { getGoogleOAuthClient } from '@/lib/google-calendar';

export async function GET(request: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const oauth2Client = await getGoogleOAuthClient();

        // Especificar los scopes requeridos (readonly para import, o events para bidirectional)
        const scopes = [
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/userinfo.email'
        ];

        // Pass user ID as state state so we can tie it back in the callback
        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            state: userId,
            prompt: 'consent' // Force to get refresh token
        });

        // Redirect user to Google Auth page
        return NextResponse.redirect(url);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
