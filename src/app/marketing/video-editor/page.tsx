"use client";

import React, { useState } from 'react';
import {
    Video, Film, CheckCircle2, Mic, Music, LayoutGrid, Sparkles, UploadCloud, Volume2, VolumeX, ArrowRight, Play, Download, Clock, Image as ImageIcon
} from 'lucide-react';
import { useMarketingContext } from '@/components/MarketingContext';

const MODELS = [
    { id: 'veo3', name: 'Veo 3 (Calidad Cine)', ratios: ['16:9'], durations: ['5s'] },
    { id: 'sora2', name: 'Sora 2 (Ultra Realista)', ratios: ['16:9', '9:16', '1:1', '4:3', '3:4'], durations: ['5s', '10s', '15s', '30s'] },
    { id: 'kling3', name: 'Kling 3 (Dinámico)', ratios: ['16:9', '9:16', '1:1'], durations: ['5s', '10s'] }
];

type Scene = {
    id: number;
    visualPrompt: string;
    animationPrompt: string;
    hasSound: boolean;
    imageUrl: string | null;
    videoUrl: string | null;
};

export default function VideoEditor() {
    const { activeClient } = useMarketingContext();

    // Workflow Steps: config -> storyboard -> animation -> audio -> render
    const [step, setStep] = useState<'config' | 'storyboard' | 'animation' | 'audio' | 'render'>('config');

    // Step 1: Config
    const [generalPrompt, setGeneralPrompt] = useState('');
    const [sceneCount, setSceneCount] = useState<number>(3);
    const [model, setModel] = useState('kling3');
    const [ratio, setRatio] = useState('16:9');
    const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);

    // Step 2 & 3: Storyboard / Animation
    const [scenes, setScenes] = useState<Scene[]>([]);
    const [isGeneratingAnimations, setIsGeneratingAnimations] = useState(false);

    // Step 4: Audio
    const [voiceoverText, setVoiceoverText] = useState('');
    const [bgMusicPrompt, setBgMusicPrompt] = useState('');

    // Step 5: Render
    const [isRendering, setIsRendering] = useState(false);
    const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);

    const selectedModelConfig = MODELS.find(m => m.id === model) || MODELS[0];

    const generateStoryboard = () => {
        setIsGeneratingStoryboard(true);
        setTimeout(() => {
            const newScenes: Scene[] = Array.from({ length: sceneCount }).map((_, i) => ({
                id: i + 1,
                visualPrompt: `Escena ${i + 1}: ${generalPrompt || 'Toma cinemática'}`,
                animationPrompt: 'Movimiento de cámara suave hacia adelante',
                hasSound: false,
                imageUrl: `https://images.unsplash.com/photo-${1500000000000 + i}?w=400&h=200&fit=crop`, // placeholder simulado
                videoUrl: null
            }));
            setScenes(newScenes);
            setIsGeneratingStoryboard(false);
            setStep('storyboard');
        }, 2000);
    };

    const updateScene = (id: number, field: keyof Scene, value: any) => {
        setScenes(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const animateScenes = () => {
        setIsGeneratingAnimations(true);
        setTimeout(() => {
            setScenes(prev => prev.map(s => ({ ...s, videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' })));
            setIsGeneratingAnimations(false);
            setStep('audio');
        }, 3000);
    };

    const renderFinalVideo = () => {
        setIsRendering(true);
        setStep('render');
        setTimeout(() => {
            setFinalVideoUrl('https://www.w3schools.com/html/mov_bbb.mp4');
            setIsRendering(false);
        }, 4000);
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-[#0a0f1c]">
            {/* Header / Stepper */}
            <div className="bg-white dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/10 p-4 px-6 flex items-center justify-between shrink-0">
                <div className="font-bold flex items-center text-lg">
                    <Video className="w-5 h-5 mr-2 text-violet-500" />
                    Generación de Vídeo IA Completa
                </div>

                <div className="flex items-center space-x-2 text-sm font-medium">
                    {['config', 'storyboard', 'animation', 'audio', 'render'].map((s, i) => {
                        const labels = ['Config.', 'Storyboard', 'Animación', 'Audio', 'Final'];
                        const isActive = step === s;
                        const isPast = ['config', 'storyboard', 'animation', 'audio', 'render'].indexOf(step) > i;

                        return (
                            <div key={s} className="flex items-center">
                                <div className={`flex items-center justify-center px-3 py-1.5 rounded-full transition-colors ${isActive ? 'bg-violet-500 text-white shadow-md' :
                                    isPast ? 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400' :
                                        'bg-slate-100 text-slate-400 dark:bg-slate-800'
                                    }`}>
                                    {isPast && <CheckCircle2 className="w-4 h-4 mr-1.5" />}
                                    {labels[i]}
                                </div>
                                {i < 4 && <ArrowRight className="w-4 h-4 mx-2 text-slate-300 dark:text-slate-700" />}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 relative">
                <div className="max-w-4xl mx-auto w-full">

                    {/* STEP 1: CONFIG */}
                    {step === 'config' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Tema o Descripción General (Prompt)</label>
                                    <textarea
                                        value={generalPrompt}
                                        onChange={(e) => setGeneralPrompt(e.target.value)}
                                        placeholder="Ej: Un anuncio dinámico para una inmobiliaria que muestre casas de lujo..."
                                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-white resize-none outline-none"
                                        rows={4}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Modelo Generativo Base</label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {MODELS.map(m => (
                                                <button
                                                    key={m.id}
                                                    onClick={() => {
                                                        setModel(m.id);
                                                        if (!m.ratios.includes(ratio)) setRatio(m.ratios[0]);
                                                    }}
                                                    className={`p-3 text-left border rounded-xl transition-colors ${model === m.id ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                                >
                                                    <div className="font-bold text-sm">{m.name}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Cantidad de Escenas (Imágenes base)</label>
                                            <input
                                                type="range" min="1" max="6"
                                                value={sceneCount} onChange={e => setSceneCount(parseInt(e.target.value))}
                                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-500"
                                            />
                                            <div className="text-right text-xs font-bold text-violet-500 mt-1">{sceneCount} Escenas</div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Formato (Aspect Ratio)</label>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedModelConfig.ratios.map(r => (
                                                    <button
                                                        key={r}
                                                        onClick={() => setRatio(r)}
                                                        className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${ratio === r ? 'bg-violet-500 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                            }`}
                                                    >
                                                        {r}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={generateStoryboard}
                                disabled={isGeneratingStoryboard || !generalPrompt}
                                className="w-full py-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white rounded-2xl font-bold shadow-lg shadow-violet-500/20 transition-all transform hover:scale-[1.01] disabled:opacity-50 flex items-center justify-center text-lg"
                            >
                                {isGeneratingStoryboard ? (
                                    <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" /> Generando Storyboard...</>
                                ) : (
                                    <>Comenzar: Generar Storyboard <ArrowRight className="w-5 h-5 ml-2" /></>
                                )}
                            </button>
                        </div>
                    )}

                    {/* STEP 2: STORYBOARD */}
                    {step === 'storyboard' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center">
                                <LayoutGrid className="w-6 h-6 mr-3 text-violet-500" /> Storyboard Generado
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400">Revisa las imágenes base para cada escena. Aquí puedes editar el prompt visual que define la toma antes de proceder a la animación.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {scenes.map((scene, idx) => (
                                    <div key={scene.id} className="bg-white dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col group">
                                        <div className="relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-4 aspect-video">
                                            {scene.imageUrl ? (
                                                <img src={scene.imageUrl} alt={`Escena ${idx + 1}`} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex items-center justify-center w-full h-full text-slate-400"><ImageIcon className="w-8 h-8 opacity-50" /></div>
                                            )}
                                            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur text-white text-xs px-3 py-1 rounded-full font-bold">
                                                Escena {scene.id}
                                            </div>
                                        </div>
                                        <div className="flex-1 flex flex-col">
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Prompt Visual / Imagen</label>
                                            <textarea
                                                value={scene.visualPrompt}
                                                onChange={e => updateScene(scene.id, 'visualPrompt', e.target.value)}
                                                className="w-full flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-violet-500 text-slate-700 dark:text-slate-300 resize-none outline-none mb-3"
                                                rows={3}
                                            />
                                            <button className="text-xs font-bold text-violet-500 hover:text-violet-600 self-start flex items-center">
                                                <Sparkles className="w-3 h-3 mr-1" /> Regenerar Imagen
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => setStep('animation')}
                                className="w-full py-4 bg-slate-800 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold hover:bg-slate-700 dark:hover:bg-slate-100 transition-colors flex items-center justify-center text-lg mt-8"
                            >
                                Aprobar Storyboard y Continuar <ArrowRight className="w-5 h-5 ml-2" />
                            </button>
                        </div>
                    )}

                    {/* STEP 3: ANIMATION */}
                    {step === 'animation' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center">
                                <Film className="w-6 h-6 mr-3 text-violet-500" /> Animación de Escenas
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400">Ahora configuraremos cómo se moverá cada imagen. Puedes activar el sonido nativo de la animación si lo deseas (efectos de sonido ambientales).</p>

                            <div className="space-y-6">
                                {scenes.map((scene, idx) => (
                                    <div key={scene.id} className="bg-white dark:bg-slate-900/50 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-6">
                                        <div className="w-full md:w-64 shrink-0 relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 aspect-video">
                                            <img src={scene.imageUrl!} alt={`Escena ${idx + 1}`} className="w-full h-full object-cover opacity-80" />
                                            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur text-white text-xs px-3 py-1 rounded-full font-bold">Escena {scene.id}</div>
                                        </div>
                                        <div className="flex-1 flex flex-col justify-center space-y-4">
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Prompt de Movimiento / Animación</label>
                                                <input
                                                    type="text"
                                                    value={scene.animationPrompt}
                                                    onChange={e => updateScene(scene.id, 'animationPrompt', e.target.value)}
                                                    placeholder="Ej: Zoom in lento, paneo a la derecha"
                                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-violet-500 text-slate-700 dark:text-slate-300 outline-none"
                                                />
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={() => updateScene(scene.id, 'hasSound', !scene.hasSound)}
                                                    className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${scene.hasSound
                                                        ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400'
                                                        : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                                                        }`}
                                                >
                                                    {scene.hasSound ? <Volume2 className="w-4 h-4 mr-2" /> : <VolumeX className="w-4 h-4 mr-2" />}
                                                    FX de Sonido Autogenerado
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={animateScenes}
                                disabled={isGeneratingAnimations}
                                className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all transform hover:scale-[1.01] disabled:opacity-50 flex items-center justify-center text-lg mt-8"
                            >
                                {isGeneratingAnimations ? (
                                    <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" /> Animando Escenas...</>
                                ) : (
                                    <>Animar a Vídeo (Render Múltiple) <ArrowRight className="w-5 h-5 ml-2" /></>
                                )}
                            </button>
                        </div>
                    )}

                    {/* STEP 4: AUDIO */}
                    {step === 'audio' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center">
                                <Music className="w-6 h-6 mr-3 text-pink-500" /> Post-Producción de Audio
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400">El vídeo principal está listo. Añade de forma opcional una voz en off global y una banda sonora de fondo usando Suno / ElevenLabs.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Voiceover */}
                                <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                                    <div className="flex items-center mb-4">
                                        <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-500/20 flex items-center justify-center mr-3 text-cyan-600 dark:text-cyan-400"><Mic className="w-5 h-5" /></div>
                                        <h3 className="font-bold text-slate-800 dark:text-white text-lg">Voz en Off (Locución)</h3>
                                    </div>
                                    <textarea
                                        value={voiceoverText}
                                        onChange={e => setVoiceoverText(e.target.value)}
                                        placeholder="Guión completo para la voz en off..."
                                        className="w-full flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm focus:ring-2 focus:ring-cyan-500 text-slate-700 dark:text-slate-300 resize-none outline-none mb-4"
                                        rows={5}
                                    />
                                    <button className="text-sm font-bold text-cyan-500 hover:text-cyan-600 border border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/10 py-2 rounded-xl w-full">Configurar Voz IA (ElevenLabs)</button>
                                </div>

                                {/* Background Music */}
                                <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                                    <div className="flex items-center mb-4">
                                        <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center mr-3 text-pink-600 dark:text-pink-400"><Music className="w-5 h-5" /></div>
                                        <h3 className="font-bold text-slate-800 dark:text-white text-lg">Música de Fondo</h3>
                                    </div>
                                    <textarea
                                        value={bgMusicPrompt}
                                        onChange={e => setBgMusicPrompt(e.target.value)}
                                        placeholder="Estilo musical y ritmo, ej: Instrumental épico y emocional que sube de ritmo al final..."
                                        className="w-full flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm focus:ring-2 focus:ring-pink-500 text-slate-700 dark:text-slate-300 resize-none outline-none mb-4"
                                        rows={5}
                                    />
                                    <button className="text-sm font-bold text-pink-500 hover:text-pink-600 border border-pink-200 dark:border-pink-500/30 bg-pink-50 dark:bg-pink-500/10 py-2 rounded-xl w-full">Generar Pista (Suno V4)</button>
                                </div>
                            </div>

                            <button
                                onClick={renderFinalVideo}
                                className="w-full py-4 bg-slate-800 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold shadow-lg transition-all transform hover:scale-[1.01] flex items-center justify-center text-lg mt-8"
                            >
                                Unir Audio y Video: Renderizar Final <Play className="w-5 h-5 ml-2 fill-current" />
                            </button>
                        </div>
                    )}

                    {/* STEP 5: RENDER */}
                    {step === 'render' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center justify-center">
                                <Sparkles className="w-6 h-6 mr-3 text-yellow-500" /> Resultado Final
                            </h2>

                            {isRendering ? (
                                <div className="flex flex-col items-center justify-center py-24 px-6 text-center bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800">
                                    <div className="w-16 h-16 border-4 border-slate-200 border-t-violet-500 rounded-full animate-spin mb-6"></div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Componiendo la obra de arte...</h3>
                                    <p className="text-slate-500 max-w-sm">El sistema está uniendo el modelo de video, el audio, las transiciones y sincronizando la locución. Puede tardar un poco.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center space-y-6">
                                    <div className="w-full bg-black rounded-3xl overflow-hidden shadow-2xl aspect-video border border-slate-800">
                                        <video
                                            src={finalVideoUrl!}
                                            controls
                                            autoPlay
                                            className="w-full h-full object-contain"
                                        />
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <button className="flex items-center px-8 py-3.5 bg-violet-500 hover:bg-violet-600 text-white rounded-xl font-bold shadow-lg shadow-violet-500/20 transition-all">
                                            <Download className="w-5 h-5 mr-2" /> Descargar Producción (MP4)
                                        </button>
                                        <button onClick={() => setStep('config')} className="flex items-center px-8 py-3.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-xl font-bold transition-all">
                                            Crear Nuevo
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Historial Reciente */}
            <div className="h-40 border-t border-slate-200 dark:border-white/10 p-4 bg-white/50 dark:bg-white/[0.02] shrink-0 overflow-x-auto">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-2" /> Historial Reciente
                </h3>
                <div className="flex gap-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="w-48 h-24 shrink-0 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 relative group cursor-pointer hover:border-violet-500 transition-colors bg-black">
                            <img src={`https://images.unsplash.com/photo-${1600000000000 + i}?w=400&h=200&fit=crop`} alt="History" className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Play className="w-6 h-6 text-white" />
                            </div>
                            <div className="absolute bottom-1 right-2 text-[10px] text-white font-bold bg-black/40 px-1.5 rounded">
                                00:05
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
