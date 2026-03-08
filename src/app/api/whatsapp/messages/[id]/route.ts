import { NextRequest, NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

type Ctx = { params: Promise<{ id: string }> };

// POST /api/whatsapp/messages/:id/react  { emoji }
export async function POST(req: NextRequest, ctx: Ctx) {
    const { id } = await ctx.params;
    const { emoji } = await req.json();
    const { error } = await insforge.database
        .from('whatsapp_messages')
        .update({ reaction_emoji: emoji })
        .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}

// DELETE /api/whatsapp/messages/:id
export async function DELETE(_req: NextRequest, ctx: Ctx) {
    const { id } = await ctx.params;
    const { error } = await insforge.database
        .from('whatsapp_messages')
        .update({ is_deleted: true, text: '' })
        .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
