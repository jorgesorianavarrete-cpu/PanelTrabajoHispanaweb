import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@insforge/sdk';

const insforge = createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_BASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || '',
});

export async function POST(req: NextRequest) {
    try {
        const { account_id, to, subject, body, reply_to_id } = await req.json();
        if (!account_id || !to || !subject) {
            return NextResponse.json({ error: 'Missing required fields: account_id, to, subject' }, { status: 400 });
        }

        // Get account credentials
        const { data: account, error: accErr } = await insforge.database
            .from('email_accounts').select('*').eq('id', account_id).single();

        if (accErr || !account) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 });
        }

        if (!account.imap_user || !account.imap_password) {
            return NextResponse.json({ error: 'No credentials configured for this account' }, { status: 400 });
        }

        // Derive SMTP host from IMAP host (usually same host, different port)
        const smtpHost = account.imap_host || account.email_address.split('@')[1];
        const smtpPort = 587; // STARTTLS
        const smtpSecure = false;

        // Try SMTP on 587 first, fallback to 465 (SSL)
        let transporter;
        try {
            transporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: smtpSecure,
                auth: { user: account.imap_user, pass: account.imap_password },
                tls: { rejectUnauthorized: false },
            });
            await transporter.verify();
        } catch {
            // Try port 465 with SSL
            transporter = nodemailer.createTransport({
                host: smtpHost,
                port: 465,
                secure: true,
                auth: { user: account.imap_user, pass: account.imap_password },
                tls: { rejectUnauthorized: false },
            });
        }

        const info = await transporter.sendMail({
            from: `${account.account_name} <${account.email_address}>`,
            to,
            subject,
            text: body,
            html: body.replace(/\n/g, '<br>'),
        });

        // Save to Enviados folder in DB
        const { data: sentFolder } = await insforge.database
            .from('email_folders').select('id').eq('name', 'Enviados').single();

        await insforge.database.from('emails').insert([{
            subject,
            body,
            body_snippet: body.substring(0, 200),
            from_email: account.email_address,
            from_name: account.account_name,
            to_email: to,
            folder_id: sentFolder?.id || null,
            read_status: true,
            starred: false,
            received_at: new Date().toISOString(),
            is_draft: false,
            is_sent: true,
        }]);

        return NextResponse.json({ success: true, messageId: info.messageId });

    } catch (err: any) {
        console.error('SMTP send error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
