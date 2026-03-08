import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!;

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const orgId = searchParams.get('organizationId') || 'default_org';

        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabase
            .from('email_automations')
            .select('*')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (error: any) {
        console.error('Error fetching automations:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const organization_id = 'default_org'; // Podría venir del body o auth
        const user_id = '00000000-0000-0000-0000-000000000000'; // Default admin userId

        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabase
            .from('email_automations')
            .insert([{ ...body, organization_id, user_id }])
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error creating automation:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
