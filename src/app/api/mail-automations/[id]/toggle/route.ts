import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        const body = await req.json();

        // Espera { isActive: boolean } en el body
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabase
            .from('email_automations')
            .update({ is_active: body.isActive })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error toggling automation:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
