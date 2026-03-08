"use client";

import React, { useState } from 'react';
import {
    LayoutGrid, Image as ImageIcon, Video, Mic, Music, Download, Play, MoreVertical, Calendar, Clock, Trash2
} from 'lucide-react';
import { useMarketingContext, MarketingAsset } from '@/components/MarketingContext';
import { insforge } from '@/lib/insforge';


export default function CreativeGallery() {
    const { activeClient, assets, refreshAssets } = useMarketingContext();
    const [filter, setFilter] = useState('all');

    const filteredAssets = assets.filter(a => {
        const matchesTab = filter === 'all' ? true : a.type === filter;
        const matchesClient = activeClient ? a.client_id === activeClient.id : true;
        return matchesTab && matchesClient;
    });

    const handleDelete = async (id: string | number) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este asset?')) return;
        const { error } = await insforge.database.from('marketing_assets').delete().eq('id', id);
        if (!error) await refreshAssets();
    };


    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-[#0a0f1c]">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900/50 border-b border-slate-200 dark:border-white/10 p-6 px-8 flex items-center justify-between shrink-0">
                <div className="flex items-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 mr-4">
                        <LayoutGrid className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            {activeClient ? `Galería de ${activeClient.name}` : 'Galería Global de Assets'}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Historial completo de tus creaciones con Inteligencia Artificial</p>
                    </div>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {[
                        { id: 'all', label: 'Todos' },
                        { id: 'image', label: 'Imágenes', icon: ImageIcon },
                        { id: 'video', label: 'Vídeos', icon: Video },
                        { id: 'audio', label: 'Locuciones', icon: Mic },
                        { id: 'song', label: 'Canciones', icon: Music },
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f.id ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            {f.icon && <f.icon className="w-4 h-4 mr-2" />}
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                    {filteredAssets.map(asset => (
                        <div key={asset.id} className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col group relative">
                            {/* Media Container */}
                            <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                                {asset.type === 'image' && (
                                    <img src={asset.url} alt={asset.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                )}
                                {asset.type === 'video' && (
                                    <>
                                        {asset.metadata?.thumbnail ? (
                                            <img src={asset.metadata.thumbnail} alt={asset.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80" />
                                        ) : (
                                            <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                                                <Video className="w-10 h-10 text-slate-700" />
                                            </div>
                                        )}

                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-12 h-12 bg-black/50 backdrop-blur rounded-full flex items-center justify-center text-white border border-white/20">
                                                <Play className="w-5 h-5 ml-1" />
                                            </div>
                                        </div>
                                    </>
                                )}
                                {asset.type === 'audio' && (
                                    <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex flex-col items-center justify-center">
                                        <div className="w-16 h-16 bg-cyan-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/30 mb-2">
                                            <Mic className="w-8 h-8" />
                                        </div>
                                        <div className="px-3 py-1 bg-black/20 rounded-full text-xs font-bold text-white backdrop-blur">{asset.metadata?.duration || '0:00'}</div>
                                    </div>
                                )}


                                {/* Hover Overlay Actions */}
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button className="w-8 h-8 bg-white/90 dark:bg-black/60 backdrop-blur rounded-lg flex items-center justify-center text-slate-700 dark:text-white hover:text-indigo-600">
                                        <Download className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={e => { e.stopPropagation(); handleDelete(asset.id); }}
                                        className="w-8 h-8 bg-red-500/90 backdrop-blur rounded-lg flex items-center justify-center text-white hover:bg-red-600"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-4 flex flex-col">
                                <h3 className="font-bold text-slate-800 dark:text-white text-sm line-clamp-1" title={asset.title}>{asset.title}</h3>
                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center text-xs font-medium text-slate-500">
                                        <Clock className="w-3 h-3 mr-1.5" /> {new Date(asset.created_at).toLocaleDateString()}
                                    </div>

                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                        {asset.model}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
