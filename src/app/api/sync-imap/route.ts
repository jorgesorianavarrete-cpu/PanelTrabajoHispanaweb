import { NextRequest, NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { createClient } from '@insforge/sdk';

const insforge = createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_BASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || '',
});

export async function POST(req: NextRequest) {
    try {
        const { account_id } = await req.json();
        if (!account_id) {
            return NextResponse.json({ error: 'Missing account_id' }, { status: 400 });
        }

        const { data: account, error: accErr } = await insforge.database
            .from('email_accounts').select('*').eq('id', account_id).single();

        if (accErr || !account) {
            return NextResponse.json({ error: accErr?.message || 'Account not found' }, { status: 404 });
        }

        if (!account.imap_host || !account.imap_user || !account.imap_password) {
            return NextResponse.json({ success: false, message: 'No IMAP credentials configured' });
        }

        const { data: inboxFolder } = await insforge.database
            .from('email_folders').select('id').eq('name', 'Bandeja de Entrada').single();
        const inboxId = inboxFolder?.id || null;

        const client = new ImapFlow({
            host: account.imap_host,
            port: account.imap_port || 993,
            secure: (account.imap_port || 993) !== 143,
            auth: { user: account.imap_user, pass: account.imap_password },
            logger: false,
        });

        await client.connect();

        const emails: any[] = [];
        const lock = await client.getMailboxLock('INBOX');
        try {
            const total = (client.mailbox as any).exists || 0;
            if (total > 0) {
                const start = Math.max(1, total - 49);
                for await (const msg of client.fetch(`${start}:${total}`, {
                    uid: true,
                    flags: true,
                    source: true,
                })) {
                    try {
                        const parsed = await simpleParser((msg as any).source);
                        const fromAddress = parsed.from?.value?.[0]?.address || null;
                        const receivedAt = parsed.date?.toISOString() || new Date().toISOString();
                        const messageId = parsed.messageId || `hash:${fromAddress}-${parsed.subject}-${receivedAt}`.replace(/\s+/g, '_');

                        const bodyText = (parsed.text || '').trim();
                        const bodyHtml = parsed.html || '';
                        const snippetSource = bodyText || bodyHtml.replace(/<[^>]+>/g, ' ') || '';

                        emails.push({
                            message_id: messageId,
                            subject: parsed.subject || '(Sin asunto)',
                            body: bodyText || bodyHtml || '',
                            body_text: bodyText,
                            body_html: bodyHtml,
                            body_snippet: snippetSource.replace(/\s+/g, ' ').trim().substring(0, 200),
                            from_email: fromAddress,
                            from_name: parsed.from?.value?.[0]?.name || null,
                            to_email: account.email_address,
                            to_name: account.account_name,
                            folder_id: inboxId,
                            read_status: (msg as any).flags?.has('\\Seen') || false,
                            starred: (msg as any).flags?.has('\\Flagged') || false,
                            received_at: receivedAt,
                            is_draft: false,
                            is_sent: false,
                        });
                    } catch (parseErr) {
                        console.error('Error parsing email:', parseErr);
                    }
                }
            }
        } finally {
            lock.release();
        }
        await client.logout();

        // Upsert by message_id to prevent duplicates
        let inserted = 0;
        for (let i = 0; i < emails.length; i += 20) {
            const batch = emails.slice(i, i + 20);
            const { error: upsertErr } = await insforge.database
                .from('emails')
                .upsert(batch, { onConflict: 'message_id', ignoreDuplicates: true });
            if (!upsertErr) inserted += batch.length;
            else console.error('Upsert error:', upsertErr);
        }

        await insforge.database.from('email_accounts')
            .update({ last_synced_at: new Date().toISOString() }).eq('id', account_id);

        return NextResponse.json({ success: true, processed: emails.length, upserted: inserted });

    } catch (err: any) {
        console.error('IMAP sync error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
