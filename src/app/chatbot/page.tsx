'use client';

import { useState, useEffect, useRef } from 'react';
import { Bot, BookOpen, Code, Save, Plus, Trash2, Edit, ToggleLeft, ToggleRight, Send, RefreshCw, Copy, Check, Upload, Settings, X } from 'lucide-react';

type Tab = 'config' | 'knowledge' | 'embed';
const ORG_ID = 'default';
interface Doc { id: string; title: string; content: string; category: string; is_active: boolean; }
interface Msg { role: 'user' | 'assistant'; content: string; }

export default function ChatbotPage() {
    const [tab, setTab] = useState<Tab>('config');
    const [config, setConfig] = useState<any>({ bot_name: 'Asistente', bot_color: '#6366f1', web_widget_enabled: true, llm_provider: 'openai', llm_model: 'gpt-4o-mini', temperature: 0.7, system_prompt: '' });
    const [docs, setDocs] = useState<Doc[]>([]);
    const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false);
    const [messages, setMessages] = useState<Msg[]>([]); const [chatInput, setChatInput] = useState(''); const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const [docModal, setDocModal] = useState<{ open: boolean; editing: Doc | null }>({ open: false, editing: null });
    const [docForm, setDocForm] = useState({ title: '', content: '', category: '' });
    const [docSaving, setDocSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => { fetchConfig(); fetchDocs(); }, []);
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const fetchConfig = async () => { const r = await fetch(`/api/chatbot/config/${ORG_ID}`); if (r.ok) setConfig(await r.json()); };
    const fetchDocs = async () => { const r = await fetch(`/api/chatbot/agency-kb/${ORG_ID}`); if (r.ok) setDocs(await r.json()); };
    const saveConfig = async () => { setSaving(true); await fetch(`/api/chatbot/config/${ORG_ID}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) }); setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000); };
    const sendChat = async () => {
        if (!chatInput.trim()) return;
        const msg = chatInput; setMessages(p => [...p, { role: 'user', content: msg }]); setChatInput(''); setChatLoading(true);
        try { const r = await fetch('/api/chatbot/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg, organizationId: ORG_ID }) }); const d = await r.json(); setMessages(p => [...p, { role: 'assistant', content: d.response || d.error || '...' }]); } catch { setMessages(p => [...p, { role: 'assistant', content: 'Error de conexión.' }]); }
        setChatLoading(false);
    };
    const openDocModal = (doc?: Doc) => { setDocForm(doc ? { title: doc.title, content: doc.content, category: doc.category } : { title: '', content: '', category: '' }); setDocModal({ open: true, editing: doc || null }); };
    const saveDoc = async () => { setDocSaving(true); if (docModal.editing) { await fetch(`/api/chatbot/agency-kb/${ORG_ID}/${docModal.editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(docForm) }); } else { await fetch(`/api/chatbot/agency-kb/${ORG_ID}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(docForm) }); } await fetchDocs(); setDocModal({ open: false, editing: null }); setDocSaving(false); };
    const deleteDoc = async (id: string) => { if (!confirm('¿Eliminar?')) return; await fetch(`/api/chatbot/agency-kb/${ORG_ID}/${id}`, { method: 'DELETE' }); setDocs(p => p.filter(d => d.id !== id)); };
    const toggleDoc = async (doc: Doc) => { await fetch(`/api/chatbot/agency-kb/${ORG_ID}/${doc.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !doc.is_active }) }); setDocs(p => p.map(d => d.id === doc.id ? { ...d, is_active: !d.is_active } : d)); };
    const reindex = async () => { await fetch(`/api/chatbot/reindex/${ORG_ID}`, { method: 'POST' }); alert('Reindexado correctamente.'); };
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; const text = await f.text(); setDocForm({ title: f.name.replace(/\.(pdf|txt)$/i, ''), content: text, category: 'Documento' }); setDocModal({ open: true, editing: null }); };
    const copyEmbed = async () => { await navigator.clipboard.writeText(embedSnippet); setCopied(true); setTimeout(() => setCopied(false), 2000); };
    const embedSnippet = `<script>\n  (function(){\n    var s=document.createElement('script');\n    s.src='https://c6yjw3du.insforge.site/chatbot-widget.js';\n    s.setAttribute('data-agency-id','${ORG_ID}');\n    document.body.appendChild(s);\n  })();\n<\/script>`;
    const TABS = [{ id: 'config', label: 'Configuración', icon: Settings }, { id: 'knowledge', label: 'Base de conocimiento', icon: BookOpen }, { id: 'embed', label: 'Integrar en web', icon: Code }] as const;

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-[#0B1121] overflow-hidden">
            <header className="flex-none px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Chatbot IA</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Asistente configurable con base de conocimiento</p>
                        </div>
                    </div>
                </div>
                <div className="flex gap-1">
                    {TABS.map(t => {
                        const Icon = t.icon;
                        return (
                            <button key={t.id} onClick={() => setTab(t.id as Tab)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                <Icon className="w-4 h-4" />{t.label}
                            </button>
                        );
                    })}
                </div>
            </header>
            <main className="flex-1 overflow-y-auto p-6">
                {tab === 'config' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
                        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                            <h2 className="font-semibold text-slate-800 dark:text-white mb-4">Ajustes del Bot</h2>
                            <div className="space-y-4">
                                <div><label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Nombre</label><input type="text" value={config.bot_name || ''} onChange={e => setConfig({ ...config, bot_name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" /></div>
                                <div><label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Color</label><div className="flex items-center gap-3"><input type="color" value={config.bot_color || '#6366f1'} onChange={e => setConfig({ ...config, bot_color: e.target.value })} className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer" /><span className="text-sm text-slate-500 font-mono">{config.bot_color}</span></div></div>
                                <div className="flex items-center justify-between"><div><p className="text-sm font-medium text-slate-700 dark:text-slate-300">Widget web activo</p></div><button onClick={() => setConfig({ ...config, web_widget_enabled: !config.web_widget_enabled })}>{config.web_widget_enabled ? <ToggleRight className="w-8 h-8 text-indigo-500" /> : <ToggleLeft className="w-8 h-8 text-slate-400" />}</button></div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                            <h2 className="font-semibold text-slate-800 dark:text-white mb-4">Configuración LLM</h2>
                            <div className="space-y-4">
                                <div><label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Proveedor</label><select value={config.llm_provider || 'openai'} onChange={e => setConfig({ ...config, llm_provider: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"><option value="openai">OpenAI</option><option value="gemini">Google Gemini</option><option value="anthropic">Anthropic</option></select></div>
                                <div><label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Modelo</label><input type="text" value={config.llm_model || ''} onChange={e => setConfig({ ...config, llm_model: e.target.value })} placeholder="gpt-4o-mini" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" /></div>
                                <div><label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Temperatura: <span className="text-indigo-500 font-semibold">{(config.temperature || 0.7).toFixed(1)}</span></label><input type="range" min="0" max="1" step="0.1" value={config.temperature || 0.7} onChange={e => setConfig({ ...config, temperature: parseFloat(e.target.value) })} className="w-full accent-indigo-500" /></div>
                                <div><label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">System Prompt</label><textarea rows={4} value={config.system_prompt || ''} onChange={e => setConfig({ ...config, system_prompt: e.target.value })} placeholder="Instrucciones personalizadas..." className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none" /></div>
                            </div>
                        </div>
                        <div className="lg:col-span-2"><button onClick={saveConfig} disabled={saving} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-medium text-sm transition-all ${saved ? 'bg-green-500' : 'bg-indigo-600 hover:bg-indigo-700'} disabled:opacity-50`}>{saved ? <><Check className="w-4 h-4" />Guardado</> : saving ? <><RefreshCw className="w-4 h-4 animate-spin" />Guardando...</> : <><Save className="w-4 h-4" />Guardar configuración</>}</button></div>
                        <div className="lg:col-span-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                            <h2 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Bot className="w-4 h-4 text-indigo-400" />Panel de prueba</h2>
                            <div className="h-56 overflow-y-auto mb-4 space-y-3 pr-1">
                                {messages.length === 0 && <p className="text-sm text-slate-400 text-center pt-8">Envía un mensaje para probar el chatbot</p>}
                                {messages.map((m, i) => (<div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-bl-sm'}`}>{m.content}</div></div>))}
                                {chatLoading && <div className="flex justify-start"><div className="bg-slate-100 dark:bg-slate-800 px-4 py-2.5 rounded-2xl rounded-bl-sm"><div className="flex gap-1"><span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" /><span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.1s]" /><span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" /></div></div></div>}
                                <div ref={chatEndRef} />
                            </div>
                            <div className="flex gap-2"><input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Mensaje de prueba..." disabled={chatLoading} className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" /><button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"><Send className="w-4 h-4" /></button></div>
                        </div>
                    </div>
                )}
                {tab === 'knowledge' && (
                    <div className="max-w-4xl">
                        <div className="flex items-center justify-between mb-6">
                            <div><h2 className="font-semibold text-slate-800 dark:text-white">Base de conocimiento</h2><p className="text-sm text-slate-500 dark:text-slate-400">{docs.length} documentos</p></div>
                            <div className="flex gap-2">
                                <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><Upload className="w-4 h-4" />Subir archivo<input type="file" accept=".txt,.pdf" className="hidden" onChange={handleUpload} /></label>
                                <button onClick={reindex} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><RefreshCw className="w-4 h-4" />Reindexar</button>
                                <button onClick={() => openDocModal()} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"><Plus className="w-4 h-4" />Nuevo documento</button>
                            </div>
                        </div>
                        {docs.length === 0 ? (<div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl"><BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" /><p className="text-slate-500 dark:text-slate-400 font-medium">Sin documentos</p></div>) : (
                            <div className="space-y-3">{docs.map(doc => (<div key={doc.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${doc.is_active ? 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800' : 'bg-slate-50 dark:bg-slate-900/20 border-slate-100 dark:border-slate-900 opacity-60'}`}><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><p className="font-medium text-slate-800 dark:text-slate-200 text-sm truncate">{doc.title}</p>{doc.category && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">{doc.category}</span>}</div><p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{doc.content?.substring(0, 120)}...</p></div><div className="flex items-center gap-1 flex-none"><button onClick={() => toggleDoc(doc)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">{doc.is_active ? <ToggleRight className="w-5 h-5 text-indigo-500" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}</button><button onClick={() => openDocModal(doc)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"><Edit className="w-4 h-4" /></button><button onClick={() => deleteDoc(doc.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-red-400"><Trash2 className="w-4 h-4" /></button></div></div>))}</div>
                        )}
                    </div>
                )}
                {tab === 'embed' && (
                    <div className="max-w-3xl space-y-6">
                        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-3"><h2 className="font-semibold text-slate-800 dark:text-white">Widget embebible</h2><button onClick={copyEmbed} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${copied ? 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>{copied ? <><Check className="w-4 h-4" />Copiado</> : <><Copy className="w-4 h-4" />Copiar</>}</button></div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Inserta antes del cierre <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">&lt;/body&gt;</code>:</p>
                            <pre className="bg-slate-900 text-emerald-400 text-xs rounded-xl p-4 overflow-x-auto font-mono whitespace-pre">{embedSnippet}</pre>
                        </div>
                        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                            <h2 className="font-semibold text-slate-800 dark:text-white mb-3">API Endpoint</h2>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2"><span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold">POST</span><code className="text-sm font-mono text-slate-700 dark:text-slate-300 break-all">https://c6yjw3du.insforge.site/api/chatbot/message/default</code></div>
                                <pre className="bg-slate-900 text-slate-300 text-xs rounded-xl p-4 font-mono overflow-x-auto">{`{ "message": "...", "channel": "web", "sessionId": "abc123" }`}</pre>
                            </div>
                        </div>
                    </div>
                )}
            </main>
            {docModal.open && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800"><h3 className="font-semibold text-slate-800 dark:text-white">{docModal.editing ? 'Editar documento' : 'Nuevo documento'}</h3><button onClick={() => setDocModal({ open: false, editing: null })} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5 text-slate-500" /></button></div>
                        <div className="p-6 space-y-4">
                            <div><label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Título</label><input type="text" value={docForm.title} onChange={e => setDocForm({ ...docForm, title: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" /></div>
                            <div><label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Categoría</label><input type="text" value={docForm.category} onChange={e => setDocForm({ ...docForm, category: e.target.value })} placeholder="FAQ, Servicios..." className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" /></div>
                            <div><label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Contenido</label><textarea rows={6} value={docForm.content} onChange={e => setDocForm({ ...docForm, content: e.target.value })} placeholder="Contenido del documento..." className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none" /></div>
                        </div>
                        <div className="flex justify-end gap-2 px-6 pb-6"><button onClick={() => setDocModal({ open: false, editing: null })} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancelar</button><button onClick={saveDoc} disabled={docSaving || !docForm.title} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">{docSaving ? 'Guardando...' : docModal.editing ? 'Actualizar' : 'Crear'}</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
