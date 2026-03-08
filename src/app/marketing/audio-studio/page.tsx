"use client";

import React, { useState } from 'react';
import {
    Mic, Play, Square, Download, Volume2, UserX, Clock, Trash2
} from 'lucide-react';
import { useMarketingContext, MarketingAsset } from '@/components/MarketingContext';
import { insforge } from '@/lib/insforge';
import { useEffect } from 'react';

const MODELS = [
    { id: 'eleven_multilingual_v2', name: 'Eleven Multilingual v2', desc: 'Realismo y múltiples idiomas' },
    { id: 'eleven_turbo_v2_5', name: 'Eleven Turbo v2.5', desc: 'Súper rápido y alta calidad' }
];


export default function AudioStudio() {
    const [text, setText] = useState('');
    const [model, setModel] = useState('eleven_multilingual_v2');
    const [voice, setVoice] = useState('alloy');
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeAudio, setActiveAudio] = useState<string | null>(null);
    const { activeClient, assets, refreshAssets } = useMarketingContext();

    const audioHistory = assets.filter(a => a.type === 'audio' && (activeClient ? a.client_id === activeClient.id : true));

    const handleGenerate = async () => {
        if (!text) return;
        setIsGenerating(true);
        try {
            const audioUrl = 'https://www.w3schools.com/html/horse.mp3';

            const { error } = await insforge.database.from('marketing_assets').insert({
                client_id: activeClient?.id || null,
                type: 'audio',
                url: audioUrl,
                title: text.substring(0, 50) || 'Locución',
                model: model,
                metadata: { voice, text }
            });

            if (!error) {
                setActiveAudio(audioUrl);
                await refreshAssets();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDeleteHistory = async (id: string | number) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta locución?')) return;
        const { error } = await insforge.database.from('marketing_assets').delete().eq('id', id);
        if (!error) await refreshAssets();
    };


    return (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50 dark:bg-[#0a0f1c]">
            {/* Left Panel */}
            <div className="w-full md:w-1/3 xl:w-96 flex flex-col border-r border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02]">
                <div className="p-6 border-b border-slate-200 dark:border-white/10 font-bold flex items-center text-lg">
                    <Mic className="w-5 h-5 mr-2 text-cyan-500" />
                    Locuciones IA
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Texto a locutar</label>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Escribe aquí el guión..."
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-sm focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white resize-none"
                            rows={6}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Modelo Generativo (Kie.ai)</label>
                        <div className="space-y-2 mb-6">
                            {MODELS.map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => setModel(m.id)}
                                    className={`w-full p-3 text-left border rounded-xl transition-colors ${model === m.id ? 'border-cyan-500 bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400' : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'}`}
                                >
                                    <div className="font-bold text-sm">{m.name}</div>
                                    <div className="text-xs opacity-70 mt-1">{m.desc}</div>
                                </button>
                            ))}
                        </div>

                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Voz</label>
                        <select
                            value={voice}
                            onChange={e => setVoice(e.target.value)}
                            className="w-full p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none"
                        >
                            <option value="alloy">Alloy (Neutral)</option>
                            <option value="echo">Echo (Grave)</option>
                            <option value="fable">Fable (Narrador)</option>
                            <option value="onyx">Onyx (Documental)</option>
                            <option value="nova">Nova (Enérgica)</option>
                            <option value="shimmer">Shimmer (Clara)</option>
                        </select>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !text}
                        className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 flex items-center justify-center"
                    >
                        {isGenerating ? 'Generando Voz...' : (activeClient ? `Locutar para ${activeClient.name}` : 'Locutar Texto')}
                    </button>
                </div>
            </div>

            {/* Main Player & History */}
            <div className="flex-1 flex flex-col bg-slate-100/50 dark:bg-[#05080f] overflow-hidden relative">
                <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
                    {!activeAudio ? (
                        <div className="text-center text-slate-400">
                            <Volume2 className="w-16 h-16 mb-4 opacity-20 mx-auto" />
                            <p>No hay audio generado.</p>
                        </div>
                    ) : (
                        <div className="w-full max-w-md bg-white dark:bg-white/5 p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-white/10 flex flex-col items-center">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30 mb-8 animate-pulse">
                                <Mic className="w-10 h-10 text-white" />
                            </div>
                            <audio src={activeAudio} controls className="w-full mb-6" autoPlay />
                            <button className="flex w-full items-center justify-center px-6 py-3 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 rounded-xl font-bold transition-all">
                                <Download className="w-5 h-5 mr-2" />
                                Descargar MP3
                            </button>
                        </div>
                    )}
                </div>

                <div className="h-40 border-t border-slate-200 dark:border-white/10 p-4 bg-white/50 dark:bg-white/[0.02] shrink-0 overflow-x-auto">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-2" /> Historial Reciente
                    </h3>
                    <div className="flex gap-3">
                        {audioHistory.map(item => (
                            <div key={item.id} className="w-48 h-24 shrink-0 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 relative group cursor-pointer hover:border-cyan-500 transition-colors bg-white dark:bg-white/5 flex flex-col items-center justify-center">
                                <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 rounded-full flex items-center justify-center mb-2">
                                    <Mic className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate w-full px-2 text-center">{item.title}</span>
                                <button
                                    onClick={e => { e.stopPropagation(); handleDeleteHistory(item.id); }}
                                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
