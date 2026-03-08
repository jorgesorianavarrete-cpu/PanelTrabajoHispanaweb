import { NextResponse } from 'next/server';
import { auth } from '@insforge/nextjs/server';
import { supabase } from '@/lib/supabase';

// Helper mock matching function for the future
async function findMatches(demand: any) {
    // In a real scenario, we query `items` checking:
    // price <= demand.max_price
    // size >= demand.min_size
    // categories IN demand.categories
    // return array of matched items
    return [];
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: demand, error } = await supabase.database
            .from('client_demands')
            .select('*, client:client_id(first_name, last_name, email, phone)')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!demand) return NextResponse.json({ error: 'Demand not found' }, { status: 404 });

        const matches = await findMatches(demand);

        // Si notify_email es true o es una petición de forzado, envíariamos mail,
        // por ahora retornamos los matches calculados al cliente.

        return NextResponse.json({ success: true, count: matches.length, matches });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
