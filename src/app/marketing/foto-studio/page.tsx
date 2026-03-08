"use client";

import React, { useState } from 'react';
import {
    ImageIcon, UploadCloud, Wand2, SlidersHorizontal, ImagePlus, CheckCircle2,
    Download, Trash2, Clock, ChevronDown
} from 'lucide-react';
import { useMarketingContext, MarketingAsset } from '@/components/MarketingContext';
import { insforge } from '@/lib/insforge';


import { ALL_IMAGE_MODELS } from '@/constants/models';
import { useEffect } from 'react';









export default function FotoStudio() {
    const [activeTab, setActiveTab] = useState<'prompt' | 'templates' | 'upload'>('prompt');
    const [prompt, setPrompt] = useState('');
    const [model, setModel] = useState(ALL_IMAGE_MODELS[0].id);

    const [ratio, setRatio] = useState('1:1');
    const [quality, setQuality] = useState<'standard' | 'pro'>('standard');
    const [isGenerating, setIsGenerating] = useState(false);
    const [enabledModels, setEnabledModels] = useState<typeof ALL_IMAGE_MODELS>(ALL_IMAGE_MODELS);

    useEffect(() => {
        try {
            const stored = localStorage.getItem('admin_enabled_image_models');
            if (stored) {
                const ids = JSON.parse(stored);
                setEnabledModels(ALL_IMAGE_MODELS.filter(m => ids.includes(m.id)));
            }
        } catch { /* fallback */ }
    }, []);


    const { activeClient, assets, refreshAssets } = useMarketingContext();
    const historyImgs = assets.filter(a => a.type === 'image' && (activeClient ? a.client_id === activeClient.id : true)).slice(0, 10);

    const [activeImage, setActiveImage] = useState<string | null>(null);

    const [filters, setFilters] = useState({ brightness: 100, contrast: 100, saturation: 100 });

    const selectedModelConfig = enabledModels.find(m => m.id === model) || enabledModels[0];


    const handleModelChange = (newModelId: string) => {
        setModel(newModelId);
        const newModel = enabledModels.find(m => m.id === newModelId) || enabledModels[0];
        if (!newModel.ratios.includes(ratio)) {
            setRatio(newModel.ratios[0]);
        }
    };


    const handleDeleteHistory = async (id: string | number) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta imagen del historial?')) return;
        const { error } = await insforge.database.from('marketing_assets').delete().eq('id', id);
        if (!error) await refreshAssets();
    };



    const handleGenerate = async () => {
        if (!prompt) return;
        setIsGenerating(true);
        try {
            // Simulamos la llamada a la API
            const generatedUrl = `https://api.maxima.pics/generate?prompt=${encodeURIComponent(prompt)}&r=${ratio}&m=${model}`;

            // Guardamos en DB
            const { data, error } = await insforge.database.from('marketing_assets').insert({
                client_id: activeClient?.id || null,
                type: 'image',
                url: generatedUrl,
                title: prompt.substring(0, 50),
                model: model,
                metadata: { ratio, quality }
            }).select();

            if (!error) {
                setActiveImage(generatedUrl);
                await refreshAssets();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    };


    return (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50 dark:bg-[#0a0f1c]">
            {/* Left Panel: Inputs */}
            <div className="w-full md:w-1/3 xl:w-96 flex flex-col border-r border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02]">
                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-white/10">
                    <button
                        onClick={() => setActiveTab('prompt')}
                        className={`flex-1 flex items-center justify-center py-4 text-sm font-medium transition-colors ${activeTab === 'prompt' ? 'border-b-2 border-orange-500 text-orange-600 dark:text-orange-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                    >
                        <Wand2 className="w-4 h-4 mr-2" />
                        Generar
                    </button>
                    <button
                        onClick={() => setActiveTab('templates')}
                        className={`flex-1 flex items-center justify-center py-4 text-sm font-medium transition-colors ${activeTab === 'templates' ? 'border-b-2 border-orange-500 text-orange-600 dark:text-orange-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                    >
                        <ImagePlus className="w-4 h-4 mr-2" />
                        Plantillas
                    </button>
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`flex-1 flex items-center justify-center py-4 text-sm font-medium transition-colors ${activeTab === 'upload' ? 'border-b-2 border-orange-500 text-orange-600 dark:text-orange-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                    >
                        <UploadCloud className="w-4 h-4 mr-2" />
                        Subir
                    </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'prompt' && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Descripción (Prompt)</label>
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Describe la imagen inmobiliaria perfecta..."
                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-sm focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white resize-none"
                                    rows={4}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Modelo Generativo</label>
                                <div className="relative">
                                    <select
                                        value={model}
                                        onChange={e => handleModelChange(e.target.value)}
                                        className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 pr-10 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 outline-none cursor-pointer"
                                    >
                                        {enabledModels.map((m: any) => (
                                            <option key={m.id} value={m.id}>{m.name} — {m.desc}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>


                            <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Formato (Aspect Ratio)</label>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedModelConfig.ratios.map(r => (
                                            <button
                                                key={r}
                                                onClick={() => setRatio(r)}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${ratio === r
                                                    ? 'bg-orange-500 text-white shadow-md'
                                                    : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10'
                                                    }`}
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Calidad / Modelo</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setQuality('standard')}
                                        className={`p-3 text-left border rounded-xl transition-colors ${quality === 'standard' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'}`}
                                    >
                                        <div className="font-bold flex items-center justify-between">
                                            Estándar {quality === 'standard' && <CheckCircle2 className="w-4 h-4" />}
                                        </div>
                                        <div className="text-xs opacity-70 mt-1">Más rápido • 5 Créditos</div>
                                    </button>
                                    <button
                                        onClick={() => setQuality('pro')}
                                        className={`p-3 text-left border rounded-xl transition-colors ${quality === 'pro' ? 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400' : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'}`}
                                    >
                                        <div className="font-bold flex items-center justify-between">
                                            Revista (Pro) {quality === 'pro' && <CheckCircle2 className="w-4 h-4" />}
                                        </div>
                                        <div className="text-xs opacity-70 mt-1">Máxima calidad • 15 C.</div>
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || !prompt}
                                className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-400 hover:to-rose-400 text-white rounded-xl font-bold shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 flex items-center justify-center"
                            >
                                {isGenerating ? 'Generando...' : (activeClient ? `Generar para ${activeClient.name}` : 'Generar Imagen')}
                            </button>
                        </div>
                    )}

                    {activeTab === 'templates' && (
                        <div className="text-center p-8 text-slate-500">
                            Selector de plantillas en desarrollo.
                        </div>
                    )}

                    {activeTab === 'upload' && (
                        <div className="text-center p-8 bg-slate-50 dark:bg-white/5 border-2 border-dashed border-slate-300 dark:border-white/20 rounded-2xl flex flex-col items-center justify-center">
                            <UploadCloud className="w-10 h-10 text-slate-400 mb-3" />
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Arrastra tu imagen base</p>
                            <p className="text-xs text-slate-500 mt-1">o haz clic para explorar</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Canvas / Preview & History */}
            <div className="flex-1 flex flex-col bg-slate-100/50 dark:bg-[#05080f] overflow-hidden relative">
                <div className="flex-1 flex flex-col p-6 overflow-hidden">
                    {!activeImage ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                            <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                            <p>El lienzo está vacío. Genera o sube una imagen para empezar.</p>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center overflow-auto relative rounded-2xl">
                            <img
                                src={activeImage}
                                alt="Preview"
                                style={{
                                    filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%)`,
                                    maxWidth: '100%', maxHeight: '100%', objectFit: 'contain'
                                }}
                                className="rounded-xl shadow-xl border border-slate-200 dark:border-white/10"
                            />
                        </div>
                    )}
                </div>

                {/* Historial Reciente */}
                <div className="h-40 border-t border-slate-200 dark:border-white/10 p-4 bg-white/50 dark:bg-white/[0.02] shrink-0 overflow-x-auto">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-2" /> Historial Reciente
                    </h3>
                    <div className="flex gap-3">
                        {historyImgs.map(item => (
                            <div key={item.id} className="w-24 h-24 shrink-0 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 relative group cursor-pointer hover:border-orange-500 transition-colors">
                                <img src={item.url} alt="History" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <ImageIcon className="w-5 h-5 text-white" />
                                </div>
                                <button
                                    onClick={e => { e.stopPropagation(); handleDeleteHistory(item.id); }}
                                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                    title="Eliminar"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                        {historyImgs.length === 0 && (
                            <div className="flex items-center text-xs text-slate-400 italic">Sin imágenes en historial.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Panel: Tools (Filters) */}
            {activeImage && (
                <div className="w-full md:w-80 flex flex-col border-l border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02]">
                    <div className="p-4 border-b border-slate-200 dark:border-white/10 font-bold flex items-center">
                        <SlidersHorizontal className="w-4 h-4 mr-2" />
                        Ajustes
                    </div>
                    <div className="p-6 space-y-6">
                        <div>
                            <div className="flex justify-between text-xs font-medium mb-2 text-slate-600 dark:text-slate-400">
                                <span>Brillo</span>
                                <span>{filters.brightness}%</span>
                            </div>
                            <input type="range" min="0" max="200" value={filters.brightness} onChange={e => setFilters(f => ({ ...f, brightness: parseInt(e.target.value) }))} className="w-full" />
                        </div>
                        <div>
                            <div className="flex justify-between text-xs font-medium mb-2 text-slate-600 dark:text-slate-400">
                                <span>Contraste</span>
                                <span>{filters.contrast}%</span>
                            </div>
                            <input type="range" min="0" max="200" value={filters.contrast} onChange={e => setFilters(f => ({ ...f, contrast: parseInt(e.target.value) }))} className="w-full" />
                        </div>
                        <div>
                            <div className="flex justify-between text-xs font-medium mb-2 text-slate-600 dark:text-slate-400">
                                <span>Saturación</span>
                                <span>{filters.saturation}%</span>
                            </div>
                            <input type="range" min="0" max="200" value={filters.saturation} onChange={e => setFilters(f => ({ ...f, saturation: parseInt(e.target.value) }))} className="w-full" />
                        </div>

                        <div className="pt-6 border-t border-slate-200 dark:border-white/10 flex space-x-2">
                            <button className="flex-1 flex items-center justify-center py-2.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl font-medium hover:bg-blue-100 transition-colors">
                                <Download className="w-4 h-4 mr-2" /> Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
