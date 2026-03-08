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
        await insforge.database.from('whatsapp_chats').update({ last_message: content, updated_at: new Date().toISOString() }).eq('id', chatId);
    } catch (e) { console.error('WhatsApp send error:', e); }
}

export async function GET(_req: NextRequest, ctx: Ctx) {
    const { id } = await ctx.params;
    const { data: ticket, error } = await insforge.database
        .from('tickets')
        .select('*, ticket_departments(name)')
        .eq('id', id)
        .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: messages } = await insforge.database
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at', { ascending: true });

    return NextResponse.json({ ...ticket, messages: messages || [] });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
    const { id } = await ctx.params;
    const { error } = await insforge.database.from('tickets').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
    const { id } = await ctx.params;
    const { status, priority } = await req.json();
    const update: any = { updated_at: new Date().toISOString() };
    if (status) update.status = status;
    if (priority) update.priority = priority;
    const { data, error } = await insforge.database.from('tickets').update(update).eq('id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}
