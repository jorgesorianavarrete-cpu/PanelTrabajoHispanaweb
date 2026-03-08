/**
 * VAPI Call Notification Service
 * Syncs calls from VAPI API and sends email notifications for new calls.
 * Runs every 2 minutes via the /api/vapi/sync endpoint (called from a cron or keepalive).
 */

import * as nodemailer from 'nodemailer';
import { insforge } from './insforge';

const CHECK_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const VAPI_BASE_URL = 'https://api.vapi.ai';

let lastSyncTime: Date | null = null;

// ─── Internal helpers ────────────────────────────────────────────────────────

async function getVapiApiKey(): Promise<string | null> {
    try {
        const { data } = await insforge.database
            .from('system_settings')
            .select('value')
            .eq('category', 'vapi_config')
            .maybeSingle();

        if (!data?.value) return null;
        const config = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        return config?.apiKey || null;
    } catch (e) {
        console.error('[VAPI] Error fetching API key:', e);
        return null;
    }
}

async function vapiRequest(endpoint: string, apiKey: string): Promise<any> {
    const res = await fetch(`${VAPI_BASE_URL}${endpoint}`, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
    });
    if (!res.ok) {
        throw new Error(`VAPI request failed: ${res.status} ${await res.text()}`);
    }
    return res.json();
}

async function getEmailAccountForOrganization(organizationId: string): Promise<{
    email: string;
    smtpHost: string;
    smtpPort: number;
    username: string;
    password: string;
} | null> {
    try {
        const { data } = await insforge.database
            .from('messaging_accounts')
            .select('*')
            .eq('type', 'email')
            .eq('is_connected', true)
            .maybeSingle();

        if (!data) return null;

        return {
            email: data.email || data.username,
            smtpHost: data.smtp_host,
            smtpPort: data.smtp_port || 587,
            username: data.username,
            password: data.password,
        };
    } catch (e) {
        console.error('[VAPI] Error fetching email account:', e);
        return null;
    }
}

async function sendCallNotificationEmail(
    smtpAccount: { email: string; smtpHost: string; smtpPort: number; username: string; password: string },
    call: any
) {
    const transporter = nodemailer.createTransport({
        host: smtpAccount.smtpHost,
        port: smtpAccount.smtpPort,
        secure: smtpAccount.smtpPort === 465,
        auth: {
            user: smtpAccount.username,
            pass: smtpAccount.password,
        },
    });

    const callDate = call.createdAt
        ? new Date(call.createdAt).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })
        : 'Desconocida';

    const durationSec = call.call?.endedAt && call.call?.startedAt
        ? Math.round((new Date(call.call.endedAt).getTime() - new Date(call.call.startedAt).getTime()) / 1000)
        : null;

    const durationStr = durationSec != null
        ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`
        : 'Desconocida';

    const phoneNumber = call.customer?.number || call.phoneNumber || 'Número desconocido';
    const type = call.type === 'inbound' ? 'Entrante' : 'Saliente';

    await transporter.sendMail({
        from: `"Asistente Telefónico" <${smtpAccount.email}>`,
        to: smtpAccount.email,
        subject: `📞 Nueva llamada ${type} de ${phoneNumber}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
                <h2 style="color: #4f46e5;">📞 Nueva Llamada ${type}</h2>
                <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                    <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Número</td><td style="padding: 8px;">${phoneNumber}</td></tr>
                    <tr style="background: #f8fafc;"><td style="padding: 8px; font-weight: bold; color: #64748b;">Fecha/Hora</td><td style="padding: 8px;">${callDate}</td></tr>
                    <tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Duración</td><td style="padding: 8px;">${durationStr}</td></tr>
                    <tr style="background: #f8fafc;"><td style="padding: 8px; font-weight: bold; color: #64748b;">Estado</td><td style="padding: 8px;">${call.status || call.endedReason || 'Desconocido'}</td></tr>
                    ${call.analysis?.summary ? `<tr><td style="padding: 8px; font-weight: bold; color: #64748b;">Resumen</td><td style="padding: 8px;">${call.analysis.summary}</td></tr>` : ''}
                </table>
                ${call.analysis?.transcript ? `
                    <h3 style="color: #4f46e5; margin-top: 24px;">Transcripción</h3>
                    <div style="background: #f8fafc; padding: 16px; border-radius: 8px; font-size: 14px; white-space: pre-wrap;">${call.analysis.transcript}</div>
                ` : ''}
                <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">Panel Hispanaweb · Asistente Telefónico</p>
            </div>
        `,
    });
}

// ─── Main sync function ───────────────────────────────────────────────────────

export async function syncVapiCalls(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
        // 1. Get VAPI API key
        const apiKey = await getVapiApiKey();
        if (!apiKey) {
            return { synced: 0, errors: ['No VAPI API key configured in systemSettings'] };
        }

        // 2. Fetch recent calls from VAPI
        let calls: any[] = [];
        try {
            const response = await vapiRequest('/call', apiKey);
            calls = Array.isArray(response) ? response : (response.calls || response.data || []);
        } catch (e: any) {
            return { synced: 0, errors: [`VAPI fetch failed: ${e.message}`] };
        }

        if (calls.length === 0) {
            return { synced: 0, errors: [] };
        }

        // 3. Get existing notified call IDs and trashed IDs
        const vapiCallIds = calls.map((c: any) => c.id).filter(Boolean);

        const [{ data: existingNotifs }, { data: trashed }] = await Promise.all([
            insforge.database.from('call_notifications').select('vapi_call_id').in('vapi_call_id', vapiCallIds),
            insforge.database.from('trashed_conversations').select('vapi_call_id').in('vapi_call_id', vapiCallIds),
        ]);

        const alreadyNotified = new Set((existingNotifs || []).map((n: any) => n.vapi_call_id));
        const trashedIds = new Set((trashed || []).map((t: any) => t.vapi_call_id));

        // 4. Get email account for notifications
        const smtpAccount = await getEmailAccountForOrganization('default');

        // 5. Process new calls
        for (const call of calls) {
            if (!call.id || alreadyNotified.has(call.id) || trashedIds.has(call.id)) continue;

            try {
                // Insert into call_notifications
                const { error: insertError } = await insforge.database
                    .from('call_notifications')
                    .insert({
                        vapi_call_id: call.id,
                        type: call.type || 'inbound',
                        status: call.status || call.endedReason,
                        phone_number: call.customer?.number || call.phoneNumber,
                        transcript: call.artifact?.transcript || call.analysis?.transcript,
                        recording_url: call.artifact?.recordingUrl,
                        summary: call.analysis?.summary,
                        cost: call.cost,
                        notified_at: smtpAccount ? new Date().toISOString() : null,
                    });

                if (insertError) {
                    errors.push(`Insert error for ${call.id}: ${insertError.message}`);
                    continue;
                }

                // Send email notification if SMTP configured
                if (smtpAccount) {
                    try {
                        await sendCallNotificationEmail(smtpAccount, call);
                    } catch (emailErr: any) {
                        errors.push(`Email error for ${call.id}: ${emailErr.message}`);
                    }
                }

                synced++;
            } catch (e: any) {
                errors.push(`Error processing call ${call.id}: ${e.message}`);
            }
        }

        lastSyncTime = new Date();
        return { synced, errors };
    } catch (e: any) {
        return { synced: 0, errors: [`Sync failed: ${e.message}`] };
    }
}

export function getLastSyncTime(): Date | null {
    return lastSyncTime;
}
