"use client";

import React, { useState } from 'react';
import {
    Music, Disc3, Download, Play, Square, Wand2, Clock, Trash2
} from 'lucide-react';
import { useMarketingContext, MarketingAsset } from '@/components/MarketingContext';
import { insforge } from '@/lib/insforge';

const MODELS = [
    { id: 'suno_v4', name: 'Suno V4.0', desc: 'Última versión, mejor estructura y voces' },
    { id: 'suno_v3_5', name: 'Suno V3.5', desc: 'Rápido, ideal para pop y electrónico' }
];


export default function CancionesStudio() {
    const [prompt, setPrompt] = useState('');
    const [style, setStyle] = useState('');
    const [title, setTitle] = useState('');
    const [model, setModel] = useState('suno_v4');
    const [instrumental, setInstrumental] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeSongs, setActiveSongs] = useState<any[]>([]);
    const { activeClient, assets, refreshAssets } = useMarketingContext();

    const songHistory = assets.filter(a => a.type === 'song' && (activeClient ? a.client_id === activeClient.id : true));

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsGenerating(true);
        try {
            const audioUrl = 'https://www.w3schools.com/html/horse.mp3';
            const imageUrl = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop';

            // Insertamos la canción generada
            const { error } = await insforge.database.from('marketing_assets').insert({
                client_id: activeClient?.id || null,
                type: 'song',
                url: audioUrl,
                title: title || prompt.substring(0, 30),
                model: model,
                metadata: { style, instrumental, thumbnail: imageUrl }
            });

            if (!error) {
                setActiveSongs([{ id: Date.now(), title: title || 'Nueva Canción', audio_url: audioUrl, image_url: imageUrl }]);
                await refreshAssets();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDeleteHistory = async (id: string | number) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta canción?')) return;
        const { error } = await insforge.database.from('marketing_assets').delete().eq('id', id);
        if (!error) await refreshAssets();
    };


    return (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50 dark:bg-[#0a0f1c]">
            {/* Left Panel */}
            <div className="w-full md:w-1/3 xl:w-96 flex flex-col border-r border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02]">
                <div className="p-6 border-b border-slate-200 dark:border-white/10 font-bold flex items-center text-lg">
                    <Music className="w-5 h-5 mr-2 text-pink-500" />
                    Suno Studio
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Letra o Descripción</label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Ej: Una canción pop alegre sobre mudarse a una casa nueva..."
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-sm focus:ring-2 focus:ring-pink-500 text-slate-900 dark:text-white resize-none"
                            rows={4}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Modelo Generativo (Kie.ai)</label>
                        <div className="space-y-2 mb-6">
                            {MODELS.map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => setModel(m.id)}
                                    className={`w-full p-3 text-left border rounded-xl transition-colors ${model === m.id ? 'border-pink-500 bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400' : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'}`}
                                >
                                    <div className="font-bold text-sm">{m.name}</div>
                                    <div className="text-xs opacity-70 mt-1">{m.desc}</div>
                                </button>
                            ))}
                        </div>

                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Estilos Musicales</label>
                        <input
                            type="text"
                            value={style}
                            onChange={e => setStyle(e.target.value)}
                            placeholder="Ej: Pop, Acústico, Piano"
                            className="w-full p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-pink-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Título de la Canción</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Ej: El Hogar Perfecto"
                            className="w-full p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-pink-500"
                        />
                    </div>

                    <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                        <input
                            type="checkbox"
                            checked={instrumental}
                            onChange={e => setInstrumental(e.target.checked)}
                            className="w-5 h-5 accent-pink-500 rounded cursor-pointer"
                        />
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer" onClick={() => setInstrumental(!instrumental)}>
                            Solo Instrumental (sin voz)
                        </label>
                    </div>

                    <div className="pt-2">
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || !prompt}
                            className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white rounded-xl font-bold shadow-lg shadow-pink-500/20 transition-all disabled:opacity-50 flex items-center justify-center"
                        >
                            {isGenerating ? 'Componiendo Magia...' : (activeClient ? `Componer para ${activeClient.name}` : 'Generar Canción')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Player */}
            <div className="flex-1 flex flex-col bg-slate-100/50 dark:bg-[#05080f] overflow-y-auto p-6 md:p-12 relative">
                {activeSongs.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <Disc3 className="w-20 h-20 mb-4 opacity-20" />
                        <p>No has compuesto nada todavía.</p>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto w-full">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">Pistas Generadas</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {activeSongs.map(song => (
                                <div key={song.id} className="bg-white dark:bg-white/5 p-6 rounded-3xl shadow-xl border border-slate-200 dark:border-white/10 flex flex-col items-center">
                                    <img src={song.image_url} alt={song.title} className="w-48 h-48 object-cover rounded-2xl shadow-lg mb-6" />
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4 text-center">{song.title}</h3>
                                    <audio src={song.audio_url} controls className="w-full mb-6" />
                                    <button className="flex w-full items-center justify-center px-6 py-3 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 rounded-xl font-bold transition-all">
                                        <Download className="w-5 h-5 mr-2" />
                                        Descargar Audio
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="h-40 border-t border-slate-200 dark:border-white/10 p-4 bg-white/50 dark:bg-white/[0.02] shrink-0 overflow-x-auto">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-2" /> Historial Reciente
                </h3>
                <div className="flex gap-3">
                    {songHistory.map(item => (
                        <div key={item.id} className="w-48 h-24 shrink-0 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 relative group cursor-pointer hover:border-pink-500 transition-colors bg-white dark:bg-white/5 flex items-center justify-start p-3 gap-3">
                            <img src={item.metadata?.thumbnail || '/song-placeholder.png'} alt="Cover" className="w-16 h-16 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform" />
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-800 dark:text-white line-clamp-1">{item.title}</span>
                                <span className="text-[10px] text-slate-500">{item.model || 'Suno'}</span>
                                <button
                                    onClick={e => { e.stopPropagation(); handleDeleteHistory(item.id); }}
                                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                >
                                    <Trash2 className="w-2.5 h-2.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
