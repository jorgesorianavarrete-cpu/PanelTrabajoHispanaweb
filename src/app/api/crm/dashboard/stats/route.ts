import { NextResponse } from 'next/server';
import { auth } from '@insforge/nextjs/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Total clients
        const { count: totalClients } = await supabase.database
            .from('crm_clients')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'active');

        // New clients this month
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const { count: newClients } = await supabase.database
            .from('crm_clients')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('created_at', startOfMonth);

        // Pending tasks
        const { count: pendingTasks } = await supabase.database
            .from('crm_tasks')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .in('status', ['PENDING', 'IN_PROGRESS']);

        // Upcoming appointments
        const now = new Date().toISOString();
        const { count: upcomingAppointments } = await supabase.database
            .from('crm_appointments')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('start_time', now)
            .in('status', ['SCHEDULED', 'CONFIRMED']);

        return NextResponse.json({
            totalClients: totalClients || 0,
            newClientsMonth: newClients || 0,
            pendingTasks: pendingTasks || 0,
            upcomingAppointments: upcomingAppointments || 0
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
