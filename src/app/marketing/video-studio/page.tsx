"use client";

import React, { useState } from 'react';
import {
    Video, Film, CheckCircle2, Mic, Music, LayoutGrid, Sparkles,
    UploadCloud, Volume2, VolumeX, ArrowRight, Play, Download, Clock,
    Image as ImageIcon, Zap, Clapperboard, Trash2, ChevronDown
} from 'lucide-react';
import { useMarketingContext } from '@/components/MarketingContext';

import { ALL_VIDEO_MODELS } from '@/constants/models';
import { useEffect } from 'react';


import { useMarketingContext, MarketingAsset } from '@/components/MarketingContext';
import { insforge } from '@/lib/insforge';


// ─── Shared: Model Dropdown ──────────────────────────────────────────────────
function ModelSelect({ models, value, onChange }: {
    models: typeof ALL_VIDEO_MODELS;
    value: string;
    onChange: (id: string) => void;
}) {
    const selected = models.find(m => m.id === value) || models[0];
    return (
        <div className="relative">
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 pr-10 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none cursor-pointer"
            >
                {models.map(m => (
                    <option key={m.id} value={m.id}>{m.name} — {m.desc}</option>
                ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
    );
}

// ─── History Bar ─────────────────────────────────────────────────────────────
function HistoryBar({ items, onDelete }: { items: MarketingAsset[]; onDelete: (id: string | number) => void }) {
    return (
        <div className="h-36 border-t border-slate-200 dark:border-white/10 p-3 bg-white/50 dark:bg-white/[0.02] shrink-0 overflow-x-auto">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center">
                <Clock className="w-3 h-3 mr-1.5" /> Historial Reciente
            </h3>
            <div className="flex gap-2.5">
                {items.map(item => (
                    <div key={item.id}
                        className="w-44 h-24 shrink-0 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 relative group cursor-pointer hover:border-violet-500 transition-all bg-black">
                        <img src={item.metadata?.thumbnail || '/video-placeholder.png'} alt={item.title}
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Play className="w-5 h-5 text-white drop-shadow" />
                        </div>
                        <span className="absolute bottom-1 left-2 text-[10px] text-white font-bold bg-black/50 px-1 rounded truncate max-w-[60%]">
                            {item.title}
                        </span>
                        <span className="absolute bottom-1 right-2 text-[10px] text-white font-bold bg-black/50 px-1 rounded">
                            {item.metadata?.duration || '0:05'}
                        </span>
                        {/* Delete button */}
                        <button
                            onClick={e => { e.stopPropagation(); onDelete(item.id); }}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            title="Eliminar"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                ))}
                {items.length === 0 && (
                    <div className="flex items-center text-xs text-slate-400 italic">
                        Aún no hay vídeos en el historial.
                    </div>
                )}
            </div>
        </div>
    );
}


// ─── Quick Generator ─────────────────────────────────────────────────────────
function QuickGenerator({ enabledModels }: { enabledModels: typeof ALL_VIDEO_MODELS }) {
    const { activeClient, assets, refreshAssets } = useMarketingContext();
    const [subTab, setSubTab] = useState<'text2video' | 'image2video' | 'video2video'>('text2video');
    const [prompt, setPrompt] = useState('');
    const [model, setModel] = useState(enabledModels[0]?.id ?? '');
    const [ratio, setRatio] = useState('16:9');
    const [duration, setDuration] = useState(5);
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeVideo, setActiveVideo] = useState<string | null>(null);

    const videoHistory = assets.filter(a => a.type === 'video' && (activeClient ? a.client_id === activeClient.id : true));

    const selectedModel = enabledModels.find(m => m.id === model) ?? enabledModels[0];

    const handleModelChange = (id: string) => {
        setModel(id);
        const m = enabledModels.find(m => m.id === id) ?? enabledModels[0];
        if (!m.ratios.includes(ratio)) setRatio(m.ratios[0]);
        if (!m.durations.includes(duration)) setDuration(m.durations[0]);
    };

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsGenerating(true);
        try {
            // Simulación
            const videoUrl = 'https://www.w3schools.com/html/mov_bbb.mp4';

            const { error } = await insforge.database.from('marketing_assets').insert({
                client_id: activeClient?.id || null,
                type: 'video',
                url: videoUrl,
                title: prompt.substring(0, 50),
                model: model,
                metadata: { ratio, duration, thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=225&fit=crop' }
            });

            if (!error) {
                setActiveVideo(videoUrl);
                await refreshAssets();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDeleteHistory = async (id: string | number) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este vídeo del historial?')) return;
        const { error } = await insforge.database.from('marketing_assets').delete().eq('id', id);
        if (!error) await refreshAssets();
    };


    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Left panel */}
                <div className="w-full md:w-[380px] shrink-0 flex flex-col border-r border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02]">
                    <div className="flex border-b border-slate-200 dark:border-white/10 shrink-0">
                        {(['text2video', 'image2video', 'video2video'] as const).map(t => (
                            <button key={t} onClick={() => setSubTab(t)}
                                className={`flex-1 py-3.5 text-xs font-semibold transition-colors ${subTab === t ? 'border-b-2 border-violet-500 text-violet-600 dark:text-violet-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                {t === 'text2video' ? 'Texto' : t === 'image2video' ? 'Imagen' : 'Vídeo'} → Vídeo
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-5">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Prompt</label>
                            <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                                placeholder="Describe la escena, movimiento de cámara, estilo..."
                                className="w-full h-28 p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 text-sm resize-none" />
                        </div>

                        {(subTab === 'image2video' || subTab === 'video2video') && (
                            <div className="p-5 bg-slate-50 dark:bg-white/5 border-2 border-dashed border-slate-300 dark:border-white/20 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-violet-500 transition-colors">
                                <UploadCloud className="w-7 h-7 text-slate-400 mb-2" />
                                <p className="text-xs font-medium text-slate-500 text-center">Arrastra o haz click para subir</p>
                            </div>
                        )}

                        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-white/10">
                            {/* Model dropdown */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Modelo IA</label>
                                <ModelSelect models={enabledModels} value={model} onChange={handleModelChange} />
                            </div>

                            {/* Format */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Formato</label>
                                <div className="flex flex-wrap gap-2">
                                    {selectedModel?.ratios.map(r => (
                                        <button key={r} onClick={() => setRatio(r)}
                                            className={`px-3 py-2 rounded-lg text-xs border transition-colors ${ratio === r ? 'bg-violet-50 text-violet-700 border-violet-500 font-bold dark:bg-violet-500/20 dark:text-violet-300' : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}>
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Duration */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Duración</label>
                                <div className="flex flex-wrap gap-2">
                                    {selectedModel?.durations.map(d => (
                                        <button key={d} onClick={() => setDuration(d)}
                                            className={`px-3 py-2 rounded-lg text-xs border transition-colors ${duration === d ? 'bg-violet-50 text-violet-700 border-violet-500 font-bold dark:bg-violet-500/20 dark:text-violet-300' : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}>
                                            {d}s
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button onClick={handleGenerate} disabled={isGenerating || !prompt}
                            className="w-full py-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white rounded-2xl font-bold shadow-lg shadow-violet-500/20 transition-all disabled:opacity-50 flex items-center justify-center">
                            {isGenerating
                                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> Generando...</>
                                : <><Sparkles className="w-4 h-4 mr-2" /> {activeClient ? `Generar para ${activeClient.name}` : 'Generar Vídeo'}</>}
                        </button>
                    </div>
                </div>

                {/* Preview */}
                <div className="flex-1 flex items-center justify-center p-6 overflow-hidden bg-slate-100/50 dark:bg-[#05080f]">
                    {!activeVideo ? (
                        <div className="flex flex-col items-center text-slate-400">
                            <Video className="w-16 h-16 mb-4 opacity-20" />
                            <p className="text-sm">Todavía no hay ningún vídeo generado</p>
                        </div>
                    ) : (
                        <video src={activeVideo} controls autoPlay
                            className="w-full max-h-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 bg-black" />
                    )}
                </div>
            </div>

            <HistoryBar items={videoHistory} onDelete={handleDeleteHistory} />

        </div>
    );
}

// ─── Video Editor (Storyboard) ────────────────────────────────────────────────
function VideoEditor({ enabledModels }: { enabledModels: typeof ALL_VIDEO_MODELS }) {
    const { activeClient, assets, refreshAssets } = useMarketingContext();
    const [step, setStep] = useState<'config' | 'storyboard' | 'animation' | 'audio' | 'render'>('config');
    const [generalPrompt, setGeneralPrompt] = useState('');
    const [sceneCount, setSceneCount] = useState(3);
    const [model, setModel] = useState(enabledModels[0]?.id ?? '');
    const [ratio, setRatio] = useState('16:9');
    const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
    const [scenes, setScenes] = useState<any[]>([]);
    const [isGeneratingAnimations, setIsGeneratingAnimations] = useState(false);
    const [voiceoverText, setVoiceoverText] = useState('');
    const [bgMusicPrompt, setBgMusicPrompt] = useState('');
    const [isRendering, setIsRendering] = useState(false);
    const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);

    const editorHistory = assets.filter(a => a.type === 'video' && (activeClient ? a.client_id === activeClient.id : true)).slice(0, 5);


    const selectedModel = enabledModels.find(m => m.id === model) ?? enabledModels[0];

    const STEPS_LIST = ['config', 'storyboard', 'animation', 'audio', 'render'] as const;
    const STEP_LABELS: Record<string, string> = {
        config: 'Planificación', storyboard: 'Storyboard',
        animation: 'Animación', audio: 'Audio FX', render: 'Montaje Final'
    };

    const generateStoryboard = () => {
        setIsGeneratingStoryboard(true);
        setTimeout(() => {
            setScenes(Array.from({ length: sceneCount }).map((_, i) => ({
                id: i + 1,
                visualPrompt: `Escena ${i + 1}: ${generalPrompt || 'Toma cinemática'}`,
                animationPrompt: 'Movimiento de cámara suave hacia adelante',
                hasSound: false,
                imageUrl: `https://images.unsplash.com/photo-${1500000000000 + i * 1000}?w=800&h=450&fit=crop`,
                videoUrl: null,
            })));
            setIsGeneratingStoryboard(false);
            setStep('storyboard');
        }, 2000);
    };

    const updateScene = (id: number, field: keyof Scene, value: any) =>
        setScenes(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));

    const animateScenes = () => {
        setIsGeneratingAnimations(true);
        setTimeout(() => {
            setScenes(prev => prev.map(s => ({ ...s, videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' })));
            setIsGeneratingAnimations(false);
            setStep('audio');
        }, 3000);
    };

    const renderFinalVideo = async () => {
        setIsRendering(true);
        setStep('render');
        setTimeout(async () => {
            const videoUrl = 'https://www.w3schools.com/html/mov_bbb.mp4';
            setFinalVideoUrl(videoUrl);

            await insforge.database.from('marketing_assets').insert({
                client_id: activeClient?.id || null,
                type: 'video',
                url: videoUrl,
                title: generalPrompt.substring(0, 50) || 'Producción Completa',
                model: model,
                metadata: { ratio, scenes: scenes.length, isEditor: true, thumbnail: scenes[0]?.imageUrl }
            });

            await refreshAssets();
            setIsRendering(false);
        }, 4000);
    };

    const handleDeleteHistory = async (id: string | number) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este vídeo del historial?')) return;
        const { error } = await insforge.database.from('marketing_assets').delete().eq('id', id);
        if (!error) await refreshAssets();
    };


    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Step indicator */}
            <div className="bg-white dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/10 px-6 py-3 flex items-center gap-2 shrink-0 overflow-x-auto">
                {STEPS_LIST.map((s, i) => {
                    const isActive = step === s;
                    const isPast = STEPS_LIST.indexOf(step) > i;
                    return (
                        <React.Fragment key={s}>
                            <div className={`flex items-center px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${isActive ? 'bg-violet-500 text-white shadow-md shadow-violet-500/30' : isPast ? 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                                {isPast && <CheckCircle2 className="w-3 h-3 mr-1.5" />}
                                {i + 1}. {STEP_LABELS[s]}
                            </div>
                            {i < STEPS_LIST.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700 shrink-0" />}
                        </React.Fragment>
                    );
                })}
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 dark:bg-[#0a0f1c]">
                <div className="max-w-4xl mx-auto w-full">

                    {/* CONFIG */}
                    {step === 'config' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Idea / Descripción General</label>
                                    <textarea value={generalPrompt} onChange={e => setGeneralPrompt(e.target.value)}
                                        placeholder={`Ej: Un anuncio para ${activeClient?.name ?? 'tu empresa'}, mostrando el servicio, clientes felices...`}
                                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-white resize-none outline-none" rows={4} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Modelo IA</label>
                                            <ModelSelect models={enabledModels} value={model}
                                                onChange={v => { setModel(v); const m = enabledModels.find(m => m.id === v) ?? enabledModels[0]; if (!m.ratios.includes(ratio)) setRatio(m.ratios[0]); }} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Formato</label>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedModel?.ratios.map(r => (
                                                    <button key={r} onClick={() => setRatio(r)}
                                                        className={`px-4 py-2 text-xs font-medium rounded-lg border transition-all ${ratio === r ? 'bg-violet-500 text-white border-transparent shadow-md' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                                        {r}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                            Número de Escenas — <span className="text-violet-500">{sceneCount}</span>
                                        </label>
                                        <input type="range" min={1} max={8} value={sceneCount} onChange={e => setSceneCount(+e.target.value)}
                                            className="w-full accent-violet-500 mt-2" />
                                        <div className="flex justify-between text-xs text-slate-400 mt-1">
                                            <span>1</span><span>8</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button onClick={generateStoryboard} disabled={isGeneratingStoryboard || !generalPrompt}
                                className="w-full py-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white rounded-2xl font-bold shadow-lg shadow-violet-500/20 transition-all transform hover:scale-[1.01] disabled:opacity-50 flex items-center justify-center text-lg">
                                {isGeneratingStoryboard
                                    ? <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" /> Generando Storyboard con IA...</>
                                    : <>Generar Storyboard <ArrowRight className="w-5 h-5 ml-2" /></>}
                            </button>
                        </div>
                    )}

                    {/* STORYBOARD */}
                    {step === 'storyboard' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center mb-1">
                                    <LayoutGrid className="w-5 h-5 mr-2 text-violet-500" /> Storyboard — {scenes.length} Escenas
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Revisa y edita el prompt visual de cada toma. Puedes regenerar individualmente cada imagen.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {scenes.map((scene, idx) => (
                                    <div key={scene.id} className="bg-white dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                                        <div className="relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-3 aspect-video">
                                            {scene.imageUrl
                                                ? <img src={scene.imageUrl} alt={`Escena ${idx + 1}`} className="w-full h-full object-cover" />
                                                : <div className="flex items-center justify-center w-full h-full"><ImageIcon className="w-8 h-8 opacity-20" /></div>}
                                            <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2.5 py-0.5 rounded-full font-bold">S{scene.id}</div>
                                        </div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Prompt Visual</label>
                                        <textarea value={scene.visualPrompt} onChange={e => updateScene(scene.id, 'visualPrompt', e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-violet-500 text-slate-700 dark:text-slate-300 resize-none outline-none mb-2" rows={3} />
                                        <button className="text-xs font-bold text-violet-500 self-start flex items-center">
                                            <Sparkles className="w-3 h-3 mr-1" /> Regenerar
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setStep('animation')}
                                className="w-full py-4 bg-slate-800 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold hover:opacity-90 transition-all flex items-center justify-center text-lg mt-4">
                                Aprobar Storyboard <ArrowRight className="w-5 h-5 ml-2" />
                            </button>
                        </div>
                    )}

                    {/* ANIMATION */}
                    {step === 'animation' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center mb-1">
                                    <Film className="w-5 h-5 mr-2 text-violet-500" /> Animación por Escena
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Configura el movimiento de cada toma y activa FX de sonido ambiental si lo deseas.</p>
                            </div>
                            <div className="space-y-5">
                                {scenes.map((scene) => (
                                    <div key={scene.id} className="bg-white dark:bg-slate-900/50 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex gap-5">
                                        <div className="w-52 shrink-0 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 aspect-video">
                                            <img src={scene.imageUrl!} alt="" className="w-full h-full object-cover opacity-80" />
                                        </div>
                                        <div className="flex-1 flex flex-col justify-center space-y-3">
                                            <div className="text-xs font-bold text-slate-400">ESCENA {scene.id}</div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Prompt de Movimiento</label>
                                                <input type="text" value={scene.animationPrompt} onChange={e => updateScene(scene.id, 'animationPrompt', e.target.value)}
                                                    placeholder="Ej: Zoom in lento, tilt hacia arriba..."
                                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-violet-500 outline-none" />
                                            </div>
                                            <button onClick={() => updateScene(scene.id, 'hasSound', !scene.hasSound)}
                                                className={`self-start flex items-center px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${scene.hasSound ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400' : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}>
                                                {scene.hasSound ? <><Volume2 className="w-3.5 h-3.5 mr-1.5" /> FX Sonido: Activo</> : <><VolumeX className="w-3.5 h-3.5 mr-1.5" /> Sin FX de Sonido</>}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button onClick={animateScenes} disabled={isGeneratingAnimations}
                                className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:opacity-90 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all transform hover:scale-[1.01] disabled:opacity-50 flex items-center justify-center text-lg mt-4">
                                {isGeneratingAnimations
                                    ? <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" /> Animando Escenas...</>
                                    : <>Animar a Clip de Vídeo <ArrowRight className="w-5 h-5 ml-2" /></>}
                            </button>
                        </div>
                    )}

                    {/* AUDIO */}
                    {step === 'audio' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center mb-1">
                                    <Music className="w-5 h-5 mr-2 text-pink-500" /> Post-Producción de Audio
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Añade opcionalmente una locución IA y música de fondo generada automáticamente.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                                    <div className="flex items-center mb-4">
                                        <div className="w-9 h-9 rounded-full bg-cyan-100 dark:bg-cyan-500/20 flex items-center justify-center mr-3 text-cyan-600"><Mic className="w-4 h-4" /></div>
                                        <h3 className="font-bold text-slate-800 dark:text-white">Voz en Off — Locución IA</h3>
                                    </div>
                                    <textarea value={voiceoverText} onChange={e => setVoiceoverText(e.target.value)}
                                        placeholder="Escribe el guión completo para la voz en off..."
                                        className="w-full flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-cyan-500 text-slate-700 dark:text-slate-300 resize-none outline-none mb-4" rows={5} />
                                    <button className="text-sm font-bold text-cyan-600 border border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/10 py-2.5 rounded-xl w-full hover:bg-cyan-100 transition-colors">
                                        Configurar Voz IA (ElevenLabs)
                                    </button>
                                </div>
                                <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                                    <div className="flex items-center mb-4">
                                        <div className="w-9 h-9 rounded-full bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center mr-3 text-pink-600"><Music className="w-4 h-4" /></div>
                                        <h3 className="font-bold text-slate-800 dark:text-white">Música de Fondo (Suno)</h3>
                                    </div>
                                    <textarea value={bgMusicPrompt} onChange={e => setBgMusicPrompt(e.target.value)}
                                        placeholder="Ej: Instrumental épico, cinematográfico, que sube de ritmo al final..."
                                        className="w-full flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-pink-500 text-slate-700 dark:text-slate-300 resize-none outline-none mb-4" rows={5} />
                                    <button className="text-sm font-bold text-pink-600 border border-pink-200 dark:border-pink-500/30 bg-pink-50 dark:bg-pink-500/10 py-2.5 rounded-xl w-full hover:bg-pink-100 transition-colors">
                                        Generar Pista (Suno V4)
                                    </button>
                                </div>
                            </div>
                            <button onClick={renderFinalVideo}
                                className="w-full py-4 bg-slate-800 dark:bg-white text-white dark:text-slate-800 rounded-2xl font-bold shadow-lg transition-all transform hover:scale-[1.01] flex items-center justify-center text-lg mt-4">
                                Unir Todo y Renderizar <Play className="w-5 h-5 ml-2 fill-current" />
                            </button>
                        </div>
                    )}

                    {/* RENDER */}
                    {step === 'render' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white text-center flex items-center justify-center">
                                <Sparkles className="w-6 h-6 mr-2 text-yellow-500" /> Resultado Final
                            </h2>
                            {isRendering ? (
                                <div className="flex flex-col items-center justify-center py-24 text-center bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800">
                                    <div className="w-16 h-16 border-4 border-slate-200 border-t-violet-500 rounded-full animate-spin mb-6"></div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Componiendo tu producción...</h3>
                                    <p className="text-slate-500 text-sm max-w-sm">Uniendo clips, audio, locución y sincronizando transiciones.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center space-y-6">
                                    <div className="w-full bg-black rounded-3xl overflow-hidden shadow-2xl aspect-video border border-slate-800">
                                        <video src={finalVideoUrl!} controls autoPlay className="w-full h-full object-contain" />
                                    </div>
                                    <div className="flex gap-4">
                                        <button className="flex items-center px-8 py-3.5 bg-violet-500 hover:bg-violet-600 text-white rounded-xl font-bold shadow-lg shadow-violet-500/20 transition-all">
                                            <Download className="w-5 h-5 mr-2" /> Descargar MP4
                                        </button>
                                        <button onClick={() => { setStep('config'); setFinalVideoUrl(null); setScenes([]); }}
                                            className="flex items-center px-8 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-all hover:bg-slate-200 dark:hover:bg-slate-700">
                                            Crear Nuevo
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <HistoryBar items={editorHistory} onDelete={handleDeleteHistory} />

        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VideoStudio() {
    const [mainTab, setMainTab] = useState<'quick' | 'editor'>('quick');
    const [enabledModels, setEnabledModels] = useState<typeof ALL_VIDEO_MODELS>(ALL_VIDEO_MODELS);

    useEffect(() => {
        try {
            const stored = localStorage.getItem('admin_enabled_video_models');
            if (stored) {
                const ids = JSON.parse(stored);
                setEnabledModels(ALL_VIDEO_MODELS.filter(m => ids.includes(m.id)));
            }
        } catch { /* fallback to all */ }
    }, []);

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-[#0a0f1c]">
            {/* Main Tab Bar */}
            <div className="flex shrink-0 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50">
                <button onClick={() => setMainTab('quick')}
                    className={`flex items-center gap-2 px-7 py-4 font-semibold text-sm transition-colors border-b-2 ${mainTab === 'quick' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                    <Zap className="w-4 h-4" /> Generación Rápida
                </button>
                <button onClick={() => setMainTab('editor')}
                    className={`flex items-center gap-2 px-7 py-4 font-semibold text-sm transition-colors border-b-2 ${mainTab === 'editor' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                    <Clapperboard className="w-4 h-4" /> Editor Completo — Storyboard
                </button>
            </div>

            {mainTab === 'quick'
                ? <QuickGenerator enabledModels={enabledModels} />
                : <VideoEditor enabledModels={enabledModels} />}
        </div>
    );
}
