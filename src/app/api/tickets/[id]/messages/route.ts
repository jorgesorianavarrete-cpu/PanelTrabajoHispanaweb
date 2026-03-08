import { NextRequest, NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

type Ctx = { params: Promise<{ id: string }> };

async function sendEmail(settings: any, to: string, subject: string, html: string) {
    try {
        const nodemailer = await import('nodemailer');
        const t = nodemailer.createTransport({
            host: settings.smtp_host, port: settings.smtp_port,
            secure: settings.smtp_port === 465,
            auth: { user: settings.smtp_username, pass: settings.smtp_password },
            connectionTimeout: 15000, socketTimeout: 15000,
        });
        await t.sendMail({ from: `"${settings.from_name}" <${settings.notification_email}>`, to, subject, html });
    } catch (e) { console.error('Email error:', e); }
}

async function sendWhatsApp(chatId: string, content: string) {
    try {
        await insforge.database.from('whatsapp_messages').insert({
            chat_id: chatId, text: content, sender: 'me', status: 'sent', message_type: 'text'
        });
        await insforge.database.from('whatsapp_chats').update({
            last_message: content, updated_at: new Date().toISOString()
        }).eq('id', chatId);
    } catch (e) { console.error('WA send error:', e); }
}

export async function POST(req: NextRequest, ctx: Ctx) {
    const { id } = await ctx.params;
    const { content, isAdminReply } = await req.json();

    const { data: msg, error } = await insforge.database
        .from('ticket_messages')
        .insert({ ticket_id: id, content, is_admin_reply: isAdminReply ?? false })
        .select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Update ticket updated_at
    await insforge.database.from('tickets').update({ updated_at: new Date().toISOString() }).eq('id', id);

    // Fetch ticket for routing
    const { data: ticket } = await insforge.database.from('tickets').select('*').eq('id', id).single();
    if (!ticket) return NextResponse.json(msg);

    // Route reply based on source channel
    if (isAdminReply) {
        if (ticket.source_channel === 'whatsapp' && ticket.source_ref) {
            // Reply via WhatsApp
            await sendWhatsApp(ticket.source_ref, `📋 [Ticket #${id.slice(0, 8)}]\n${content}`);
        } else if (ticket.source_channel === 'email' && ticket.contact_email) {
            // Reply via email
            const { data: settings } = await insforge.database.from('ticket_settings').select('*').limit(1).single();
            if (settings?.smtp_host) {
                await sendEmail(settings, ticket.contact_email,
                    `Re: [Ticket #${id.slice(0, 8)}] ${ticket.subject}`,
                    `<p>${content}</p><hr/><p style="color:#999;font-size:12px">Ticket #${id.slice(0, 8)} · ${ticket.subject}</p>`
                );
            }
        } else if (ticket.contact_email) {
            // Default: email if available
            const { data: settings } = await insforge.database.from('ticket_settings').select('*').limit(1).single();
            if (settings?.smtp_host) {
                await sendEmail(settings, ticket.contact_email,
                    `Re: [Ticket #${id.slice(0, 8)}] ${ticket.subject}`,
                    `<p>${content}</p>`
                );
            }
        }
    }

    return NextResponse.json(msg);
}
