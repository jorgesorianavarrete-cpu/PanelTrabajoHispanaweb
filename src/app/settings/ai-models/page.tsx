'use client';
import { useState, useEffect } from 'react';
import { Image as ImageIcon, Video, Save, Loader2, CheckSquare, Square, ChevronDown, ChevronUp, Info } from 'lucide-react';

// Import full catalogues (source of truth)
import { ALL_IMAGE_MODELS, ALL_VIDEO_MODELS } from '@/constants/models';


// In production these would be stored/read from DB
const LOCAL_KEY_IMG = 'admin_enabled_image_models';
const LOCAL_KEY_VID = 'admin_enabled_video_models';

const DEFAULT_IMG_ENABLED = ALL_IMAGE_MODELS.map(m => m.id);
const DEFAULT_VID_ENABLED = ALL_VIDEO_MODELS.map(m => m.id);

export default function AIModelsSettings() {
    const [enabledImg, setEnabledImg] = useState<string[]>(DEFAULT_IMG_ENABLED);
    const [enabledVid, setEnabledVid] = useState<string[]>(DEFAULT_VID_ENABLED);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [imgOpen, setImgOpen] = useState(true);
    const [vidOpen, setVidOpen] = useState(true);

    useEffect(() => {
        try {
            const img = localStorage.getItem(LOCAL_KEY_IMG);
            const vid = localStorage.getItem(LOCAL_KEY_VID);
            if (img) setEnabledImg(JSON.parse(img));
            if (vid) setEnabledVid(JSON.parse(vid));
        } catch { /* ignore */ }
    }, []);

    const toggleImg = (id: string) =>
        setEnabledImg(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const toggleVid = (id: string) =>
        setEnabledVid(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const handleSave = async () => {
        setSaving(true);
        // Persist to localStorage (future: save to DB via insforge)
        localStorage.setItem(LOCAL_KEY_IMG, JSON.stringify(enabledImg));
        localStorage.setItem(LOCAL_KEY_VID, JSON.stringify(enabledVid));
        await new Promise(r => setTimeout(r, 600));
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0a0f1c] text-slate-900 dark:text-white">
            {/* Header */}
            <header className="h-24 border-b border-slate-200 dark:border-white/10 flex items-end px-8 pb-4 shrink-0 bg-white dark:bg-transparent">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20 text-white">
                            <Video className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Modelos de IA — Marketing</h1>
                            <p className="text-sm text-slate-500">Activa o desactiva qué modelos aparecen disponibles en cada Studio</p>
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center px-6 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl font-bold shadow-lg shadow-violet-500/20 hover:opacity-90 transition-all disabled:opacity-50"
                    >
                        {saving
                            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
                            : saved
                                ? <><CheckSquare className="w-4 h-4 mr-2" /> Guardado</>
                                : <><Save className="w-4 h-4 mr-2" /> Guardar Cambios</>}
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
                    <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                        Los modelos desactivados no aparecerán en el desplegable de selección de los Studios. Al menos un modelo debe quedar activo en cada categoría.
                    </p>
                </div>

                {/* IMAGE MODELS */}
                <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                    <button
                        onClick={() => setImgOpen(!imgOpen)}
                        className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-orange-600">
                                <ImageIcon className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <h2 className="font-bold text-slate-800 dark:text-white">Modelos de Imagen</h2>
                                <p className="text-xs text-slate-500 mt-0.5">{enabledImg.length} de {ALL_IMAGE_MODELS.length} activos — Foto Studio</p>
                            </div>
                        </div>
                        {imgOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </button>

                    {imgOpen && (
                        <div className="border-t border-slate-200 dark:border-slate-800 p-6">
                            <div className="flex justify-end gap-3 mb-4">
                                <button onClick={() => setEnabledImg(ALL_IMAGE_MODELS.map(m => m.id))}
                                    className="text-xs font-semibold text-orange-500 hover:text-orange-600">Activar todos</button>
                                <button onClick={() => setEnabledImg([ALL_IMAGE_MODELS[0].id])}
                                    className="text-xs font-semibold text-slate-400 hover:text-slate-600">Desactivar todos</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {ALL_IMAGE_MODELS.map(m => {
                                    const isOn = enabledImg.includes(m.id);
                                    return (
                                        <button key={m.id} onClick={() => toggleImg(m.id)}
                                            className={`flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${isOn
                                                ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10'
                                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 opacity-60'}`}>
                                            <div>
                                                <div className={`font-bold text-sm ${isOn ? 'text-orange-700 dark:text-orange-400' : 'text-slate-600 dark:text-slate-400'}`}>{m.name}</div>
                                                <div className="text-xs text-slate-400 mt-0.5">{m.desc}</div>
                                                <div className="text-[10px] text-slate-400 mt-1">Ratios: {m.ratios.join(', ')}</div>
                                            </div>
                                            {isOn
                                                ? <CheckSquare className="w-5 h-5 text-orange-500 shrink-0 ml-3" />
                                                : <Square className="w-5 h-5 text-slate-300 shrink-0 ml-3" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* VIDEO MODELS */}
                <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                    <button
                        onClick={() => setVidOpen(!vidOpen)}
                        className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center text-violet-600">
                                <Video className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <h2 className="font-bold text-slate-800 dark:text-white">Modelos de Vídeo</h2>
                                <p className="text-xs text-slate-500 mt-0.5">{enabledVid.length} de {ALL_VIDEO_MODELS.length} activos — Video Studio y Editor</p>
                            </div>
                        </div>
                        {vidOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </button>

                    {vidOpen && (
                        <div className="border-t border-slate-200 dark:border-slate-800 p-6">
                            <div className="flex justify-end gap-3 mb-4">
                                <button onClick={() => setEnabledVid(ALL_VIDEO_MODELS.map(m => m.id))}
                                    className="text-xs font-semibold text-violet-500 hover:text-violet-600">Activar todos</button>
                                <button onClick={() => setEnabledVid([ALL_VIDEO_MODELS[0].id])}
                                    className="text-xs font-semibold text-slate-400 hover:text-slate-600">Desactivar todos</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {ALL_VIDEO_MODELS.map(m => {
                                    const isOn = enabledVid.includes(m.id);
                                    return (
                                        <button key={m.id} onClick={() => toggleVid(m.id)}
                                            className={`flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${isOn
                                                ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10'
                                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 opacity-60'}`}>
                                            <div>
                                                <div className={`font-bold text-sm ${isOn ? 'text-violet-700 dark:text-violet-400' : 'text-slate-600 dark:text-slate-400'}`}>{m.name}</div>
                                                <div className="text-xs text-slate-400 mt-0.5">{m.desc}</div>
                                                <div className="text-[10px] text-slate-400 mt-1">
                                                    Ratios: {m.ratios.join(', ')} · Duraciones: {m.durations.join(', ')}s
                                                </div>
                                            </div>
                                            {isOn
                                                ? <CheckSquare className="w-5 h-5 text-violet-500 shrink-0 ml-3" />
                                                : <Square className="w-5 h-5 text-slate-300 shrink-0 ml-3" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
