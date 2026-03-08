'use client';
import { useState, useEffect } from 'react';
import { Building, Settings2, Save, Loader2, Link as LinkIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { insforge } from '@/lib/insforge';

type Client = { id: number; name: string };
type Integrations = {
    wp_url: string; wp_username: string; wp_app_password: string;
    meta_page_id: string; meta_access_token: string; meta_ig_account_id: string;
    gmb_location_id: string; gmb_access_token: string;
};

export default function IntegrationsSettings() {
    const [clients, setClients] = useState<Client[]>([]);
    const [activeClient, setActiveClient] = useState<number | null>(null);
    const [isClientMenuOpen, setIsClientMenuOpen] = useState(false);

    const [data, setData] = useState<Integrations>({
        wp_url: '', wp_username: '', wp_app_password: '',
        meta_page_id: '', meta_access_token: '', meta_ig_account_id: '',
        gmb_location_id: '', gmb_access_token: ''
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        const fetchClients = async () => {
            const { data } = await insforge.database.from('clients').select('id, name').order('name');
            if (data && data.length > 0) {
                setClients(data);
                setActiveClient(data[0].id);
            }
            setIsLoading(false);
        };
        fetchClients();
    }, []);

    useEffect(() => {
        const fetchIntegrations = async () => {
            if (!activeClient) return;
            setMessage(null);
            const { data: result } = await insforge.database
                .from('client_integrations')
                .select('*')
                .eq('client_id', activeClient)
                .single();

            if (result) {
                setData({
                    wp_url: result.wp_url || '', wp_username: result.wp_username || '', wp_app_password: result.wp_app_password || '',
                    meta_page_id: result.meta_page_id || '', meta_access_token: result.meta_access_token || '', meta_ig_account_id: result.meta_ig_account_id || '',
                    gmb_location_id: result.gmb_location_id || '', gmb_access_token: result.gmb_access_token || ''
                });
            } else {
                setData({
                    wp_url: '', wp_username: '', wp_app_password: '',
                    meta_page_id: '', meta_access_token: '', meta_ig_account_id: '',
                    gmb_location_id: '', gmb_access_token: ''
                });
            }
        };
        fetchIntegrations();
    }, [activeClient]);

    const handleSave = async () => {
        if (!activeClient) return;
        setIsSaving(true);
        setMessage(null);
        try {
            const { data: existing } = await insforge.database.from('client_integrations').select('id').eq('client_id', activeClient).single();
            if (existing) {
                await insforge.database.from('client_integrations').update({ ...data, updated_at: new Date() }).eq('client_id', activeClient);
            } else {
                await insforge.database.from('client_integrations').insert({ client_id: activeClient, ...data });
            }
            setMessage({ type: 'success', text: 'Integraciones guardadas correctamente.' });
        } catch (e) {
            setMessage({ type: 'error', text: 'Error al guardar las integraciones.' });
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-pink-500 animate-spin" /></div>;
    }

    const currentClient = clients.find(c => c.id === activeClient);

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0a0f1c] text-slate-900 dark:text-white relative overflow-hidden">
            <header className="h-24 border-b border-slate-200 dark:border-white/10 flex items-end px-8 pb-4 shrink-0 relative z-10 w-full">
                <div className="flex items-center space-x-6 w-full justify-between">
                    <div className="flex items-center space-x-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
                            <LinkIcon className="w-5 h-5" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Integraciones (Tokens)</h1>
                    </div>

                    {currentClient && (
                        <div className="relative">
                            <button onClick={() => setIsClientMenuOpen(!isClientMenuOpen)} className="flex items-center bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-white/10 transition-colors shadow-sm">
                                <Building className="w-4 h-4 mr-2 text-slate-400" />
                                <span>{currentClient.name}</span>
                            </button>
                            {isClientMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-[#1a2235] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-50 overflow-hidden py-1">
                                    {clients.map(client => (
                                        <button key={client.id} onClick={() => { setActiveClient(client.id); setIsClientMenuOpen(false); }} className={`w-full text-left px-4 py-3 flex items-center hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${activeClient === client.id ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {client.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 relative z-10">
                <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
                    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-8 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-lg font-bold">Credenciales de APIs Externas</h2>
                                <p className="text-sm text-slate-500">Configura los tokens estáticos u OAuth para la publicación directa desde el panel.</p>
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !activeClient}
                                className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center hover:shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                                Guardar Credenciales
                            </button>
                        </div>

                        {message && (
                            <div className={`mb-6 p-4 rounded-xl flex items-center space-x-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>
                                {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                <span className="text-sm font-medium">{message.text}</span>
                            </div>
                        )}

                        <div className="space-y-8">
                            {/* WordPress */}
                            <div className="p-6 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-xl space-y-4">
                                <h3 className="font-bold flex items-center"><Settings2 className="w-4 h-4 mr-2" /> WordPress (REST API)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-xs font-medium text-slate-500">URL del Sitio (ej: https://miweb.com)</label>
                                        <input type="url" value={data.wp_url} onChange={e => setData({ ...data, wp_url: e.target.value })} className="w-full bg-white dark:bg-[#0a0f1c] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" placeholder="https://..." />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-500">Usuario de Admin</label>
                                        <input type="text" value={data.wp_username} onChange={e => setData({ ...data, wp_username: e.target.value })} className="w-full bg-white dark:bg-[#0a0f1c] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-500">Contraseña de Aplicación (App Password)</label>
                                        <input type="password" value={data.wp_app_password} onChange={e => setData({ ...data, wp_app_password: e.target.value })} className="w-full bg-white dark:bg-[#0a0f1c] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" placeholder="xxxx xxxx xxxx xxxx xxxx xxxx" />
                                    </div>
                                </div>
                            </div>

                            {/* Meta */}
                            <div className="p-6 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-xl space-y-4">
                                <h3 className="font-bold flex items-center"><Settings2 className="w-4 h-4 mr-2" /> Meta (Facebook Page & Instagram)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-xs font-medium text-slate-500">Page Access Token (Long-Lived)</label>
                                        <input type="password" value={data.meta_access_token} onChange={e => setData({ ...data, meta_access_token: e.target.value })} className="w-full bg-white dark:bg-[#0a0f1c] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" placeholder="EAA..." />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-500">Page ID (Facebook)</label>
                                        <input type="text" value={data.meta_page_id} onChange={e => setData({ ...data, meta_page_id: e.target.value })} className="w-full bg-white dark:bg-[#0a0f1c] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-500">Instagram Account ID</label>
                                        <input type="text" value={data.meta_ig_account_id} onChange={e => setData({ ...data, meta_ig_account_id: e.target.value })} className="w-full bg-white dark:bg-[#0a0f1c] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" />
                                    </div>
                                </div>
                            </div>

                            {/* GMB */}
                            <div className="p-6 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-xl space-y-4">
                                <h3 className="font-bold flex items-center"><Settings2 className="w-4 h-4 mr-2" /> Google My Business</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-xs font-medium text-slate-500">GMB Access / Refresh Token</label>
                                        <input type="password" value={data.gmb_access_token} onChange={e => setData({ ...data, gmb_access_token: e.target.value })} className="w-full bg-white dark:bg-[#0a0f1c] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" placeholder="ya29..." />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-500">Location ID</label>
                                        <input type="text" value={data.gmb_location_id} onChange={e => setData({ ...data, gmb_location_id: e.target.value })} className="w-full bg-white dark:bg-[#0a0f1c] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
