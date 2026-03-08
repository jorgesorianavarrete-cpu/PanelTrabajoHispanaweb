import { NextResponse } from 'next/server';
import { getGoogleOAuthClient, saveUserGoogleConnection } from '@/lib/google-calendar';
import { google } from 'googleapis';

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state'); // user_id passed from auth route

        if (!code || !state) {
            return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
        }

        const oauth2Client = await getGoogleOAuthClient();
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2({
            auth: oauth2Client,
            version: 'v2'
        });

        const userInfo = await oauth2.userinfo.get();
        const email = userInfo.data.email || '';

        await saveUserGoogleConnection(state, tokens, email);

        // Redirect back to calendar
        const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL || 'http://localhost:3000';
        return NextResponse.redirect(new URL('/calendar?google_connected=true', baseUrl));

    } catch (error: any) {
        console.error('Callback OAuth Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
