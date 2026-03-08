import { NextRequest, NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
    const { id } = await ctx.params;
    const body = await req.json();
    const { data, error } = await insforge.database
        .from('ticket_departments')
        .update({ name: body.name, description: body.description, assigned_user_id: body.assignedUserId, email_notifications: body.emailNotifications })
        .eq('id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
    const { id } = await ctx.params;
    const { error } = await insforge.database.from('ticket_departments').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
