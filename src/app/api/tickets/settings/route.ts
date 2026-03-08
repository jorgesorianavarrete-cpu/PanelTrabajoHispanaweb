import { NextRequest, NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

export async function GET() {
    const { data, error } = await insforge.database.from('ticket_settings').select('*').limit(1).single();
    if (error && error.code !== 'PGRST116') return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || {});
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { data: existing } = await insforge.database.from('ticket_settings').select('id').limit(1).single();

    let result;
    if (existing?.id) {
        ({ data: result } = await insforge.database.from('ticket_settings').update({
            smtp_host: body.smtpHost, smtp_port: body.smtpPort,
            smtp_username: body.smtpUsername, smtp_password: body.smtpPassword,
            notification_email: body.notificationEmail, from_name: body.fromName,
        }).eq('id', existing.id).select().single());
    } else {
        ({ data: result } = await insforge.database.from('ticket_settings').insert({
            smtp_host: body.smtpHost, smtp_port: body.smtpPort,
            smtp_username: body.smtpUsername, smtp_password: body.smtpPassword,
            notification_email: body.notificationEmail, from_name: body.fromName,
        }).select().single());
    }
    return NextResponse.json(result);
}
