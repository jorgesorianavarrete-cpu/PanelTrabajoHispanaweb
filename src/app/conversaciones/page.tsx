'use client';

import { useState, useEffect } from 'react';
import { PhoneIncoming, PhoneOutgoing, RefreshCw, Trash2, Search, ChevronLeft, ChevronRight, Copy, Check, Download, Phone, X, Key, Eye, EyeOff } from 'lucide-react';

interface VapiCall {
    id: string; vapi_call_id: string; type: 'inbound' | 'outbound'; status: string;
    phone_number: string; transcript: string | null; recording_url: string | null;
    summary: string | null; cost: number | null; created_at: string; notified_at: string | null;
}
interface Stats { configured: boolean; totalCalls: number; totalMinutes: number; totalCost: number; lastSync?: string; }

const STATUS_LABELS: Record<string, string> = { queued: 'En cola', ringing: 'Sonando', 'in-progress': 'En curso', forwarding: 'Transfiriendo', ended: 'Finalizada' };

export default function ConversacionesPage() {
    const [calls, setCalls] = useState<VapiCall[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [modal, setModal] = useState<VapiCall | null>(null);
    const [copied, setCopied] = useState(false);
    const [vapiKey, setVapiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [savingKey, setSavingKey] = useState(false);
    const [keySaved, setKeySaved] = useState(false);
    const [hasApiKey, setHasApiKey] = useState(false);

    const PER_PAGE = 10;

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setLoading(true);
        const [callsRes, statsRes, configRes] = await Promise.all([
            fetch('/api/vapi/calls').then(r => r.json()).catch(() => []),
            fetch('/api/vapi/stats').then(r => r.json()).catch(() => null),
            fetch('/api/vapi/config').then(r => r.json()).catch(() => ({ hasApiKey: false })),
        ]);
        setCalls(Array.isArray(callsRes) ? callsRes : []);
        setStats(statsRes);
        setHasApiKey(configRes.hasApiKey || false);
        setLoading(false);
    };

    const sync = async () => {
        setSyncing(true);
        await fetch('/api/vapi/sync', { method: 'POST' });
        await fetchAll();
        setSyncing(false);
    };

    const trash = async (vapiCallId: string) => {
        await fetch(`/api/vapi/calls/${vapiCallId}`, { method: 'DELETE' });
        setCalls(p => p.filter(c => c.vapi_call_id !== vapiCallId));
        setModal(null);
    };

    const bulkDelete = async () => {
        if (!selected.size || !confirm(`¿Eliminar ${selected.size} llamada(s)?`)) return;
        await fetch('/api/vapi/calls/bulk-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [...selected] }) });
        setCalls(p => p.filter(c => !selected.has(c.vapi_call_id)));
        setSelected(new Set());
    };

    const saveVapiKey = async () => {
        setSavingKey(true);
        await fetch('/api/vapi/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: vapiKey }) });
        setSavingKey(false); setKeySaved(true); setHasApiKey(true);
        setTimeout(() => setKeySaved(false), 2000);
    };

    const filtered = calls.filter(c => !search || c.phone_number?.includes(search) || c.summary?.toLowerCase().includes(search.toLowerCase()));
    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    const toggleSelect = (id: string) => {
        setSelected(p => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });
    };

    const copyTranscript = async (text: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(true); setTimeout(() => setCopied(false), 2000);
    };

    const statusBadge = (s: string) => {
        if (!s) return 'bg-slate-500/10 text-slate-400';
        const sl = s.toLowerCase();
        if (sl.includes('ended') || sl.includes('completed')) return 'bg-green-500/10 text-green-400';
        if (sl.includes('missed') || sl.includes('busy') || sl === 'queued') return 'bg-yellow-500/10 text-yellow-400';
        if (sl === 'in-progress') return 'bg-blue-500/10 text-blue-400';
        return 'bg-slate-500/10 text-slate-400';
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-[#0B1121] overflow-hidden">
            <header className="flex-none px-6 py-5 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20"><Phone className="w-5 h-5 text-white" /></div>
                        <div><h1 className="text-xl font-semibold text-slate-800 dark:text-white">Conversaciones</h1><p className="text-sm text-slate-500 dark:text-slate-400">Historial de llamadas IA · VAPI</p></div>
                    </div>
                    <div className="flex items-center gap-2">
                        {selected.size > 0 && (<button onClick={bulkDelete} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"><Trash2 className="w-4 h-4" />Eliminar {selected.size}</button>)}
                        <button onClick={sync} disabled={syncing} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"><RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />{syncing ? 'Sincronizando...' : 'Sincronizar'}</button>
                    </div>
                </div>

                {/* Stats */}
                {stats && hasApiKey && (
                    <div className="grid grid-cols-4 gap-3 mt-4">
                        {[
                            { label: 'Total llamadas', value: stats.totalCalls },
                            { label: 'Costo total', value: `$${stats.totalCost.toFixed(3)}` },
                            { label: 'Estado API', value: hasApiKey ? '✓ Configurada' : '✗ Sin key' },
                            { label: 'Última sync', value: stats.lastSync ? new Date(stats.lastSync).toLocaleDateString('es-ES') : '—' },
                        ].map(s => (
                            <div key={s.label} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3">
                                <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
                                <p className="font-semibold text-slate-800 dark:text-white mt-0.5">{s.value}</p>
                            </div>
                        ))}
                    </div>
                )}
            </header>

            <main className="flex-1 overflow-y-auto p-6">
                {/* VAPI Config */}
                {!hasApiKey && (
                    <div className="mb-6 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-400 flex items-center gap-2 mb-3"><Key className="w-4 h-4" />API Key de VAPI no configurada</p>
                        <div className="flex gap-2">
                            <div className="relative flex-1"><input type={showKey ? 'text' : 'password'} value={vapiKey} onChange={e => setVapiKey(e.target.value)} placeholder="Introduce tu API key de VAPI..." className="w-full px-3 py-2 pr-10 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40" /><button onClick={() => setShowKey(!showKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
                            <button onClick={saveVapiKey} disabled={savingKey || !vapiKey} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${keySaved ? 'bg-green-500 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'} disabled:opacity-50`}>{keySaved ? '✓ Guardada' : savingKey ? 'Guardando...' : 'Guardar'}</button>
                        </div>
                    </div>
                )}

                {/* Search */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar por número o resumen..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40" /></div>
                    <span className="text-sm text-slate-500 dark:text-slate-400">{filtered.length} resultado(s)</span>
                </div>

                {/* Calls list */}
                {loading ? (<div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" /></div>) :
                    filtered.length === 0 ? (<div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl"><Phone className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" /><p className="text-slate-500 dark:text-slate-400 font-medium">{search ? 'Sin resultados' : 'Sin llamadas — pulsa Sincronizar'}</p></div>) : (<>
                        <div className="space-y-2">
                            {paginated.map(call => (
                                <div key={call.id} onClick={() => setModal(call)} className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-violet-500/30 cursor-pointer transition-all group">
                                    <input type="checkbox" checked={selected.has(call.vapi_call_id)} onClick={e => { e.stopPropagation(); toggleSelect(call.vapi_call_id); }} className="w-4 h-4 rounded accent-violet-500 flex-none" />
                                    <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-none">
                                        {call.type === 'inbound' ? <PhoneIncoming className="w-4 h-4 text-emerald-400" /> : <PhoneOutgoing className="w-4 h-4 text-blue-400" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2"><p className="font-medium text-slate-800 dark:text-slate-200 text-sm">{call.phone_number || 'Número desconocido'}</p><span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusBadge(call.status)}`}>{STATUS_LABELS[call.status] || call.status || 'Desconocido'}</span></div>
                                        {call.summary && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{call.summary}</p>}
                                    </div>
                                    <div className="flex items-center gap-4 flex-none text-right">
                                        {call.cost != null && <span className="text-xs text-slate-400">${call.cost.toFixed(3)}</span>}
                                        <span className="text-xs text-slate-400">{new Date(call.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
                                        <button onClick={e => { e.stopPropagation(); trash(call.vapi_call_id); }} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-400 transition-all"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-3 mt-4">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"><ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" /></button>
                                <span className="text-sm text-slate-600 dark:text-slate-300">Página {page} de {totalPages}</span>
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"><ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" /></button>
                            </div>
                        )}
                    </>)}
            </main>

            {/* Detail Modal */}
            {modal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-start justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                            <div>
                                <div className="flex items-center gap-2 mb-1">{modal.type === 'inbound' ? <PhoneIncoming className="w-4 h-4 text-emerald-400" /> : <PhoneOutgoing className="w-4 h-4 text-blue-400" />}<h3 className="font-semibold text-slate-800 dark:text-white">{modal.phone_number || 'Número desconocido'}</h3><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(modal.status)}`}>{STATUS_LABELS[modal.status] || modal.status}</span></div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{new Date(modal.created_at).toLocaleString('es-ES')}</p>
                            </div>
                            <div className="flex items-center gap-2"><button onClick={() => trash(modal.vapi_call_id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button><button onClick={() => setModal(null)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X className="w-5 h-5 text-slate-500" /></button></div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"><p className="text-xs text-slate-500 dark:text-slate-400">Tipo</p><p className="font-medium text-slate-800 dark:text-white mt-1 text-sm">{modal.type === 'inbound' ? '📲 Entrante' : '📤 Saliente'}</p></div>
                                {modal.cost != null && <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"><p className="text-xs text-slate-500 dark:text-slate-400">Costo</p><p className="font-medium text-slate-800 dark:text-white mt-1 text-sm">${modal.cost.toFixed(4)}</p></div>}
                                {modal.notified_at && <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"><p className="text-xs text-slate-500 dark:text-slate-400">Email</p><p className="font-medium text-green-600 dark:text-green-400 mt-1 text-sm">✓ Enviado</p></div>}
                            </div>
                            {modal.summary && (<div><h4 className="text-sm font-semibold text-slate-800 dark:text-white mb-2">Resumen</h4><div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-500/5 border border-violet-200 dark:border-violet-500/20 text-sm text-slate-700 dark:text-slate-300">{modal.summary}</div></div>)}
                            {modal.recording_url && (<div><h4 className="text-sm font-semibold text-slate-800 dark:text-white mb-2">Grabación</h4><div className="flex items-center gap-3"><audio controls className="flex-1 rounded-lg" src={modal.recording_url} /><a href={modal.recording_url} download className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><Download className="w-4 h-4 text-slate-600 dark:text-slate-300" /></a></div></div>)}
                            {modal.transcript && (
                                <div>
                                    <div className="flex items-center justify-between mb-2"><h4 className="text-sm font-semibold text-slate-800 dark:text-white">Transcripción</h4><button onClick={() => copyTranscript(modal.transcript!)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${copied ? 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>{copied ? <><Check className="w-3 h-3" />Copiado</> : <><Copy className="w-3 h-3" />Copiar</>}</button></div>
                                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">{modal.transcript}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
