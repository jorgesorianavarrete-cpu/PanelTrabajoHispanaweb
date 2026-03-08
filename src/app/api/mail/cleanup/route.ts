import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!;

export async function DELETE(req: Request) {
    try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        // Borramos todos los correos de la tabla local
        const { error } = await supabase
            .from('emails')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (error) throw error;
        return NextResponse.json({ success: true, message: 'Mensajes locales eliminados' });
    } catch (error: any) {
        console.error('Error cleaning up local emails:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
