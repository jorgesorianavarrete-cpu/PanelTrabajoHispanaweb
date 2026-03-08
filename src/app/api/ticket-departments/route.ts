import { NextRequest, NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

export async function GET(req: NextRequest) {
    let q = insforge.database.from('ticket_departments').select('*').order('created_at', { ascending: true });
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { data, error } = await insforge.database
        .from('ticket_departments')
        .insert({ name: body.name, description: body.description, assigned_user_id: body.assignedUserId || null, email_notifications: body.emailNotifications ?? true })
        .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}
