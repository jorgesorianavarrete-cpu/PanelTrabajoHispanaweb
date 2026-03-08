import { NextRequest, NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

async function sendEmail(settings: any, to: string, subject: string, html: string) {
    try {
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.createTransport({
            host: settings.smtp_host, port: settings.smtp_port,
            secure: settings.smtp_port === 465,
            auth: { user: settings.smtp_username, pass: settings.smtp_password },
            connectionTimeout: 15000, socketTimeout: 15000,
        });
        await transporter.sendMail({
            from: `"${settings.from_name}" <${settings.notification_email}>`,
            to, subject, html,
        });
    } catch (e) { console.error('Email error:', e); }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const deptId = searchParams.get('departmentId');
    const search = searchParams.get('search');

    let q = insforge.database
        .from('tickets')
        .select('*, ticket_departments(name)')
        .order('created_at', { ascending: false });

    if (status) q = q.eq('status', status);
    if (priority) q = q.eq('priority', priority);
    if (deptId) q = q.eq('department_id', deptId);
    if (search) q = q.or(`subject.ilike.%${search}%,contact_name.ilike.%${search}%,contact_email.ilike.%${search}%`);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { subject, description, departmentId, priority, contactEmail, contactName, sourceChannel, sourceRef } = body;

    const { data: ticket, error } = await insforge.database
        .from('tickets')
        .insert({
            subject, description,
            department_id: departmentId || null,
            priority: priority || 'medium',
            contact_email: contactEmail,
            contact_name: contactName,
            source_channel: sourceChannel || 'manual',
            source_ref: sourceRef || null,
            status: 'open',
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Send email notification if SMTP configured
    const { data: settings } = await insforge.database.from('ticket_settings').select('*').limit(1).single();
    if (settings?.smtp_host && departmentId) {
        const { data: dept } = await insforge.database.from('ticket_departments').select('*').eq('id', departmentId).single();
        if (dept?.email_notifications && settings?.notification_email) {
            await sendEmail(settings, settings.notification_email,
                `[Ticket #${ticket.id.slice(0, 8)}] ${subject}`,
                `<h2>Nuevo ticket de soporte</h2><p><b>De:</b> ${contactName} &lt;${contactEmail}&gt;</p><p><b>Asunto:</b> ${subject}</p><p><b>Descripción:</b></p><p>${description}</p>`
            );
        }
    }

    return NextResponse.json(ticket);
}

export async function DELETE(req: NextRequest) {
    const { ids } = await req.json();
    const { error } = await insforge.database.from('tickets').delete().in('id', ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
