import { NextRequest, NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
    const { id } = await ctx.params;
    const { action, value } = await req.json();
    const field: Record<string, string> = {
        rename: 'name',
        archive: 'is_archived',
        pin: 'is_pinned',
        mute: 'is_muted',
    };
    if (!field[action]) return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

    const updateVal: Record<string, any> = {};
    if (action === 'rename') updateVal.name = value;
    else updateVal[field[action]] = value;

    const { error } = await insforge.database
        .from('whatsapp_chats')
        .update(updateVal)
        .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}

export async function POST(_req: NextRequest, ctx: Ctx) {
    const { id } = await ctx.params;
    const { error } = await insforge.database
        .from('whatsapp_chats')
        .update({ unread_count: 0 })
        .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
