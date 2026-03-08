import { NextResponse } from 'next/server';
import { auth } from '@insforge/nextjs/server';
import { supabase } from '@/lib/supabase';
import { removeUserGoogleConnection } from '@/lib/google-calendar';

export async function GET(request: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase.database
            .from('google_calendar_connections')
            .select('google_account_email')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // No row found is fine

        return NextResponse.json({
            connected: !!data,
            email: data?.google_account_email
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await removeUserGoogleConnection(userId);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
