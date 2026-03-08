'use client';

import { useState, useEffect, useCallback } from 'react';
import { insforge } from '@/lib/insforge';
import {
    Megaphone, Wand2, Image as ImageIcon, FileText,
    BarChart3, Target, Sparkles, Play, StopCircle,
    TrendingUp, Users, Calendar, Copy, Check, ChevronDown, Building
} from 'lucide-react';
import { useMarketingContext } from '@/components/MarketingContext';

interface Client {
    id: number;
    name: string;
    sector: string;
    color: string;
}

interface Campaign {
    id: number;
    client_id: number;
    name: string;
    status: string;
    investment: string;
    reach: string;
    cpd_cpa: string;
}

export default function MarketingStudio() {
    const [activeTab, setActiveTab] = useState<'campaigns' | 'generate'>('generate');
    const [isGenerating, setIsGenerating] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [generatedContent, setGeneratedContent] = useState<boolean>(false);
    const [aiResponses, setAiResponses] = useState({ copies: [], audience: { interests: '', location: '', budget: '' }, base64Image: '' });
    const [isSaving, setIsSaving] = useState(false);

    // Consume Global Client Context
    const { activeClient, loading: clientLoading } = useMarketingContext();

    // Dynamic Campaign State
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loadingCampaigns, setLoadingCampaigns] = useState(false);
    const [aiSettings, setAiSettings] = useState<Record<string, string>>({
        default_marketing_model: 'anthropic/claude-3.5-haiku',
        default_image_model: 'google/gemini-3-pro-image-preview'
    });

    // Computed KPIs
    const totalInvestment = campaigns.reduce((sum, c) => sum + parseFloat((c.investment || '0').replace(/[€,]/g, '') || '0'), 0);
    const totalReach = campaigns.reduce((sum, c) => sum + parseInt((c.reach || '0').replace(/[K.]/g, (m) => m === 'K' ? '000' : '') || '0', 10), 0);
    const activeCampaigns = campaigns.filter(c => c.status === 'Activa' || c.status === 'Activo').length;

    const handleSaveCampaign = async () => {
        if (!prompt) return;

        setIsSaving(true);
        const title = prompt.length > 50 ? prompt.substring(0, 47) + '...' : prompt;

        const newCampaign = {
            client_id: activeClient?.id || null,
            name: title,
            status: 'Activa',
            investment: '\u20ac0.00',
            reach: '0',
            cpd_cpa: '-'
        };

        const { error } = await insforge.database
            .from('marketing_campaigns')
            .insert([newCampaign]);

        if (!error) {
            setPrompt('');
            setGeneratedContent(false);
            if (activeClient) {
                await fetchCampaigns(activeClient.id);
            }
            setActiveTab('campaigns');
        }
        setIsSaving(false);
    };

    const handleDeleteCampaign = async (id: number) => {
        if (!confirm('\u00bfEliminar esta campa\u00f1a permanentemente?')) return;
        const { error } = await insforge.database.from('marketing_campaigns').delete().eq('id', id);
        if (!error) setCampaigns(prev => prev.filter(c => c.id !== id));
    };

    const handleToggleCampaignStatus = async (campaign: Campaign) => {
        const newStatus = campaign.status === 'Activa' || campaign.status === 'Activo' ? 'Pausada' : 'Activa';
        const { error } = await insforge.database.from('marketing_campaigns').update({ status: newStatus }).eq('id', campaign.id);
        if (!error) setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, status: newStatus } : c));
    };

    const fetchData = useCallback(async () => {
        // Fetch AI Settings
        const { data: aiData } = await insforge.database.from('ai_settings').select('key, value');
        if (aiData) {
            const settingsMap = aiData.reduce((acc: any, item: any) => {
                acc[item.key] = item.value;
                return acc;
            }, {});
            setAiSettings(prev => ({ ...prev, ...settingsMap }));
        }
    }, []);

    const fetchCampaigns = useCallback(async (clientId: number | null) => {
        setLoadingCampaigns(true);
        let query = insforge.database
            .from('marketing_campaigns')
            .select('*')
            .order('created_at', { ascending: false });

        if (clientId) {
            query = query.eq('client_id', clientId);
        } else {
            query = query.is('client_id', null);
        }

        const { data } = await query;
        setCampaigns((data as Campaign[]) || []);
        setLoadingCampaigns(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        fetchCampaigns(activeClient?.id || null);
    }, [activeClient, fetchCampaigns]);

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsGenerating(true);
        setGeneratedContent(false);

        try {
            const { data, error } = await insforge.functions.invoke('marketing-copilot', {
                body: {
                    prompt,
                    clientName: activeClient?.name || 'Cliente Global',
                    clientSector: activeClient?.sector || 'General',
                    textModel: aiSettings.default_marketing_model,
                    imageModel: aiSettings.default_image_model
                }
            });

            if (error) {
                console.error("Error from Edge Function:", error);
                alert("Ocurrió un error generando la campaña. Por favor intenta nuevamente.");
            } else if (data && data.success) {
                setAiResponses({
                    copies: data.data.copies || [],
                    audience: data.data.audience || { interests: '', location: '', budget: '' },
                    base64Image: data.data.base64Image || ''
                });
                setGeneratedContent(true);
            }
        } catch (e) {
            console.error("Exception invoking Edge Function:", e);
        } finally {
            setIsGenerating(false);
        }
    };

    if (clientLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-[#0a0f1c]">
                <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-[#0a0f1c] transition-colors relative">
            {/* Background decorations */}
            <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-gradient-to-bl from-orange-500/10 via-rose-500/5 to-transparent blur-3xl rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-violet-500/10 via-fuchsia-500/5 to-transparent blur-3xl rounded-full pointer-events-none" />

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-8 relative z-10">
                <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
                    <button onClick={() => setActiveTab('generate')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'generate' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        <Sparkles className="w-4 h-4" /> Generador IA
                    </button>
                    <button onClick={() => setActiveTab('campaigns')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'campaigns' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        <BarChart3 className="w-4 h-4" /> Campañas
                    </button>
                </div>

                {activeTab === 'generate' && (
                    <div className="max-w-6xl mx-auto space-y-8">
                        {/* Input Hero Section */}
                        <div className="p-1 rounded-3xl bg-gradient-to-br from-orange-500/20 via-rose-500/20 to-violet-500/20 shadow-xl">
                            <div className="bg-white/90 dark:bg-[#0a0f1c]/90 rounded-[22px] p-8 backdrop-blur-xl border border-white/20 dark:border-white/5">
                                <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center mb-4">
                                    <Wand2 className="w-6 h-6 mr-3 text-orange-500" />
                                    ¿Qué quieres promocionar hoy{activeClient ? `, ${activeClient.name}` : ''}?
                                </h2>
                                <div className="flex items-end space-x-4">
                                    <div className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl flex items-end min-h-[60px] relative overflow-hidden focus-within:ring-2 focus-within:ring-orange-500/50 transition-all">
                                        <textarea
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                            placeholder={activeClient ? `Ej: Generar una campaña para ${activeClient.name} apuntando a nuestro sector principal...` : "Ej: Generar una campaña promocional para un nuevo producto ecosostenible..."}
                                            className="w-full bg-transparent border-none focus:ring-0 resize-none py-4 px-6 text-slate-900 dark:text-white placeholder:text-slate-500 max-h-40 text-base"
                                            rows={2}
                                        />
                                    </div>
                                    <button
                                        onClick={handleGenerate}
                                        disabled={isGenerating || !prompt}
                                        className={`h-[60px] px-8 rounded-2xl font-bold flex items-center justify-center shadow-lg transition-all text-white min-w-[160px]
                      ${isGenerating || !prompt
                                                ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-500 dark:text-slate-400 shadow-none'
                                                : 'bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-400 hover:to-rose-400 shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-0.5'
                                            }
                    `}
                                    >
                                        {isGenerating ? (
                                            <span className="flex items-center">
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Creando...
                                            </span>
                                        ) : (
                                            <span className="flex items-center">
                                                <Sparkles className="w-5 h-5 mr-2" />
                                                Generar Magia
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Generated Results - Only show after generation */}
                        {generatedContent && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                {/* Column 1: Copys & Texts */}
                                <div className="lg:col-span-1 space-y-6">
                                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center">
                                        <FileText className="w-5 h-5 mr-2 text-rose-500" />
                                        Copys Sugeridos
                                    </h3>

                                    {aiResponses.copies.map((copyText, i) => (
                                        <div key={i} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm hover:shadow-md dark:shadow-none transition-all group">
                                            <div className="flex justify-between items-start mb-3">
                                                <span className="text-xs font-bold uppercase tracking-wider text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded">Variación {i + 1}</span>
                                                <button className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-line">
                                                {copyText}
                                            </p>
                                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex gap-2">
                                                <span className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-white/5 rounded text-slate-500">Facebook</span>
                                                <span className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-white/5 rounded text-slate-500">Instagram</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Column 2 & 3: Assets & Audience */}
                                <div className="lg:col-span-2 space-y-8">
                                    {/* Audiencia */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center mb-6">
                                            <Target className="w-5 h-5 mr-2 text-orange-500" />
                                            Público Objetivo IA
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
                                                <h4 className="text-xs font-semibold text-slate-500 mb-1">Intereses</h4>
                                                <p className="font-medium text-slate-900 dark:text-white text-sm">{aiResponses.audience.interests}</p>
                                            </div>
                                            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
                                                <h4 className="text-xs font-semibold text-slate-500 mb-1">Ubicación</h4>
                                                <p className="font-medium text-slate-900 dark:text-white text-sm">{aiResponses.audience.location}</p>
                                            </div>
                                            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
                                                <h4 className="text-xs font-semibold text-slate-500 mb-1">Presupuesto Sugerido</h4>
                                                <p className="font-medium text-emerald-600 dark:text-emerald-400 text-sm">{aiResponses.audience.budget}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Creatividades Visuales */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center mb-6">
                                            <ImageIcon className="w-5 h-5 mr-2 text-fuchsia-500" />
                                            Imágenes Generadas
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* AI Generated Images array mapped to grid */}
                                            {aiResponses.base64Image ? (
                                                <div className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 hover:shadow-xl transition-all">
                                                    <img
                                                        src={aiResponses.base64Image}
                                                        alt="Generada por la IA"
                                                        className="w-full h-full object-cover"
                                                    />
                                                    {/* Hover Actions */}
                                                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-between">
                                                        <button className="text-xs font-medium text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg backdrop-blur-md transition-colors">Descargar</button>
                                                        <button className="text-xs font-medium text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-lg transition-colors">Aprobar</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="col-span-2 flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl text-slate-400">
                                                    <ImageIcon className="w-12 h-12 mb-4 opacity-50" />
                                                    <p className="text-sm font-medium">No se generaron imágenes válidas</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <button
                                            onClick={handleSaveCampaign}
                                            disabled={isSaving}
                                            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-3 rounded-xl font-bold flex items-center hover:shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-50"
                                        >
                                            <Target className="w-5 h-5 mr-2" />
                                            {isSaving ? 'Guardando...' : 'Guardar y Lanzar Campaña'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab 2: Dashboard de Campañas */}
                {activeTab === 'campaigns' && (
                    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {[
                                { title: 'Inversi\u00f3n Total', val: `\u20ac${totalInvestment.toLocaleString('es', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-violet-500' },
                                { title: 'Impresiones Est.', val: totalReach > 1000 ? `${(totalReach / 1000).toFixed(1)}K` : totalReach.toString(), icon: Megaphone, color: 'text-orange-500' },
                                { title: 'Campa\u00f1as Activas', val: activeCampaigns.toString(), icon: Target, color: 'text-rose-500' },
                                { title: 'Total Campa\u00f1as', val: campaigns.length.toString(), icon: Users, color: 'text-emerald-500' },
                            ].map((stat, i) => (
                                <div key={i} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{stat.val}</h3>
                                    <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                                </div>
                            ))}
                        </div>

                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Campañas Activas</h3>
                                <button className="text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300">Ver todas</button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre de Campa\u00f1a</th>
                                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Inversi\u00f3n</th>
                                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Alcance</th>
                                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">CPD / CPA</th>
                                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                                        {campaigns.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-sm text-slate-500">
                                                    No hay campa\u00f1as para este cliente. Utiliza el Generador IA para crear nuevas campa\u00f1as.
                                                </td>
                                            </tr>
                                        ) : (
                                            campaigns.map((row) => (
                                                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                                                    <td className="p-4 font-medium text-slate-900 dark:text-white">{row.name}</td>
                                                    <td className="p-4">
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${row.status === 'Activa' || row.status === 'Activo'
                                                            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400'
                                                            : row.status === 'Pausada'
                                                                ? 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400'
                                                                : 'text-slate-600 bg-slate-100 dark:bg-white/10 dark:text-slate-400'
                                                            }`}>
                                                            {row.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-sm text-slate-600 dark:text-slate-300">{row.investment || '-'}</td>
                                                    <td className="p-4 text-sm text-slate-600 dark:text-slate-300">{row.reach || '-'}</td>
                                                    <td className="p-4 text-sm font-medium text-slate-900 dark:text-white">{row.cpd_cpa || '-'}</td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => handleToggleCampaignStatus(row)}
                                                                title={row.status === 'Activa' || row.status === 'Activo' ? 'Pausar' : 'Activar'}
                                                                className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-500/10 text-slate-400 hover:text-amber-600 transition-colors"
                                                            >
                                                                {row.status === 'Activa' || row.status === 'Activo'
                                                                    ? <StopCircle className="w-4 h-4" />
                                                                    : <Play className="w-4 h-4" />}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteCampaign(row.id)}
                                                                title="Eliminar"
                                                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-600 transition-colors"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
