'use client';

import { useState, useEffect } from 'react';
import { insforge } from '@/lib/insforge';
import {
    Sparkles, Save, Bot, Cpu, Zap,
    Settings, Shield, Globe, Image as ImageIcon,
    LayoutPanelLeft, Check, AlertCircle, Loader2
} from 'lucide-react';

interface AISetting {
    key: string;
    value: string;
}

const AVAILABLE_MODELS = [
    { id: 'anthropic/claude-sonnet-4.5', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', icon: Bot, desc: 'Ideal para redacción creativa y SEO.' },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', icon: Zap, desc: 'Rápido y eficiente para tareas cortas.' },
    { id: 'google/gemini-3-pro-image-preview', name: 'Gemini 3 Pro', provider: 'Google', icon: ImageIcon, desc: 'Excelente para generación de imágenes y visión.' },
    { id: 'deepseek/deepseek-v3.2', name: 'DeepSeek V3', provider: 'DeepSeek', icon: Cpu, desc: 'Alta capacidad de razonamiento técnico.' },
];

export default function AISettingsPage() {
    const [settings, setSettings] = useState<Record<string, string>>({
        default_marketing_model: 'anthropic/claude-sonnet-4.5',
        default_social_model: 'anthropic/claude-sonnet-4.5',
        default_image_model: 'google/gemini-3-pro-image-preview',
        gemini_api_key: '',
        openai_api_key: '',
        anthropic_api_key: '',
        kie_api_key: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    useEffect(() => {
        async function fetchSettings() {
            setLoading(true);
            const { data, error } = await insforge.database
                .from('ai_settings')
                .select('key, value');

            if (data) {
                const settingsMap = data.reduce((acc: any, item: any) => {
                    acc[item.key] = item.value;
                    return acc;
                }, {});
                setSettings(prev => ({ ...prev, ...settingsMap }));
            }
            setLoading(false);
        }
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setStatus(null);

        try {
            const updates = Object.entries(settings).map(([key, value]) => ({
                key, value, updated_at: new Date().toISOString()
            }));

            const { error } = await insforge.database
                .from('ai_settings')
                .upsert(updates, { onConflict: 'key' });

            if (error) throw error;

            setStatus({ type: 'success', msg: 'Configuración guardada correctamente' });
            setTimeout(() => setStatus(null), 3000);
        } catch (err: any) {
            setStatus({ type: 'error', msg: `Error al guardar: ${err.message}` });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-[#0a0f1c]">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-[#0a0f1c] relative">
            {/* Background Aesthetics */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-purple-500/10 via-indigo-500/5 to-transparent blur-3xl rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-blue-500/10 via-purple-500/5 to-transparent blur-3xl rounded-full pointer-events-none" />

            {/* Header */}
            <header className="h-20 border-b border-slate-200 dark:border-white/10 flex items-center justify-between px-8 shrink-0 relative z-10 backdrop-blur-md bg-white/50 dark:bg-transparent">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20 text-white">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Configuración de IA</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Gestiona los modelos y proveedores de inteligencia artificial</p>
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    {status && (
                        <div className={`flex items-center px-4 py-2 rounded-lg text-xs font-medium animate-in fade-in slide-in-from-right-4 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-red-50 text-red-600 border border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'}`}>
                            {status.type === 'success' ? <Check className="w-4 h-4 mr-2" /> : <AlertCircle className="w-4 h-4 mr-2" />}
                            {status.msg}
                        </div>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2.5 rounded-xl font-bold flex items-center hover:shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Guardar Cambios
                    </button>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 relative z-10">
                <div className="max-w-4xl mx-auto space-y-8">

                    {/* Model Selection Groups */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        {/* Marketing Model */}
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm flex flex-col">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center mb-6">
                                <LayoutPanelLeft className="w-5 h-5 mr-3 text-purple-500" />
                                Marketing Studio
                            </h3>
                            <div className="space-y-4 flex-1">
                                <p className="text-sm text-slate-500 mb-4">Modelo predeterminado para generar copys publicitarios y segmentación de audiencia.</p>
                                <div className="grid grid-cols-1 gap-2">
                                    {AVAILABLE_MODELS.map((model) => (
                                        <button
                                            key={model.id}
                                            onClick={() => setSettings({ ...settings, default_marketing_model: model.id })}
                                            className={`flex items-center p-4 rounded-2xl border transition-all text-left ${settings.default_marketing_model === model.id ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10 ring-1 ring-purple-500/50' : 'border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center mr-4">
                                                <model.icon className={`w-5 h-5 ${settings.default_marketing_model === model.id ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-bold text-slate-900 dark:text-white">{model.name}</div>
                                                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{model.provider}</div>
                                            </div>
                                            {settings.default_marketing_model === model.id && <Check className="w-5 h-5 text-purple-500" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Social Media Model */}
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm flex flex-col">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center mb-6">
                                <Globe className="w-5 h-5 mr-3 text-indigo-500" />
                                Contenido RRSS
                            </h3>
                            <div className="space-y-4 flex-1">
                                <p className="text-sm text-slate-500 mb-4">Modelo predeterminado para redactar artículos de blog y posts en redes sociales.</p>
                                <div className="grid grid-cols-1 gap-2">
                                    {AVAILABLE_MODELS.map((model) => (
                                        <button
                                            key={model.id}
                                            onClick={() => setSettings({ ...settings, default_social_model: model.id })}
                                            className={`flex items-center p-4 rounded-2xl border transition-all text-left ${settings.default_social_model === model.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 ring-1 ring-indigo-500/50' : 'border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center mr-4">
                                                <model.icon className={`w-5 h-5 ${settings.default_social_model === model.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-bold text-slate-900 dark:text-white">{model.name}</div>
                                                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{model.provider}</div>
                                            </div>
                                            {settings.default_social_model === model.id && <Check className="w-5 h-5 text-indigo-500" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Image Model */}
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm flex flex-col md:col-span-2">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center mb-6">
                                <ImageIcon className="w-5 h-5 mr-3 text-pink-500" />
                                Generación de Imágenes
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {AVAILABLE_MODELS.filter(m => m.provider === 'Google' || m.provider === 'OpenAI').map((model) => (
                                    <button
                                        key={model.id}
                                        onClick={() => setSettings({ ...settings, default_image_model: model.id })}
                                        className={`flex items-center p-4 rounded-2xl border transition-all text-left ${settings.default_image_model === model.id ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/10 ring-1 ring-pink-500/50' : 'border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center mr-4">
                                            <model.icon className={`w-5 h-5 ${settings.default_image_model === model.id ? 'text-pink-600 dark:text-pink-400' : 'text-slate-400'}`} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-bold text-slate-900 dark:text-white">{model.name}</div>
                                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{model.provider}</div>
                                        </div>
                                        {settings.default_image_model === model.id && <Check className="w-5 h-5 text-pink-500" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* API Keys Configuration */}
                    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center mb-6">
                            <Shield className="w-5 h-5 mr-3 text-emerald-500" />
                            Credenciales y API Keys
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                            Configura las claves de acceso para los proveedores de IA que impulsan el módulo de Marketing y Redes Sociales.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Google Gemini API Key</label>
                                <input
                                    type="password"
                                    value={settings.gemini_api_key || ''}
                                    onChange={(e) => setSettings({ ...settings, gemini_api_key: e.target.value })}
                                    placeholder="AIzaSy..."
                                    className="w-full bg-slate-50 dark:bg-[#0a0f1c] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                                />
                                <p className="text-xs text-slate-400 mt-2">Requerida para Imagen Generativa y Visión.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">OpenAI API Key</label>
                                <input
                                    type="password"
                                    value={settings.openai_api_key || ''}
                                    onChange={(e) => setSettings({ ...settings, openai_api_key: e.target.value })}
                                    placeholder="sk-..."
                                    className="w-full bg-slate-50 dark:bg-[#0a0f1c] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                                />
                                <p className="text-xs text-slate-400 mt-2">Requerida para GPT-4 y locuciones TTS.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Anthropic API Key</label>
                                <input
                                    type="password"
                                    value={settings.anthropic_api_key || ''}
                                    onChange={(e) => setSettings({ ...settings, anthropic_api_key: e.target.value })}
                                    placeholder="sk-ant-..."
                                    className="w-full bg-slate-50 dark:bg-[#0a0f1c] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                                />
                                <p className="text-xs text-slate-400 mt-2">Requerida para modelos Claude (Copys y Social).</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">KIE.AI API Key</label>
                                <input
                                    type="password"
                                    value={settings.kie_api_key || ''}
                                    onChange={(e) => setSettings({ ...settings, kie_api_key: e.target.value })}
                                    placeholder="sk-kie-..."
                                    className="w-full bg-slate-50 dark:bg-[#0a0f1c] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                                />
                                <p className="text-xs text-slate-400 mt-2">Requerida para Sora, Kling3, Veo3 y Suno.</p>
                            </div>
                        </div>
                    </div>

                    {/* Advanced Settings Placeholder */}
                    <div className="bg-slate-900 dark:bg-white/5 rounded-3xl p-8 text-white">
                        <div className="flex items-start space-x-6">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                                <Shield className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold mb-2">Seguridad y Privacidad</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Todas las solicitudes a los modelos de IA se realizan de forma segura a través de los servidores de InsForge. Las API Keys y los datos de entrenamiento están protegidos bajo estándares de nivel bancario.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
