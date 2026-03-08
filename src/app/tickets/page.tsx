'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Ticket, Plus, X, Send, Search, Filter, Trash2, Settings, Users,
    Mail, MessageCircle, ChevronDown, AlertCircle, CheckCircle,
    Clock, XCircle, Edit3, Bell, BellOff, RefreshCw, ArrowLeft
} from 'lucide-react';
import { useResizable } from '@/hooks/use-resizable';

// ─── Types ─────────────────────────────────────────────────────────────────
interface TicketType {
    id: string; subject: string; description: string; status: string; priority: string;
    contact_email: string; contact_name: string; department_id: string;
    source_channel: string; source_ref: string;
    created_at: string; updated_at: string;
    ticket_departments?: { name: string };
}

interface TicketMessage {
    id: string; ticket_id: string; content: string;
    is_admin_reply: boolean; created_at: string;
}

interface Department {
    id: string; name: string; description: string;
    assigned_user_id: string; email_notifications: boolean; created_at: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
    open: { label: 'Abierto', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', icon: AlertCircle },
    in_progress: { label: 'En progreso', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', icon: Clock },
    resolved: { label: 'Resuelto', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', icon: CheckCircle },
    closed: { label: 'Cerrado', color: 'bg-slate-500/10 text-slate-500', icon: XCircle },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
    low: { label: 'Baja', color: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
    medium: { label: 'Media', color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' },
    high: { label: 'Alta', color: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400' },
    urgent: { label: 'Urgente', color: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' },
};

const SOURCE_ICON: Record<string, any> = {
    email: Mail, whatsapp: MessageCircle, manual: Ticket,
};

function StatusBadge({ status }: { status: string }) {
    const s = STATUS_MAP[status] || STATUS_MAP.open;
    const Icon = s.icon;
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}><Icon className="w-3 h-3" />{s.label}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
    const p = PRIORITY_MAP[priority] || PRIORITY_MAP.medium;
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.color}`}>{p.label}</span>;
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function TicketsPage() {
    const { width: listWidth, startResizing: startResizingList } = useResizable({ initialWidth: 420, minWidth: 280, maxWidth: 600, storageKey: 'tickets-list-width' });
    const [tab, setTab] = useState<'tickets' | 'departments' | 'config'>('tickets');
    const [tickets, setTickets] = useState<TicketType[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [activeTicket, setActiveTicket] = useState<(TicketType & { messages: TicketMessage[] }) | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [filterDept, setFilterDept] = useState('');
    const [reply, setReply] = useState('');
    const [sendingReply, setSendingReply] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [showNewTicket, setShowNewTicket] = useState(false);

    // New ticket form
    const [form, setForm] = useState({ subject: '', description: '', departmentId: '', priority: 'medium', contactName: '', contactEmail: '', sourceChannel: 'manual', sourceRef: '' });

    // Settings
    const [smtp, setSmtp] = useState({ smtpHost: '', smtpPort: 587, smtpUsername: '', smtpPassword: '', notificationEmail: '', fromName: 'Soporte' });
    const [savingSmtp, setSavingSmtp] = useState(false);
    const [smtpSaved, setSmtpSaved] = useState(false);
    const [testingEmail, setTestingEmail] = useState(false);

    // Departments form
    const [showNewDept, setShowNewDept] = useState(false);
    const [deptForm, setDeptForm] = useState({ name: '', description: '', emailNotifications: true });
    const [editDeptId, setEditDeptId] = useState<string | null>(null);

    const loadTickets = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filterStatus) params.set('status', filterStatus);
        if (filterPriority) params.set('priority', filterPriority);
        if (filterDept) params.set('departmentId', filterDept);
        if (search) params.set('search', search);
        const r = await fetch(`/api/tickets?${params}`).then(res => res.json()).catch(() => []);
        setTickets(Array.isArray(r) ? r : []);
        setLoading(false);
    }, [filterStatus, filterPriority, filterDept, search]);

    const loadDepts = useCallback(async () => {
        const r = await fetch('/api/ticket-departments').then(res => res.json()).catch(() => []);
        setDepartments(Array.isArray(r) ? r : []);
    }, []);

    const loadSettings = useCallback(async () => {
        const r = await fetch('/api/tickets/settings').then(res => res.json()).catch(() => ({}));
        if (r.smtp_host) setSmtp({ smtpHost: r.smtp_host, smtpPort: r.smtp_port, smtpUsername: r.smtp_username, smtpPassword: r.smtp_password, notificationEmail: r.notification_email, fromName: r.from_name });
    }, []);

    useEffect(() => { loadTickets(); }, [loadTickets]);
    useEffect(() => { loadDepts(); loadSettings(); }, [loadDepts, loadSettings]);

    const openTicket = async (id: string) => {
        const r = await fetch(`/api/tickets/${id}`).then(res => res.json());
        setActiveTicket(r);
    };

    const createTicket = async () => {
        if (!form.subject) return;
        await fetch('/api/tickets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        setShowNewTicket(false);
        setForm({ subject: '', description: '', departmentId: '', priority: 'medium', contactName: '', contactEmail: '', sourceChannel: 'manual', sourceRef: '' });
        await loadTickets();
    };

    const sendReply = async () => {
        if (!reply.trim() || !activeTicket) return;
        setSendingReply(true);
        const r = await fetch(`/api/tickets/${activeTicket.id}/messages`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: reply, isAdminReply: true })
        }).then(res => res.json());
        setActiveTicket(prev => prev ? { ...prev, messages: [...prev.messages, r] } : null);
        setReply('');
        setSendingReply(false);
    };

    const changeStatus = async (status: string) => {
        if (!activeTicket) return;
        await fetch(`/api/tickets/${activeTicket.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
        setActiveTicket(prev => prev ? { ...prev, status } : null);
        setTickets(p => p.map(t => t.id === activeTicket.id ? { ...t, status } : t));
    };

    const deleteTicket = async (id: string) => {
        if (!confirm('¿Eliminar este ticket?')) return;
        await fetch(`/api/tickets/${id}`, { method: 'DELETE' });
        if (activeTicket?.id === id) setActiveTicket(null);
        setTickets(p => p.filter(t => t.id !== id));
    };

    const bulkDelete = async () => {
        if (!selected.size || !confirm(`¿Eliminar ${selected.size} tickets?`)) return;
        await fetch('/api/tickets', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [...selected] }) });
        setTickets(p => p.filter(t => !selected.has(t.id)));
        setSelected(new Set());
    };

    const saveSmtp = async () => {
        setSavingSmtp(true);
        await fetch('/api/tickets/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(smtp) });
        setSavingSmtp(false); setSmtpSaved(true); setTimeout(() => setSmtpSaved(false), 2000);
    };

    const createDept = async () => {
        if (!deptForm.name) return;
        if (editDeptId) {
            const r = await fetch(`/api/ticket-departments/${editDeptId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(deptForm) }).then(res => res.json());
            setDepartments(p => p.map(d => d.id === editDeptId ? r : d));
        } else {
            const r = await fetch('/api/ticket-departments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(deptForm) }).then(res => res.json());
            setDepartments(p => [...p, r]);
        }
        setShowNewDept(false); setEditDeptId(null); setDeptForm({ name: '', description: '', emailNotifications: true });
    };

    const deleteDept = async (id: string) => {
        if (!confirm('¿Eliminar departamento?')) return;
        await fetch(`/api/ticket-departments/${id}`, { method: 'DELETE' });
        setDepartments(p => p.filter(d => d.id !== id));
    };

    const TABS = [
        { id: 'tickets', label: 'Tickets', icon: Ticket },
        { id: 'departments', label: 'Departamentos', icon: Users },
        { id: 'config', label: 'Configuración', icon: Settings },
    ] as const;

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-[#0B1121] overflow-hidden">
            {/* Header */}
            <header className="flex-none px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Ticket className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Tickets de Soporte</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Gestión de incidencias por departamento</p>
                        </div>
                    </div>
                    {tab === 'tickets' && (
                        <button onClick={() => setShowNewTicket(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
                            <Plus className="w-4 h-4" />Nuevo ticket
                        </button>
                    )}
                </div>
                <div className="flex gap-1">
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                            <t.icon className="w-4 h-4" />{t.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* ── TAB TICKETS ─────────────────────────────────────────── */}
            {tab === 'tickets' && (
                <main className="flex-1 overflow-hidden flex">
                    {/* List */}
                    <div className={`${activeTicket ? 'hidden md:flex' : 'flex'} flex-col border-r border-slate-200 dark:border-slate-800 flex-none relative`} style={{ width: listWidth }}>
                        {/* Resize handle */}
                        <div onMouseDown={startResizingList} className="absolute right-0 top-0 bottom-0 w-1 bg-transparent hover:bg-blue-500/50 cursor-col-resize z-10 transition-colors" />

                        {/* Filters */}
                        <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
                            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar tickets..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40" /></div>
                            <div className="flex gap-2">
                                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-white focus:outline-none">
                                    <option value="">Todos los estados</option>
                                    {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                </select>
                                <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-white focus:outline-none">
                                    <option value="">Todas las prioridades</option>
                                    {Object.entries(PRIORITY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                </select>
                                <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-white focus:outline-none">
                                    <option value="">Todos los depts.</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            {selected.size > 0 && (
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-xs text-slate-500">{selected.size} seleccionados</span>
                                    <button onClick={bulkDelete} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"><Trash2 className="w-3.5 h-3.5" />Eliminar</button>
                                </div>
                            )}
                        </div>
                        {/* Ticket list */}
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" /></div>)
                                : tickets.length === 0 ? (<div className="flex flex-col items-center justify-center py-16 text-slate-400"><Ticket className="w-10 h-10 mb-2 opacity-30" /><p className="text-sm">Sin tickets</p></div>)
                                    : tickets.map(t => {
                                        const SrcIcon = SOURCE_ICON[t.source_channel] || Ticket;
                                        return (
                                            <div key={t.id} onClick={() => openTicket(t.id)}
                                                className={`flex items-start gap-3 p-4 border-b border-slate-200 dark:border-slate-800 cursor-pointer transition-colors hover:bg-white dark:hover:bg-slate-900/50 ${activeTicket?.id === t.id ? 'bg-blue-50 dark:bg-blue-500/5 border-l-2 border-l-blue-500' : ''}`}>
                                                <input type="checkbox" checked={selected.has(t.id)} onClick={e => { e.stopPropagation(); setSelected(p => { const s = new Set(p); s.has(t.id) ? s.delete(t.id) : s.add(t.id); return s; }); }} className="mt-1 w-4 h-4 rounded accent-blue-500 flex-none" />
                                                <SrcIcon className={`w-4 h-4 mt-1 flex-none ${t.source_channel === 'whatsapp' ? 'text-emerald-500' : t.source_channel === 'email' ? 'text-blue-500' : 'text-slate-400'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                        <p className="font-medium text-slate-800 dark:text-slate-200 text-sm truncate">{t.subject}</p>
                                                        <StatusBadge status={t.status} />
                                                    </div>
                                                    <p className="text-xs text-slate-500 mb-1.5">{t.contact_name || t.contact_email || 'Sin contacto'} {t.ticket_departments?.name && `· ${t.ticket_departments.name}`}</p>
                                                    <div className="flex items-center gap-2">
                                                        <PriorityBadge priority={t.priority} />
                                                        <span className="text-[10px] text-slate-400">{new Date(t.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                                <button onClick={e => { e.stopPropagation(); deleteTicket(t.id); }} className="opacity-0 hover:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-red-400 transition-all flex-none"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        );
                                    })}
                        </div>
                    </div>

                    {/* Detail */}
                    <div className={`flex-1 flex flex-col min-w-0 ${!activeTicket ? 'hidden md:flex' : 'flex'}`}>
                        {activeTicket ? (
                            <>
                                {/* Detail header */}
                                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shrink-0">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setActiveTicket(null)} className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><ArrowLeft className="w-4 h-4" /></button>
                                        <div>
                                            <h2 className="font-semibold text-slate-800 dark:text-white text-sm">{activeTicket.subject}</h2>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-slate-400">#{activeTicket.id.slice(0, 8)}</span>
                                                {(() => { const I = SOURCE_ICON[activeTicket.source_channel] || Ticket; return <I className={`w-3.5 h-3.5 ${activeTicket.source_channel === 'whatsapp' ? 'text-emerald-500' : activeTicket.source_channel === 'email' ? 'text-blue-400' : 'text-slate-400'}`} />; })()}
                                                <span className="text-xs text-slate-400 capitalize">{activeTicket.source_channel}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select value={activeTicket.priority} onChange={e => { fetch(`/api/tickets/${activeTicket.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ priority: e.target.value }) }); setActiveTicket(p => p ? { ...p, priority: e.target.value } : null); setTickets(p => p.map(t => t.id === activeTicket.id ? { ...t, priority: e.target.value } : t)); }} className="text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-white focus:outline-none">
                                            {Object.entries(PRIORITY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                        </select>
                                        <select value={activeTicket.status} onChange={e => changeStatus(e.target.value)} className="text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-white focus:outline-none">
                                            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                        </select>
                                        <button onClick={() => deleteTicket(activeTicket.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                                {/* Info bar */}
                                <div className="flex items-center gap-4 px-5 py-2 bg-slate-50 dark:bg-slate-900/30 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 shrink-0 flex-wrap gap-y-1">
                                    {activeTicket.contact_name && <span>👤 {activeTicket.contact_name}</span>}
                                    {activeTicket.contact_email && <span>📧 {activeTicket.contact_email}</span>}
                                    {activeTicket.ticket_departments?.name && <span>🏢 {activeTicket.ticket_departments.name}</span>}
                                    <span>📅 {new Date(activeTicket.created_at).toLocaleString('es-ES')}</span>
                                    {activeTicket.source_channel !== 'manual' && <span className={`font-medium ${activeTicket.source_channel === 'whatsapp' ? 'text-emerald-600' : 'text-blue-600'}`}>Las respuestas se enviarán por {activeTicket.source_channel === 'whatsapp' ? 'WhatsApp' : 'correo'} automáticamente</span>}
                                </div>
                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                    {/* Initial description */}
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 flex-none">
                                            {(activeTicket.contact_name || '?').slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-baseline gap-2 mb-1"><span className="text-sm font-medium text-slate-800 dark:text-slate-200">{activeTicket.contact_name || 'Cliente'}</span><span className="text-[10px] text-slate-400">{new Date(activeTicket.created_at).toLocaleString('es-ES')}</span></div>
                                            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{activeTicket.description}</div>
                                        </div>
                                    </div>
                                    {/* Messages */}
                                    {activeTicket.messages.map(m => (
                                        <div key={m.id} className={`flex gap-3 ${m.is_admin_reply ? 'flex-row-reverse' : ''}`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-none ${m.is_admin_reply ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                                {m.is_admin_reply ? 'AG' : (activeTicket.contact_name || '?').slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex-1 max-w-[80%]">
                                                <div className={`flex items-baseline gap-2 mb-1 ${m.is_admin_reply ? 'flex-row-reverse' : ''}`}><span className="text-xs font-medium text-slate-600 dark:text-slate-300">{m.is_admin_reply ? 'Agente' : activeTicket.contact_name || 'Cliente'}</span><span className="text-[10px] text-slate-400">{new Date(m.created_at).toLocaleString('es-ES')}</span></div>
                                                <div className={`px-4 py-3 rounded-xl text-sm whitespace-pre-wrap ${m.is_admin_reply ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'}`}>{m.content}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {/* Reply */}
                                {activeTicket.status !== 'closed' && (
                                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shrink-0">
                                        {activeTicket.source_channel !== 'manual' && (
                                            <div className={`flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg text-xs font-medium ${activeTicket.source_channel === 'whatsapp' ? 'bg-emerald-50 dark:bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' : 'bg-blue-50 dark:bg-blue-500/5 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20'}`}>
                                                {activeTicket.source_channel === 'whatsapp' ? <MessageCircle className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                                                Respuesta vía {activeTicket.source_channel === 'whatsapp' ? 'WhatsApp' : 'email'}
                                            </div>
                                        )}
                                        <div className="flex gap-2">
                                            <textarea value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === 'Enter' && e.ctrlKey && sendReply()} rows={3} placeholder="Escribe tu respuesta... (Ctrl+Enter para enviar)" className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none" />
                                            <button onClick={sendReply} disabled={!reply.trim() || sendingReply} className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors self-end flex items-center gap-2 text-sm font-medium">
                                                {sendingReply ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Send className="w-4 h-4" />}
                                                Enviar
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
                                <Ticket className="w-16 h-16 opacity-20" />
                                <p>Selecciona un ticket para ver el detalle</p>
                            </div>
                        )}
                    </div>
                </main>
            )}

            {/* ── TAB DEPARTAMENTOS ─────────────────────────────────── */}
            {tab === 'departments' && (
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-2xl">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-semibold text-slate-800 dark:text-white">Departamentos</h2>
                            <button onClick={() => { setShowNewDept(true); setEditDeptId(null); setDeptForm({ name: '', description: '', emailNotifications: true }); }} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"><Plus className="w-4 h-4" />Nuevo</button>
                        </div>
                        {showNewDept && (
                            <div className="mb-5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
                                <h3 className="font-medium text-slate-800 dark:text-white mb-4">{editDeptId ? 'Editar' : 'Nuevo'} departamento</h3>
                                <div className="space-y-3">
                                    <input type="text" value={deptForm.name} onChange={e => setDeptForm(p => ({ ...p, name: e.target.value }))} placeholder="Nombre del departamento" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                                    <textarea value={deptForm.description} onChange={e => setDeptForm(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="Descripción (opcional)" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none" />
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-700 dark:text-slate-300">Notificaciones por email</span>
                                        <button onClick={() => setDeptForm(p => ({ ...p, emailNotifications: !p.emailNotifications }))} className={`w-10 h-6 rounded-full transition-colors ${deptForm.emailNotifications ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}><span className={`block w-4 h-4 bg-white rounded-full transition-transform mx-1 ${deptForm.emailNotifications ? 'translate-x-4' : 'translate-x-0'}`} /></button>
                                    </div>
                                    <div className="flex gap-2 justify-end"><button onClick={() => { setShowNewDept(false); setEditDeptId(null); }} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300">Cancelar</button><button onClick={createDept} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium">{editDeptId ? 'Actualizar' : 'Crear'}</button></div>
                                </div>
                            </div>
                        )}
                        <div className="space-y-3">
                            {departments.map(d => (
                                <div key={d.id} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-none">{d.name.slice(0, 2).toUpperCase()}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2"><p className="font-medium text-slate-800 dark:text-slate-200 text-sm">{d.name}</p>{d.email_notifications ? <Bell className="w-3.5 h-3.5 text-blue-500" /> : <BellOff className="w-3.5 h-3.5 text-slate-400" />}</div>
                                        {d.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{d.description}</p>}
                                    </div>
                                    <div className="flex gap-1 flex-none">
                                        <button onClick={() => { setEditDeptId(d.id); setDeptForm({ name: d.name, description: d.description || '', emailNotifications: d.email_notifications }); setShowNewDept(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"><Edit3 className="w-4 h-4" /></button>
                                        <button onClick={() => deleteDept(d.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                            {departments.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">Sin departamentos</div>}
                        </div>
                    </div>
                </main>
            )}

            {/* ── TAB CONFIGURACIÓN ─────────────────────────────────── */}
            {tab === 'config' && (
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-lg space-y-5">
                        <h2 className="font-semibold text-slate-800 dark:text-white">Configuración SMTP</h2>
                        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                            {[
                                { key: 'smtpHost', label: 'Host SMTP', placeholder: 'smtp.gmail.com', type: 'text' },
                                { key: 'smtpPort', label: 'Puerto', placeholder: '587', type: 'number' },
                                { key: 'smtpUsername', label: 'Usuario', placeholder: 'usuario@dominio.com', type: 'text' },
                                { key: 'smtpPassword', label: 'Contraseña', placeholder: '••••••••', type: 'password' },
                                { key: 'notificationEmail', label: 'Email de notificación', placeholder: 'soporte@empresa.com', type: 'email' },
                                { key: 'fromName', label: 'Nombre remitente', placeholder: 'Soporte Hispanaweb', type: 'text' },
                            ].map(f => (
                                <div key={f.key}>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{f.label}</label>
                                    <input type={f.type} value={(smtp as any)[f.key] || ''} onChange={e => setSmtp(p => ({ ...p, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))} placeholder={f.placeholder} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                                </div>
                            ))}
                            <div className="flex gap-2 pt-2">
                                <button onClick={saveSmtp} disabled={savingSmtp} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${smtpSaved ? 'bg-emerald-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} disabled:opacity-50`}>
                                    {smtpSaved ? '✓ Guardado' : savingSmtp ? 'Guardando...' : 'Guardar configuración'}
                                </button>
                                <button onClick={async () => { setTestingEmail(true); try { await fetch('/api/tickets/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(smtp) }); alert('Email de prueba enviado'); } catch { alert('Error'); } setTestingEmail(false); }} disabled={testingEmail || !smtp.smtpHost} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50">
                                    <Mail className="w-4 h-4" />{testingEmail ? 'Enviando...' : 'Probar email'}
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            )}

            {/* ── NEW TICKET MODAL ─────────────────────────────────── */}
            {showNewTicket && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="font-semibold text-slate-800 dark:text-white">Nuevo ticket</h3>
                            <button onClick={() => setShowNewTicket(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5 text-slate-500" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Asunto *</label><input type="text" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Resume el problema brevemente" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" /></div>
                            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label><textarea rows={4} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe el problema con detalle..." className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none" /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Departamento</label><select value={form.departmentId} onChange={e => setForm(p => ({ ...p, departmentId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none"><option value="">Sin departamento</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Prioridad</label><select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none">{Object.entries(PRIORITY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre contacto</label><input type="text" value={form.contactName} onChange={e => setForm(p => ({ ...p, contactName: e.target.value }))} placeholder="Juan Pérez" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" /></div>
                                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email contacto</label><input type="email" value={form.contactEmail} onChange={e => setForm(p => ({ ...p, contactEmail: e.target.value }))} placeholder="juan@empresa.com" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" /></div>
                            </div>
                            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Canal de origen</label><select value={form.sourceChannel} onChange={e => setForm(p => ({ ...p, sourceChannel: e.target.value, sourceRef: '' }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none"><option value="manual">Manual</option><option value="email">Correo electrónico</option><option value="whatsapp">WhatsApp</option></select></div>
                        </div>
                        <div className="flex justify-end gap-2 p-6 border-t border-slate-200 dark:border-slate-800">
                            <button onClick={() => setShowNewTicket(false)} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm">Cancelar</button>
                            <button onClick={createTicket} disabled={!form.subject} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">Crear ticket</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
