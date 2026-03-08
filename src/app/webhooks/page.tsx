'use client';

import { useState, useEffect, useCallback } from 'react';
import { insforge } from '@/lib/insforge';
import {
    Webhook, Workflow, Zap, Activity,
    Plus, CheckCircle2,
    XCircle, Copy, Search, RefreshCw, Code,
    ArrowRight, ShieldCheck, Database, Server,
    Key, EyeOff, Eye, Globe, X, Loader2
} from 'lucide-react';

type Log = { id: string; source: string; event: string; status_code: number; response_ms: number | null; created_at: string; };

export default function WebhooksApp() {
    const [activeTab, setActiveTab] = useState<'integrations' | 'vault' | 'logs'>('integrations');

    // Vault State
    const [credentials, setCredentials] = useState<any[]>([]);
    const [isLoadingVault, setIsLoadingVault] = useState(false);
    const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

    // Logs State
    const [logs, setLogs] = useState<Log[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [logSearch, setLogSearch] = useState('');

    // Add Credential Modal
    const [isAddCredOpen, setIsAddCredOpen] = useState(false);
    const [credForm, setCredForm] = useState({ service_name: '', url: '', username: '', password: '', client_id: '' });
    const [isSavingCred, setIsSavingCred] = useState(false);
    const [clients, setClients] = useState<any[]>([]);

    const [integrations, setIntegrations] = useState<any[]>([]);
    const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(false);

    const formatTimeAgo = (dateStr: string) => {
        const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
        if (secs < 60) return 'Hace unos segundos';
        if (secs < 3600) return `Hace ${Math.floor(secs / 60)} min`;
        if (secs < 86400) return `Hace ${Math.floor(secs / 3600)} horas`;
        return `Hace ${Math.floor(secs / 86400)} días`;
    };

    const fetchLogs = useCallback(async () => {
        setIsLoadingLogs(true);
        const { data } = await insforge.database
            .from('webhook_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        if (data) setLogs(data as Log[]);
        setIsLoadingLogs(false);
    }, []);

    const fetchIntegrations = useCallback(async () => {
        setIsLoadingIntegrations(true);
        const { data: integrationsData } = await insforge.database.from('webhook_integrations').select('*').order('name');
        const { data: logsData } = await insforge.database.from('webhook_logs').select('source');

        if (integrationsData) {
            const mapped = integrationsData.map(int => {
                const count = logsData?.filter(l => l.source.toLowerCase() === int.name.toLowerCase()).length || 0;
                return { ...int, events: count };
            });
            setIntegrations(mapped);
        }
        setIsLoadingIntegrations(false);
    }, []);

    useEffect(() => {
        if (activeTab === 'integrations') fetchIntegrations();
        if (activeTab === 'vault') fetchVault();
        if (activeTab === 'logs') fetchLogs();
    }, [activeTab, fetchLogs, fetchIntegrations]);

    const fetchVault = async () => {
        setIsLoadingVault(true);
        const [{ data: credsData }, { data: clientsData }] = await Promise.all([
            insforge.database
                .from('client_credentials')
                .select('*, clients ( name, color, logo_url )')
                .order('created_at', { ascending: false }),
            insforge.database.from('clients').select('id, name').order('name')
        ]);
        if (credsData) setCredentials(credsData);
        if (clientsData) setClients(clientsData);
        setIsLoadingVault(false);
    };

    const handleSaveCredential = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!credForm.service_name || !credForm.username || !credForm.password) return;
        setIsSavingCred(true);
        const payload: any = {
            service_name: credForm.service_name,
            url: credForm.url || null,
            username: credForm.username,
            password: credForm.password,
        };
        if (credForm.client_id) payload.client_id = parseInt(credForm.client_id);
        const { error } = await insforge.database.from('client_credentials').insert([payload]);
        if (!error) {
            setIsAddCredOpen(false);
            setCredForm({ service_name: '', url: '', username: '', password: '', client_id: '' });
            await fetchVault();
        } else {
            alert('Error al guardar: ' + error.message);
        }
        setIsSavingCred(false);
    };

    const handleDeleteCredential = async (id: string) => {
        if (!confirm('\u00bfEliminar esta credencial?')) return;
        const { error } = await insforge.database.from('client_credentials').delete().eq('id', id);
        if (!error) setCredentials(prev => prev.filter(c => c.id !== id));
    };

    const togglePassword = (id: string) => {
        setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const filteredLogs = logSearch
        ? logs.filter(l =>
            l.id.toLowerCase().includes(logSearch.toLowerCase()) ||
            l.source.toLowerCase().includes(logSearch.toLowerCase()) ||
            l.event.toLowerCase().includes(logSearch.toLowerCase()))
        : logs;

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-[#0a0f1c] transition-colors relative">
            {/* Background aesthetics */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-purple-500/10 via-indigo-500/5 to-transparent blur-3xl rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-fuchsia-500/10 via-rose-500/5 to-transparent blur-3xl rounded-full pointer-events-none" />

            {/* Header Tipo Tickets */}
            <header className="flex-none px-6 py-4 border-b border-slate-200 dark:border-slate-800 relative z-10 w-full transition-colors">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Webhook className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Conexiones API</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Gestiona Webhooks, flujos de Zapier/Make y accesos a la API.</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-1 relative z-10">
                    {[
                        { id: 'integrations', icon: Workflow, label: 'Integraciones' },
                        { id: 'vault', icon: Key, label: 'Bóveda Clientes' },
                        { id: 'logs', icon: Activity, label: 'Registro de Eventos' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* Main Container */}
            <div className="flex-1 overflow-y-auto p-8 relative z-10">
                <div className="max-w-6xl mx-auto space-y-8">

                    {/* Tab 1: Integraciones (Zapier/Make) */}
                    {activeTab === 'integrations' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">

                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Canales Conectados</h2>
                                    <p className="text-sm text-slate-500 mt-1">Sincroniza el panel con aplicaciones de terceros mediante no-code.</p>
                                </div>
                                <button className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-xl font-medium flex items-center hover:shadow-lg transition-all hover:-translate-y-0.5">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Conectar Nueva App
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {integrations.map((app, i) => (
                                    <div key={i} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-md dark:shadow-none hover:border-purple-500/30 transition-all group relative overflow-hidden">
                                        {/* Decorative App Color Glow */}
                                        <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity ${app.bg}`} />

                                        <div className="flex justify-between items-start mb-6 relative z-10">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${app.bg} ${app.color} ${app.border} border`}>
                                                {app.name === 'Zapier' ? <Zap className="w-6 h-6 fill-current" /> :
                                                    app.name === 'Make (Integromat)' ? <Workflow className="w-6 h-6" /> :
                                                        app.name === 'Stripe' ? <Database className="w-6 h-6" /> :
                                                            <Server className="w-6 h-6" />}
                                            </div>
                                            <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border ${app.status === 'connected'
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                                                : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10'
                                                }`}>
                                                {app.status === 'connected' ? 'Conectado' : 'Inactivo'}
                                            </span>
                                        </div>

                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 relative z-10">{app.name}</h3>

                                        {app.status === 'connected' ? (
                                            <div className="flex items-center text-sm font-medium text-slate-500 mb-6 relative z-10">
                                                <Activity className="w-4 h-4 mr-1.5 text-purple-500" />
                                                {app.events.toLocaleString()} eventos procesados
                                            </div>
                                        ) : (
                                            <div className="text-sm font-medium text-slate-400 mb-6 relative z-10">
                                                Requiere configuración
                                            </div>
                                        )}

                                        <div className="pt-4 border-t border-slate-100 dark:border-white/10 flex justify-between items-center relative z-10">
                                            <button className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">Configurar</button>
                                            <button className={`text-sm font-semibold flex items-center transition-colors ${app.status === 'connected'
                                                ? 'text-rose-500 hover:text-rose-600'
                                                : 'text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300'
                                                }`}>
                                                {app.status === 'connected' ? 'Desconectar' : 'Vincular cuenta'} <ArrowRight className="w-4 h-4 ml-1" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* API Keys Banner */}
                            <div className="mt-8 bg-slate-900 dark:bg-white/5 border border-slate-800 dark:border-white/10 rounded-2xl p-6 md:p-8 text-white flex flex-col md:flex-row items-center justify-between shadow-xl relative overflow-hidden group">
                                <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/20 blur-3xl rounded-full group-hover:bg-indigo-500/30 transition-colors" />
                                <div className="relative z-10 flex items-center space-x-6 mb-4 md:mb-0">
                                    <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                                        <Code className="w-8 h-8 text-indigo-300" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold mb-1 flex items-center">
                                            API Tokens <ShieldCheck className="w-5 h-5 ml-2 text-emerald-400" />
                                        </h3>
                                        <p className="text-sm text-slate-400 max-w-md">Tus credenciales para acceso directo y programático a la plataforma Hispanaweb.</p>
                                    </div>
                                </div>
                                <div className="relative z-10 w-full md:w-auto flex flex-col space-y-3">
                                    <div className="flex bg-black/40 border border-white/10 rounded-xl p-1 items-center">
                                        <input type="password" value="hw_live_pk_................" readOnly className="bg-transparent text-sm font-mono text-slate-300 px-3 w-48 focus:outline-none" />
                                        <button
                                            onClick={() => copyToClipboard('hw_live_pk_................')}
                                            className="p-2 hover:bg-white/10 rounded-lg text-slate-300 transition-colors" title="Copiar Token">
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <button className="text-sm font-medium text-indigo-400 hover:text-indigo-300 text-right">Generar nuevo token</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Logs */}
                    {activeTab === 'logs' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[700px]">
                            <div className="p-5 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-transparent">
                                <div className="flex items-center space-x-4">
                                    <h2 className="font-bold text-slate-900 dark:text-white flex items-center text-lg">
                                        <Activity className="w-5 h-5 mr-2 text-purple-500" />
                                        Registro de Eventos API
                                    </h2>
                                    <div className="flex items-center px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-full text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                                        {logs.length} eventos
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={logSearch}
                                            onChange={(e) => setLogSearch(e.target.value)}
                                            placeholder="Buscar evento o fuente..."
                                            className="w-48 bg-white dark:bg-[#0a0f1c] border border-slate-200 dark:border-white/10 rounded-lg py-1.5 pl-9 pr-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                        />
                                    </div>
                                    <button onClick={fetchLogs} title="Recargar" className="p-2 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 transition-colors">
                                        <RefreshCw className={`w-4 h-4 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto w-full">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/10 sticky top-0 z-10">
                                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">ID Evento</th>
                                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Origen</th>
                                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acción (Payload)</th>
                                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Tiempo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {isLoadingLogs ? (
                                            <tr><td colSpan={5} className="py-16 text-center"><div className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mx-auto" /></td></tr>
                                        ) : filteredLogs.length === 0 ? (
                                            <tr><td colSpan={5} className="py-12 text-center text-sm text-slate-500">No hay eventos registrados.</td></tr>
                                        ) : filteredLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group cursor-pointer">
                                                <td className="px-6 py-4">
                                                    {log.status_code < 400 ? (
                                                        <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium text-sm">
                                                            <CheckCircle2 className="w-4 h-4 mr-1.5" /> {log.status_code} OK
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center text-rose-600 dark:text-rose-400 font-medium text-sm">
                                                            <XCircle className="w-4 h-4 mr-1.5" /> {log.status_code} ERR
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <code className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded truncate block max-w-[150px]">{log.id.substring(0, 18)}...</code>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-semibold text-sm text-slate-900 dark:text-white">{log.source}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-[#0a0f1c] border border-slate-200 dark:border-white/10 px-2 py-1 rounded-md font-mono text-xs inline-block">
                                                        {log.event}
                                                    </span>
                                                    {log.response_ms && <span className="ml-2 text-[10px] text-slate-400">{log.response_ms}ms</span>}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-sm font-medium text-slate-500">{formatTimeAgo(log.created_at)}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Vault */}
                    {activeTab === 'vault' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Bóveda de Credenciales</h2>
                                    <p className="text-sm text-slate-500 mt-1">Almacenamiento seguro de accesos a paneles, webs y CMS de clientes.</p>
                                </div>
                                <button
                                    onClick={() => setIsAddCredOpen(true)}
                                    className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-xl font-medium flex items-center hover:shadow-lg transition-all hover:-translate-y-0.5">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Añadir Credencial
                                </button>
                            </div>

                            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                                {isLoadingVault ? (
                                    <div className="flex justify-center items-center py-20">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                                    </div>
                                ) : credentials.length === 0 ? (
                                    <div className="text-center py-20">
                                        <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Key className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No tienes accesos guardados</h3>
                                        <p className="text-slate-500">Guarda aquí los accesos a los WordPress de tus clientes para hacer 1-click login.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto w-full">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/10">
                                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Servicio</th>
                                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuario / Email</th>
                                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contraseña</th>
                                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                                {credentials.map((cred) => (
                                                    <tr key={cred.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center space-x-3">
                                                                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center border border-slate-200 dark:border-white/5">
                                                                    <Globe className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                                                                </div>
                                                                <div>
                                                                    <span className="font-semibold text-sm text-slate-900 dark:text-white block">{cred.service_name}</span>
                                                                    <a href={cred.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 dark:text-indigo-400 hover:underline flex items-center mt-0.5">
                                                                        {cred.url?.replace(/https?:\/\//, '').split('/')[0]}
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {cred.clients ? (
                                                                <div className="flex items-center pl-2 border-l-2" style={{ borderColor: cred.clients.color || '#cbd5e1' }}>
                                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-2">{cred.clients.name}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-sm text-slate-400 italic">No asignado</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center">
                                                                <span className="text-sm text-slate-700 dark:text-slate-300 font-mono tracking-tight mr-2">{cred.username}</span>
                                                                <button onClick={() => copyToClipboard(cred.username)} className="text-slate-400 hover:text-indigo-500 transition-colors" title="Copiar Usuario">
                                                                    <Copy className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center">
                                                                <span className="text-sm text-slate-700 dark:text-slate-300 font-mono tracking-widest mr-3">
                                                                    {visiblePasswords[cred.id] ? cred.password : '••••••••••••'}
                                                                </span>
                                                                <div className="flex items-center space-x-1">
                                                                    <button onClick={() => togglePassword(cred.id)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors p-1" title="Ver contraseña">
                                                                        {visiblePasswords[cred.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                                    </button>
                                                                    <button onClick={() => copyToClipboard(cred.password)} className="text-slate-400 hover:text-indigo-500 transition-colors p-1" title="Copiar Contraseña">
                                                                        <Copy className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <a href={cred.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 text-xs font-semibold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
                                                                    Login Auto <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                                                                </a>
                                                                <button onClick={() => handleDeleteCredential(cred.id)} title="Eliminar" className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors">
                                                                    <XCircle className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Add Credential Modal */}
            {isAddCredOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsAddCredOpen(false)}>
                    <div className="bg-white dark:bg-[#1a2235] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/10">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                                <Key className="w-5 h-5 mr-2 text-indigo-500" /> Añadir Credencial
                            </h2>
                            <button onClick={() => setIsAddCredOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 transition-colors"><X className="w-4 h-4" /></button>
                        </div>
                        <form onSubmit={handleSaveCredential} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Servicio *</label>
                                    <input required value={credForm.service_name} onChange={e => setCredForm(p => ({ ...p, service_name: e.target.value }))} placeholder="Ej: WordPress" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Cliente</label>
                                    <select value={credForm.client_id} onChange={e => setCredForm(p => ({ ...p, client_id: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                                        <option value="">Sin asignar</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">URL del servicio</label>
                                <input type="url" value={credForm.url} onChange={e => setCredForm(p => ({ ...p, url: e.target.value }))} placeholder="https://cliente.com/wp-admin" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Usuario / Email *</label>
                                    <input required value={credForm.username} onChange={e => setCredForm(p => ({ ...p, username: e.target.value }))} placeholder="admin" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Contraseña *</label>
                                    <input required type="password" value={credForm.password} onChange={e => setCredForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 pt-2">
                                <button type="button" onClick={() => setIsAddCredOpen(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">Cancelar</button>
                                <button type="submit" disabled={isSavingCred} className="px-6 py-2 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center disabled:opacity-60">
                                    {isSavingCred ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2" /> : <Key className="w-4 h-4 mr-2" />}
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
