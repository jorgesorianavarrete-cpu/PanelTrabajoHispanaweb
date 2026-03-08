'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit3, Save, X, Bot, Zap, Clock, PlayCircle, Send } from 'lucide-react';
import { useUser } from '@insforge/nextjs';

export function MailAutomationsTab() {
    const { user } = useUser();
    const [rules, setRules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const defaultForm = {
        name: '', description: '', pattern_type: 'subject', pattern_match: 'contains', pattern_value: '',
        response_subject: '', response_body: '', use_ai: false, ai_prompt_template: '', ai_tone: 'professional',
        ai_language: 'es', send_via_email: true, send_via_whatsapp: false, whatsapp_number: '', delay_minutes: 0,
        is_active: true
    };
    const [form, setForm] = useState(defaultForm);

    const loadRules = useCallback(async () => {
        try {
            const res = await fetch('/api/mail-automations');
            if (res.ok) {
                setRules(await res.json());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadRules(); }, [loadRules]);

    const handleSave = async () => {
        if (!form.name || !form.pattern_value || !form.response_body) return alert("Faltan campos (nombre, valor a buscar, cuerpo respuesta).");
        setIsSaving(true);
        try {
            const url = editingId === 'new' ? '/api/mail-automations' : `/api/mail-automations/${editingId}`;
            const method = editingId === 'new' ? 'POST' : 'PATCH';
            const res = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                await loadRules();
                setEditingId(null);
            } else {
                alert("Error al guardar.");
            }
        } catch (e) { console.error(e); }
        finally { setIsSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Eliminar automatización?')) return;
        try {
            await fetch(`/api/mail-automations/${id}`, { method: 'DELETE' });
            setRules(rules.filter(r => r.id !== id));
        } catch (e) { console.error(e); }
    };

    const handleToggle = async (id: string, current: boolean) => {
        try {
            setRules(rules.map(r => r.id === id ? { ...r, is_active: !current } : r));
            await fetch(`/api/mail-automations/${id}/toggle`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !current })
            });
        } catch (e) { console.error(e); }
    };

    return (
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-[#0B1121]">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Zap className="w-5 h-5 text-amber-500" />
                            Reglas y Automatizaciones
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Responde o gestiona correos automáticamente basados en patrones e Inteligencia Artificial.</p>
                    </div>
                    <button onClick={() => { setEditingId('new'); setForm(defaultForm); }}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all">
                        <Plus className="w-4 h-4" /> Nueva regla
                    </button>
                </div>

                {editingId && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-8 shadow-sm animate-in fade-in slide-in-from-top-4">
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="font-semibold text-lg">{editingId === 'new' ? 'Crear' : 'Editar'} automatización</h3>
                            <button onClick={() => setEditingId(null)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-4 h-4 text-slate-500" /></button>
                        </div>
                        <div className="space-y-6">
                            {/* Información general */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium mb-1">Nombre</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" placeholder="Ej. Respuestas de soporte" /></div>
                                <div><label className="block text-sm font-medium mb-1">Descripción</label><input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" placeholder="Qué hace esta regla" /></div>
                            </div>

                            {/* Condición */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl space-y-4">
                                <h4 className="font-medium flex items-center gap-2 text-indigo-600 dark:text-indigo-400"><PlayCircle className="w-4 h-4" /> CUANDO reciba un correo...</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <select value={form.pattern_type} onChange={e => setForm({ ...form, pattern_type: e.target.value })} className="px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700">
                                        <option value="subject">Donde el asunto</option><option value="sender">Donde el remitente</option><option value="body">Donde el mensaje</option><option value="any">En cualquier campo</option>
                                    </select>
                                    <select value={form.pattern_match} onChange={e => setForm({ ...form, pattern_match: e.target.value })} className="px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700">
                                        <option value="contains">contenga</option><option value="equals">sea igual a</option><option value="starts_with">empiece con</option><option value="regex">coincida (Regex)</option>
                                    </select>
                                    <input type="text" value={form.pattern_value} onChange={e => setForm({ ...form, pattern_value: e.target.value })} className="px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" placeholder="Ej. Urgente" />
                                </div>
                            </div>

                            {/* Acción */}
                            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl space-y-4">
                                <h4 className="font-medium flex items-center gap-2 text-blue-600 dark:text-blue-400"><Send className="w-4 h-4" /> HAZ lo siguiente...</h4>

                                <div className="flex items-center gap-4 mb-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={form.use_ai} onChange={e => setForm({ ...form, use_ai: e.target.checked })} className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" />
                                        <span className="text-sm font-medium flex items-center gap-1"><Bot className="w-4 h-4 text-violet-500" /> Generar repuesta usando Inteligencia Artificial</span>
                                    </label>
                                </div>

                                {form.use_ai ? (
                                    <div className="space-y-4 animate-in fade-in fill-mode-forwards">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="block text-sm font-medium mb-1">Tono de voz</label><select value={form.ai_tone} onChange={e => setForm({ ...form, ai_tone: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"><option value="professional">Profesional</option><option value="friendly">Amigable</option><option value="formal">Formal</option><option value="casual">Cercano (Casual)</option></select></div>
                                            <div><label className="block text-sm font-medium mb-1">Idioma de destino</label><select value={form.ai_language} onChange={e => setForm({ ...form, ai_language: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"><option value="es">Español</option><option value="en">Inglés</option><option value="ca">Catalán</option></select></div>
                                        </div>
                                        <div><label className="block text-sm font-medium mb-1">Reglas adicionales (Prompt)</label><textarea rows={3} value={form.ai_prompt_template} onChange={e => setForm({ ...form, ai_prompt_template: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" placeholder="Ej. Agradece siempre al cliente y menciónalos por su nombre..." /></div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div><label className="block text-sm font-medium mb-1">Asunto de respuesta</label><input type="text" value={form.response_subject} onChange={e => setForm({ ...form, response_subject: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" placeholder="Re: Su consulta" /></div>
                                        <div><label className="block text-sm font-medium mb-1">Cuerpo de respuesta</label><textarea rows={4} value={form.response_body} onChange={e => setForm({ ...form, response_body: e.target.value })} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" placeholder="Hola, hemos recibido su correo..." /></div>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-blue-100 dark:border-blue-900/30">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Canales de respuesta</label>
                                            <div className="flex gap-4">
                                                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.send_via_email} onChange={e => setForm({ ...form, send_via_email: e.target.checked })} /> Email (Respuesta normal)</label>
                                                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.send_via_whatsapp} onChange={e => setForm({ ...form, send_via_whatsapp: e.target.checked })} /> Alerta WhatsApp</label>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Retrasar envío (minutos)</label>
                                            <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" /><input type="number" min="0" value={form.delay_minutes} onChange={e => setForm({ ...form, delay_minutes: parseInt(e.target.value) || 0 })} className="w-24 px-3 py-1.5 border rounded-lg dark:bg-slate-800 dark:border-slate-700" /> <span className="text-xs text-slate-500">0 = Inmediato</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button onClick={() => setEditingId(null)} className="px-4 py-2 border rounded-xl hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 font-medium">Cancelar</button>
                                <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center gap-2">
                                    {isSaving ? 'Guardando...' : <><Save className="w-4 h-4" /> Guardar</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Listado de reglas */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-12 text-slate-500">Cargando...</div>
                    ) : rules.length === 0 ? (
                        <div className="text-center py-16 bg-white dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
                            <Bot className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-slate-600 dark:text-slate-300 font-medium mb-1">No hay reglas configuradas</h3>
                            <p className="text-sm text-slate-500 max-w-sm mx-auto">Crea una regla para responder correos que contengan palabras específicas o provengan de un remitente importante.</p>
                        </div>
                    ) : (
                        rules.map(r => (
                            <div key={r.id} className={`flex items-start gap-4 p-5 rounded-2xl border transition-colors ${r.is_active ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm' : 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800/50 opacity-75'}`}>
                                <button onClick={() => handleToggle(r.id, r.is_active)} className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 shrink-0 mt-1 ${r.is_active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${r.is_active ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-slate-800 dark:text-white truncate">{r.name}</h4>
                                        {r.use_ai && <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold tracking-wide flex items-center gap-1"><Bot className="w-3 h-3" /> IA</span>}
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 truncate">{r.description || 'Sin descripción'}</p>
                                    <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                                        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">SI {r.pattern_type} {r.pattern_match} "{r.pattern_value}"</span>
                                        <span className="font-medium text-slate-400">→</span>
                                        <span>ENTONCES {r.use_ai ? 'generar con IA' : 'enviar respuesta estática'}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setForm(r); setEditingId(r.id); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Edit3 className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(r.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
