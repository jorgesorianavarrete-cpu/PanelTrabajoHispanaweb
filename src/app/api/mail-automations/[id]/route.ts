import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        const body = await req.json();

        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabase
            .from('email_automations')
            .update(body)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error updating automation:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const id = (await params).id;
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { error } = await supabase
            .from('email_automations')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting automation:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
