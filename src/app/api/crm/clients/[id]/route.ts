import { NextResponse } from 'next/server';
import { auth } from '@insforge/nextjs/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data, error } = await supabase.database
            .from('crm_clients')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();

        const payload: any = {};
        if (body.firstName !== undefined) payload.first_name = body.firstName;
        if (body.lastName !== undefined) payload.last_name = body.lastName;
        if (body.email !== undefined) payload.email = body.email;
        if (body.phone !== undefined) payload.phone = body.phone;
        if (body.city !== undefined) payload.city = body.city;
        if (body.address !== undefined) payload.address = body.address;
        if (body.notes !== undefined) payload.notes = body.notes;
        if (body.type !== undefined) payload.type = body.type;
        if (body.status !== undefined) payload.status = body.status;
        if (body.source !== undefined) payload.source = body.source;
        payload.updated_at = new Date().toISOString();

        const { data, error } = await supabase.database
            .from('crm_clients')
            .update(payload)
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { error } = await supabase.database
            .from('crm_clients')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
