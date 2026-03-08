import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

// Helper for Supabase Admin access to bypass RLS and get system settings
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_INSFORGE_BASE_URL!,
    process.env.INSFORGE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!
);

export async function getGoogleOAuthClient() {
    // 1. Try to get from system_settings
    let clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
    let clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;

    try {
        const { data, error } = await supabaseAdmin
            .from('system_settings')
            .select('key, value')
            .eq('category', 'google_oauth');

        if (!error && data && data.length > 0) {
            const idSetting = data.find(s => s.key === 'client_id');
            const secretSetting = data.find(s => s.key === 'client_secret');

            if (idSetting?.value) clientId = idSetting.value;
            if (secretSetting?.value) clientSecret = secretSetting.value;
        }
    } catch (e) {
        console.warn('Could not fetch google oauth settings from database, using env vars if available.');
    }

    if (!clientId || !clientSecret) {
        throw new Error('Google OAuth credentials not configured. Please configure them in Settings or using GOOGLE_CALENDAR_CLIENT_ID / SECRET');
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_INSFORGE_BASE_URL || 'http://localhost:3000'}/api/oauth2callback`;

    return new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
    );
}

export async function getUserGoogleConnection(userId: string) {
    const { data, error } = await supabaseAdmin
        .from('google_calendar_connections')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error || !data) return null;
    return data;
}

export async function saveUserGoogleConnection(userId: string, tokens: any, email: string) {
    const { data: existing } = await supabaseAdmin
        .from('google_calendar_connections')
        .select('id, refresh_token')
        .eq('user_id', userId)
        .single();

    const payload = {
        user_id: userId,
        google_account_email: email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || existing?.refresh_token, // keep old refresh token if not provided
        token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    };

    if (existing) {
        await supabaseAdmin
            .from('google_calendar_connections')
            .update(payload)
            .eq('id', existing.id);
    } else {
        await supabaseAdmin
            .from('google_calendar_connections')
            .insert(payload);
    }
}

export async function removeUserGoogleConnection(userId: string) {
    await supabaseAdmin
        .from('google_calendar_connections')
        .delete()
        .eq('user_id', userId);
}

export async function getAuthenticatedGoogleClient(userId: string) {
    const connection = await getUserGoogleConnection(userId);
    if (!connection || !connection.access_token) return null;

    const oauth2Client = await getGoogleOAuthClient();
    oauth2Client.setCredentials({
        access_token: connection.access_token,
        refresh_token: connection.refresh_token,
        expiry_date: connection.token_expiry ? new Date(connection.token_expiry).getTime() : null,
    });

    // We can add a refresh token event listener if we want to save updated tokens,
    // but the google-auth-library handles the request internally.
    oauth2Client.on('tokens', async (tokens) => {
        if (tokens.refresh_token || tokens.access_token) {
            await saveUserGoogleConnection(userId, tokens, connection.google_account_email);
        }
    });

    return google.calendar({ version: 'v3', auth: oauth2Client });
}

export async function syncEventToGoogle(userId: string, eventData: any): Promise<string | null> {
    try {
        const calendar = await getAuthenticatedGoogleClient(userId);
        if (!calendar) return null;

        const event = {
            summary: eventData.title,
            description: eventData.description || eventData.notes || '',
            location: eventData.location,
            start: {
                dateTime: new Date(eventData.start_time).toISOString(),
                timeZone: 'Europe/Madrid',
            },
            end: {
                dateTime: new Date(eventData.end_time).toISOString(),
                timeZone: 'Europe/Madrid',
            },
        };

        if (eventData.google_event_id) {
            const res = await calendar.events.update({
                calendarId: 'primary',
                eventId: eventData.google_event_id,
                requestBody: event,
            });
            return res.data.id || null;
        } else {
            const res = await calendar.events.insert({
                calendarId: 'primary',
                requestBody: event,
            });
            return res.data.id || null;
        }
    } catch (e) {
        console.error("Error syncing to Google Calendar:", e);
        return null;
    }
}

export async function deleteEventFromGoogle(userId: string, googleEventId: string) {
    try {
        const calendar = await getAuthenticatedGoogleClient(userId);
        if (!calendar) return;

        await calendar.events.delete({
            calendarId: 'primary',
            eventId: googleEventId,
        });
    } catch (e) {
        console.error("Error deleting from Google Calendar:", e);
    }
}
