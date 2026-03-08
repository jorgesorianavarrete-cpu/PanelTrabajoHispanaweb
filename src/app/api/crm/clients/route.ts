import { NextResponse } from 'next/server';
import { auth } from '@insforge/nextjs/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const url = new URL(request.url);
        const search = url.searchParams.get('q');
        const type = url.searchParams.get('type');
        const limit = parseInt(url.searchParams.get('limit') || '100');

        let query = supabase.database
            .from('crm_clients')
            .select(`
                *,
                activities:crm_activities(count),
                tasks:crm_tasks(count),
                appointments:crm_appointments(count)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (type) {
            query = query.eq('type', type);
        }

        if (search) {
            query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
        }

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
        const { data, error } = await supabase.database
            .from('crm_clients')
            .insert({
                user_id: userId,
                organization_id: userId,
                first_name: body.firstName,
                last_name: body.lastName || '',
                email: body.email,
                phone: body.phone,
                city: body.city,
                address: body.address,
                notes: body.notes,
                type: body.type || 'LEAD',
                source: body.source
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
