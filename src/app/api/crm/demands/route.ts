import { NextResponse } from 'next/server';
import { auth } from '@insforge/nextjs/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const url = new URL(request.url);
        const clientId = url.searchParams.get('clientId');
        const limit = parseInt(url.searchParams.get('limit') || '100');

        let query = supabase.database
            .from('client_demands')
            .select(`
                *,
                client:client_id(first_name, last_name, email, phone)
            `)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(limit);

        // A user only sees their clients' demands via RLS (or explicit filter). We can rely on RLS,
        // but let's be safe. Wait, the RLS policy we wrote ensures `EXISTS(select from CRM_Clients)`.

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
            client_id: body.clientId,
            organization_id: userId,
            categories: body.categories || [],
            max_price: body.maxPrice || null,
            min_size: body.minSize || null,
            min_quantity: body.minQuantity || null,
            preferred_zones: body.preferredZones || null,
            notify_email: body.notifyEmail || false,
            notify_whatsapp: body.notifyWhatsapp || false,
            is_active: body.isActive !== undefined ? body.isActive : true
        };

        const { data, error } = await supabase.database
            .from('client_demands')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;

        // El matching automatico se haria aqui o de manera asincrona
        // Fetch to `/api/crm/demands/${data.id}/match` in background could be an option,
        // for now we just return the demand.

        return NextResponse.json(data, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
