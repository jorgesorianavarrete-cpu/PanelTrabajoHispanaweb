'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@insforge/nextjs';
import { insforge } from '@/lib/insforge';
import {
    Users, CheckSquare, Plus, Calendar, User, Activity as ActivityIcon,
    PieChart, Briefcase, Phone, Mail, MapPin, Clock, Trash2, Edit, X, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type TabType = 'dashboard' | 'clients' | 'tasks' | 'appointments' | 'activities';

interface Client {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    type: string;
    city: string;
    status: string;
    sector?: string;
    website_url?: string;
    sitemap_url?: string;
    blog_map_url?: string;
    context_info?: string;
    wp_url?: string;
    wp_api_key?: string;
}
interface Task { id: string; title: string; priority: string; status: string; due_date: string; client?: { first_name: string; last_name: string } }
interface Appointment { id: string; title: string; location: string; start_time: string; end_time: string; status: string; }
interface Activity { id: string; type: string; title: string; description: string; activity_date: string; outcome: string; client?: { first_name: string; last_name: string } }

export default function CRMApp() {
    const [activeTab, setActiveTab] = useState<TabType>('dashboard');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [stats, setStats] = useState<any>(null);
    const [clients, setClients] = useState<Client[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Partial<Client> | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { user } = useUser();

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {

            if (activeTab === 'dashboard') {
                // Stats
                const [clientRes, taskRes, appointmentRes] = await Promise.all([
                    insforge.database.from('crm_clients').select('*', { count: 'exact', head: true }).eq('status', 'active'),
                    insforge.database.from('crm_tasks').select('*', { count: 'exact', head: true }).in('status', ['PENDING', 'IN_PROGRESS']),
                    insforge.database.from('crm_appointments').select('*', { count: 'exact', head: true }).gte('start_time', new Date().toISOString()).in('status', ['SCHEDULED', 'CONFIRMED'])
                ]);

                const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
                const { count: newClients } = await insforge.database.from('crm_clients').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth);

                setStats({
                    totalClients: clientRes.count || 0,
                    newClientsMonth: newClients || 0,
                    pendingTasks: taskRes.count || 0,
                    upcomingAppointments: appointmentRes.count || 0
                });

                const { data: actData } = await insforge.database
                    .from('crm_activities')
                    .select('*, client:client_id(first_name, last_name)')
                    .order('activity_date', { ascending: false })
                    .limit(5);
                setActivities(actData || []);

            } else if (activeTab === 'clients') {
                const { data, error: dbError } = await insforge.database
                    .from('crm_clients')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (dbError) throw dbError;
                setClients(data || []);

            } else if (activeTab === 'tasks') {
                const { data, error: dbError } = await insforge.database
                    .from('crm_tasks')
                    .select('*, client:client_id(first_name, last_name)')
                    .order('due_date', { ascending: true, nullsFirst: false });
                if (dbError) throw dbError;
                setTasks(data || []);

            } else if (activeTab === 'appointments') {
                const { data, error: dbError } = await insforge.database
                    .from('crm_appointments')
                    .select('*')
                    .order('start_time', { ascending: true });
                if (dbError) throw dbError;
                setAppointments(data || []);

            } else if (activeTab === 'activities') {
                const { data, error: dbError } = await insforge.database
                    .from('crm_activities')
                    .select('*, client:client_id(first_name, last_name)')
                    .order('activity_date', { ascending: false });
                if (dbError) throw dbError;
                setActivities(data || []);
            }
        } catch (e: any) {
            console.error('CRM load error:', e);
            setError(e.message || 'Error al cargar los datos');
        }
        setLoading(false);
    };

    const TABS = [
        { id: 'dashboard', label: 'Dashboard', icon: PieChart },
        { id: 'clients', label: 'Clientes', icon: Users },
        { id: 'tasks', label: 'Tareas', icon: CheckSquare },
        { id: 'appointments', label: 'Citas', icon: Calendar },
        { id: 'activities', label: 'Actividades', icon: ActivityIcon },
    ];

    const handleOpenModal = (client?: Client) => {
        setEditingClient(client || { first_name: '', last_name: '', email: '', phone: '', type: 'LEAD', city: '', status: 'active', sector: '', website_url: '', sitemap_url: '', blog_map_url: '', context_info: '', wp_url: '', wp_api_key: '' });
        setIsModalOpen(true);
    };

    const handleSaveClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingClient) return;
        setIsSaving(true);
        try {
            let currentUser: any = user;

            try {
                if (!currentUser && typeof insforge.auth?.getCurrentSession === 'function') {
                    const { data } = await insforge.auth.getCurrentSession();
                    currentUser = data?.session?.user;
                }
            } catch (err) {
                console.warn('Could not fetch current session fallback', err);
            }

            // First, remove fields that are not part of the schema or shouldn't be blindly updated
            if (editingClient.id === '') {
                delete editingClient.id;
            }

            const clientData: any = {
                ...editingClient,
                status: editingClient.status || 'active'
            };

            if (currentUser) {
                clientData.organization_id = currentUser?.user_metadata?.organization_id || currentUser?.metadata?.organization_id || currentUser.id;
                clientData.user_id = currentUser.id;
            }

            // Remove ID for update, and fix type mapping if necessary (legacy fallback)
            const id = clientData.id || editingClient.id;
            delete clientData.id;
            if (id === '') {
                delete clientData.id;
            }

            // Legacy mapping if somehow an old client has 'CUSTOMER' or 'POTENTIAL'
            if (clientData.type === 'CUSTOMER') clientData.type = 'CLIENT';
            if (clientData.type === 'POTENTIAL') clientData.type = 'PROSPECT';

            const { error: dbError } = (id && id !== '')
                ? await insforge.database.from('crm_clients').update(clientData).eq('id', id)
                : await insforge.database.from('crm_clients').insert([clientData]);

            if (dbError) throw dbError;
            setIsModalOpen(false);
            loadData();
        } catch (e: any) {
            console.error('Save client error:', e);
            alert('Error al guardar: ' + (e.message || 'Error desconocido'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClient = async (id: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este cliente?')) return;
        try {
            const { error: dbError } = await insforge.database.from('crm_clients').delete().eq('id', id);
            if (dbError) throw dbError;
            loadData();
        } catch (e: any) {
            alert('Error al eliminar: ' + e.message);
        }
    };

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'URGENT': return 'bg-red-500/10 text-red-500';
            case 'HIGH': return 'bg-orange-500/10 text-orange-500';
            case 'MEDIUM': return 'bg-yellow-500/10 text-yellow-500';
            default: return 'bg-green-500/10 text-green-500';
        }
    };

    const getStatusColor = (s: string) => {
        switch (s) {
            case 'PENDING': return 'bg-slate-500/10 text-slate-500';
            case 'IN_PROGRESS': return 'bg-blue-500/10 text-blue-500';
            case 'COMPLETED': return 'bg-green-500/10 text-green-500';
            default: return 'bg-red-500/10 text-red-400';
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-[#0B1121] overflow-hidden">
            {/* Header Tipo Tickets */}
            <header className="flex-none px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Briefcase className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-slate-800 dark:text-white">CRM Avanzado</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Gestión centralizada de clientes y ciclo de ventas</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {activeTab === 'clients' && <button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"><Plus className="w-4 h-4" /> Nuevo Cliente</button>}
                        {activeTab === 'tasks' && <button onClick={() => null} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"><Plus className="w-4 h-4" /> Nueva Tarea</button>}
                        {activeTab === 'appointments' && <button onClick={() => null} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"><Plus className="w-4 h-4" /> Nueva Cita</button>}
                        {activeTab === 'activities' && <button onClick={() => null} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"><Plus className="w-4 h-4" /> Nueva Actividad</button>}
                    </div>
                </div>

                <div className="flex gap-1">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                {error && (
                    <div className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 flex-none" />
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">

                        {/* 1. DASHBOARD */}
                        {activeTab === 'dashboard' && stats && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Total Clientes</p>
                                    <p className="text-3xl font-bold mt-2 text-slate-800 dark:text-white">{stats.totalClients}</p>
                                </div>
                                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Nuevos (Mes)</p>
                                    <p className="text-3xl font-bold mt-2 text-indigo-600 dark:text-indigo-400">+{stats.newClientsMonth}</p>
                                </div>
                                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Tareas Pendientes</p>
                                    <p className="text-3xl font-bold mt-2 text-amber-500">{stats.pendingTasks}</p>
                                </div>
                                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Próx. Citas</p>
                                    <p className="text-3xl font-bold mt-2 text-green-500">{stats.upcomingAppointments}</p>
                                </div>
                            </div>
                        )}
                        {activeTab === 'dashboard' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden">
                                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                        <h3 className="font-semibold text-slate-800 dark:text-white">Últimas Actividades</h3>
                                        <button onClick={() => setActiveTab('activities')} className="text-xs text-indigo-500 hover:underline">Ver todas</button>
                                    </div>
                                    <div className="p-4 flex flex-col gap-4">
                                        {activities.length === 0 ? <p className="text-sm text-slate-500">No hay actividad reciente.</p> : activities.map(act => (
                                            <div key={act.id} className="flex gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                                <div className="flex-1">
                                                    <div className="flex gap-2 items-center">
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                                            {act.type}
                                                        </span>
                                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{act.title}</p>
                                                    </div>
                                                    {act.client && <p className="text-xs text-slate-500 mt-1">Con: {act.client.first_name} {act.client.last_name}</p>}
                                                    <p className="text-xs text-slate-400 mt-2">{new Date(act.activity_date).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 2. CLIENTS */}
                        {activeTab === 'clients' && (
                            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                                        <tr>
                                            <th className="font-medium p-4">Nombre</th>
                                            <th className="font-medium p-4">Tipo</th>
                                            <th className="font-medium p-4">Contacto</th>
                                            <th className="font-medium p-4">Ubicación</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                        {clients.map(client => (
                                            <tr key={client.id} onClick={() => handleOpenModal(client)} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 cursor-pointer group">
                                                <td className="p-4 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                                                        {client.first_name?.[0] || 'U'}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-800 dark:text-white">{client.first_name} {client.last_name}</p>
                                                        {client.sector && <p className="text-[10px] text-slate-500">{client.sector}</p>}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="px-2 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                        {client.type}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-1 text-slate-500 dark:text-slate-400">
                                                        <div className="flex items-center gap-2 text-xs"><Mail className="w-3 h-3" /> {client.email || '-'}</div>
                                                        <div className="flex items-center gap-2 text-xs"><Phone className="w-3 h-3" /> {client.phone || '-'}</div>
                                                    </div>
                                                </td>
                                                <td className="p-4 relative">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-slate-500 dark:text-slate-400">{client.city || '-'}</span>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id); }}
                                                            className="p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {clients.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="p-8 text-center text-slate-500">No hay clientes encontrados. Crea tu primer cliente con el botón de arriba.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* 3. TASKS */}
                        {activeTab === 'tasks' && (
                            <div className="grid gap-4">
                                {tasks.map(task => (
                                    <div key={task.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1">
                                                <input type="checkbox" readOnly checked={task.status === 'COMPLETED'} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                            </div>
                                            <div>
                                                <h4 className={`font-medium ${task.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                                    {task.title}
                                                </h4>
                                                {task.client && <p className="text-sm text-slate-500 mt-1">Cliente: {task.client.first_name} {task.client.last_name}</p>}
                                                {task.due_date && <p className="text-xs text-slate-400 mt-2 flex items-center gap-1"><Clock className="w-3 h-3" /> Vence: {new Date(task.due_date).toLocaleDateString()}</p>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(task.status)}`}>{task.status.replace('_', ' ')}</span>
                                            <div className="flex gap-2 opacity-50 hover:opacity-100 transition-opacity">
                                                <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-500"><Edit className="w-4 h-4" /></button>
                                                <button className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md text-red-500"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {tasks.length === 0 && <p className="text-center text-slate-500 py-8">No hay tareas creadas. Crea tu primera tarea con el botón de arriba.</p>}
                            </div>
                        )}

                        {/* 4. APPOINTMENTS */}
                        {activeTab === 'appointments' && (
                            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden">
                                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {appointments.map(app => (
                                        <div key={app.id} className="p-5 flex flex-col md:flex-row gap-6 md:items-center hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <div className="flex-none bg-slate-100 dark:bg-slate-800 rounded-lg p-3 text-center min-w-[80px]">
                                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                                    {format(new Date(app.start_time), 'MMM', { locale: es })}
                                                </p>
                                                <p className="text-2xl font-bold text-slate-800 dark:text-white">
                                                    {format(new Date(app.start_time), 'dd')}
                                                </p>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h4 className="font-semibold text-slate-800 dark:text-white text-lg">{app.title}</h4>
                                                    <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                        {app.status}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400 mt-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="w-4 h-4" />
                                                        {format(new Date(app.start_time), 'HH:mm')} - {format(new Date(app.end_time || app.start_time), 'HH:mm')}
                                                    </div>
                                                    {app.location && (
                                                        <div className="flex items-center gap-1.5">
                                                            <MapPin className="w-4 h-4" />
                                                            {app.location}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex-none flex gap-2">
                                                <button className="btn-secondary py-1.5 px-3 text-sm">Editar</button>
                                                <button className="btn-secondary py-1.5 px-3 text-sm text-red-500 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-500/10 dark:hover:border-red-500/30 border-transparent">Cancelar</button>
                                            </div>
                                        </div>
                                    ))}
                                    {appointments.length === 0 && <p className="text-center text-slate-500 py-8">No hay citas programadas. Crea tu primera cita con el botón de arriba.</p>}
                                </div>
                            </div>
                        )}

                        {/* 5. ACTIVITIES */}
                        {activeTab === 'activities' && (
                            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 overflow-hidden">
                                <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 space-y-8 py-4">
                                    {activities.map(act => (
                                        <div key={act.id} className="relative pl-8">
                                            <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-500"></div>
                                            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-4 rounded-lg">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2 py-0.5 text-xs rounded bg-slate-200 dark:bg-slate-700 font-medium text-slate-700 dark:text-slate-300">
                                                            {act.type}
                                                        </span>
                                                        <h4 className="font-medium text-slate-800 dark:text-slate-200">{act.title}</h4>
                                                    </div>
                                                    <span className="text-xs text-slate-500">{new Date(act.activity_date).toLocaleString()}</span>
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{act.description}</p>
                                                <div className="mt-4 flex gap-4 text-sm">
                                                    {act.client && (
                                                        <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                                            <User className="w-3 h-3" /> {act.client.first_name} {act.client.last_name}
                                                        </span>
                                                    )}
                                                    {act.outcome && (
                                                        <span className="text-green-600 dark:text-green-500 border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-500/10 px-2 py-0.5 rounded text-xs">
                                                            Resultado: {act.outcome}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {activities.length === 0 && <p className="text-center text-slate-500 py-4 ml-4">No hay actividades registradas.</p>}
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </main>

            {/* Client Modal */}
            {isModalOpen && editingClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#0f1629] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-white/[0.02]">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {editingClient.id ? 'Editar Cliente' : 'Nuevo Cliente'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveClient} className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
                            {/* General Info */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <User className="w-3 h-3" /> Información General
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500 ml-1">Nombre</label>
                                        <input required type="text" value={editingClient.first_name} onChange={e => setEditingClient({ ...editingClient, first_name: e.target.value })} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500 ml-1">Apellidos</label>
                                        <input required type="text" value={editingClient.last_name} onChange={e => setEditingClient({ ...editingClient, last_name: e.target.value })} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500 ml-1">Email</label>
                                        <input type="email" value={editingClient.email} onChange={e => setEditingClient({ ...editingClient, email: e.target.value })} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500 ml-1">Teléfono</label>
                                        <input type="text" value={editingClient.phone} onChange={e => setEditingClient({ ...editingClient, phone: e.target.value })} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500 ml-1">Tipo</label>
                                        <select value={editingClient.type} onChange={e => setEditingClient({ ...editingClient, type: e.target.value })} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/50 focus:outline-none">
                                            <option value="LEAD">Lead</option>
                                            <option value="PROSPECT">Prospecto</option>
                                            <option value="CLIENT">Cliente</option>
                                            <option value="VIP">VIP</option>
                                            <option value="INACTIVE">Inactivo</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500 ml-1">Sector</label>
                                        <input type="text" value={editingClient.sector} onChange={e => setEditingClient({ ...editingClient, sector: e.target.value })} placeholder="Ej: Inmobiliaria, Restauración..." className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/50 focus:outline-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Marketing Context (AI Context) */}
                            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                                <h3 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-2">
                                    <ActivityIcon className="w-3 h-3" /> Contexto para Marketing e IA
                                </h3>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500 ml-1">Contexto de Empresa (Misión, valores, qué hacen...)</label>
                                        <textarea value={editingClient.context_info} onChange={e => setEditingClient({ ...editingClient, context_info: e.target.value })} rows={3} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-sm focus:ring-2 focus:ring-purple-500/50 focus:outline-none resize-none" placeholder="Proporciona contexto para que la IA genere mejores artículos..." />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500 ml-1">URL Web</label>
                                            <input type="url" value={editingClient.website_url} onChange={e => setEditingClient({ ...editingClient, website_url: e.target.value })} placeholder="https://..." className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500/50 focus:outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500 ml-1">URL Sitemap</label>
                                            <input type="url" value={editingClient.sitemap_url} onChange={e => setEditingClient({ ...editingClient, sitemap_url: e.target.value })} placeholder="Para evitar duplicados" className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500/50 focus:outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-slate-500 ml-1">URL Blog (RSS/Map)</label>
                                            <input type="url" value={editingClient.blog_map_url} onChange={e => setEditingClient({ ...editingClient, blog_map_url: e.target.value })} placeholder="Historial de posts" className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500/50 focus:outline-none" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Integration */}
                            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                    <Briefcase className="w-3 h-3" /> Integración WP
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500 ml-1">WordPress URL</label>
                                        <input type="url" value={editingClient.wp_url} onChange={e => setEditingClient({ ...editingClient, wp_url: e.target.value })} placeholder="https://dominio.com" className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/50 focus:outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500 ml-1">Application Password / API Key</label>
                                        <input type="password" value={editingClient.wp_api_key} onChange={e => setEditingClient({ ...editingClient, wp_api_key: e.target.value })} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/50 focus:outline-none" />
                                    </div>
                                </div>
                            </div>
                        </form>

                        <div className="p-6 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                                Cancelar
                            </button>
                            <button onClick={(e) => handleSaveClient(e as any)} disabled={isSaving} className="px-8 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2">
                                {isSaving && <Clock className="w-4 h-4 animate-spin" />}
                                {editingClient.id ? 'Actualizar Cliente' : 'Guardar Cliente'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
