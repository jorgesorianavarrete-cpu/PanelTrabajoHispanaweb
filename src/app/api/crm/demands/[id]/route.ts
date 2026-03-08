import { NextResponse } from 'next/server';
import { auth } from '@insforge/nextjs/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const payload: any = {};
        if (body.categories !== undefined) payload.categories = body.categories;
        if (body.maxPrice !== undefined) payload.max_price = body.maxPrice;
        if (body.minSize !== undefined) payload.min_size = body.minSize;
        if (body.minQuantity !== undefined) payload.min_quantity = body.minQuantity;
        if (body.preferredZones !== undefined) payload.preferred_zones = body.preferredZones;
        if (body.notifyEmail !== undefined) payload.notify_email = body.notifyEmail;
        if (body.notifyWhatsapp !== undefined) payload.notify_whatsapp = body.notifyWhatsapp;
        if (body.isActive !== undefined) payload.is_active = body.isActive;

        // Since we don't store user_id in client_demands directly, we could rely on RLS 
        // passing through if auth is valid, or explicitly check owner using subquery.
        // For simplicity, we just run update as RLS handles user permissions to Demands exactly.

        const { data, error } = await supabase.database
            .from('client_demands')
            .update(payload)
            .eq('id', id)
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
            .from('client_demands')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
