import { NextResponse } from 'next/server';
import { auth } from '@insforge/nextjs/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const url = new URL(request.url);
        const status = url.searchParams.get('status');
        const clientId = url.searchParams.get('clientId');
        const limit = parseInt(url.searchParams.get('limit') || '100');

        let query = supabase.database
            .from('crm_tasks')
            .select(`
                *,
                client:client_id(first_name, last_name)
            `)
            .eq('user_id', userId)
            .order('due_date', { ascending: true, nullsFirst: false })
            .limit(limit);

        if (status) query = query.eq('status', status);
        if (clientId) query = query.eq('client_id', clientId);

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();

        const payload: any = {
            user_id: userId,
            organization_id: userId,
            title: body.title,
            description: body.description,
            priority: body.priority || 'MEDIUM',
            status: body.status || 'PENDING',
            due_date: body.dueDate || null,
        };

        if (body.clientId) payload.client_id = body.clientId;

        const { data, error } = await supabase.database
            .from('crm_tasks')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
