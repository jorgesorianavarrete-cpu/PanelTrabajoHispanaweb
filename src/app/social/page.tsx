'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { insforge } from '@/lib/insforge';
import {
    Share2, Calendar as CalendarIcon, FileEdit,
    BarChart2, Instagram, Facebook, Linkedin, Twitter,
    Sparkles, Check, Clock, Plus, Image as ImageIcon,
    MoreHorizontal, ChevronDown, Building, Loader2, Trash2,
    MessageCircle, Heart, Reply, Send, GripVertical, Wand2
} from 'lucide-react';
import { useResizable } from '@/hooks/use-resizable';

interface Client {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    city?: string;
    sector?: string;
    website_url?: string;
    sitemap_url?: string;
    blog_map_url?: string;
    context_info?: string;
    wp_url?: string;
    wp_api_key?: string;
}

interface Post {
    id: number;
    client_id: string;
    content: string;
    platforms: string[];
    media_url: string | null;
    status: string;
    publish_at: string;
    is_completed?: boolean;
}

interface Article {
    id: number;
    client_id: string;
    title: string;
    content_html?: string;
    image_url?: string;
    status: string;
    metadata?: any;
    created_at?: string;
    is_completed?: boolean;
}

export default function SocialMediaApp() {
    const [activeTab, setActiveTab] = useState<'calendar' | 'create' | 'suggestions'>('suggestions');
    const [platformFilter, setPlatformFilter] = useState<'all' | 'instagram' | 'linkedin' | 'facebook' | 'wordpress' | 'gmb'>('all');
    const [articles, setArticles] = useState<any[]>([]);
    const [aiSettings, setAiSettings] = useState<Record<string, string>>({
        default_social_model: 'anthropic/claude-3.5-haiku',
        default_image_model: 'google/gemini-3-pro-image-preview'
    });

    // Dynamic Client and Post State
    const [clients, setClients] = useState<Client[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [activeClient, setActiveClient] = useState<string | null>(null);
    const [isClientMenuOpen, setIsClientMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    // Form State
    const [postContent, setPostContent] = useState('');
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram', 'facebook']);
    const [publishDate, setPublishDate] = useState<string>(new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10));
    const [isSaving, setIsSaving] = useState(false);
    const [isAiImproving, setIsAiImproving] = useState(false);
    const [titleCount, setTitleCount] = useState<number>(10);
    const [selectedImageModel, setSelectedImageModel] = useState('flux-1-1-pro');
    const [additionalHtml, setAdditionalHtml] = useState('');
    const [isFrequencyModalOpen, setIsFrequencyModalOpen] = useState(false);
    const [weeklySchedule, setWeeklySchedule] = useState({ fb_per_week: 0, ig_per_week: 0, gmb_per_week: 0, blog_per_week: 0, video_per_week: 0 });

    // Interactions
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [isInteractionsOpen, setIsInteractionsOpen] = useState(false);
    const [suggestedReplies, setSuggestedReplies] = useState<Record<string, string>>({});
    const [isSuggesting, setIsSuggesting] = useState<string | null>(null);
    const [searchTopic, setSearchTopic] = useState('');

    const { width: interactionsWidth, startResizing: startResizingInteractions } = useResizable({
        initialWidth: 450,
        minWidth: 350,
        maxWidth: 700,
        storageKey: 'social-interactions-width',
    });

    const { width: previewWidth, startResizing: startResizingPreview } = useResizable({
        initialWidth: 320,
        minWidth: 280,
        maxWidth: 450,
        storageKey: 'social-preview-width',
    });

    // Interaction state - initialized with empty data for production readiness
    const [interactions, setInteractions] = useState<{ id: string; user: string; text: string; time: string; }[]>([]);
    const [stats, setStats] = useState({ likes: '0', comments: '0', shares: '0' });
    const handleSuggestReply = async (commentId: string, text: string) => {
        setIsSuggesting(commentId);
        try {
            const res = await insforge.ai.chat.completions.create({
                model: 'anthropic/claude-3.5-haiku',
                messages: [
                    { role: 'user', content: `Sugiere una respuesta breve, profesional y amable para este comentario de redes sociales. Usa un tono cercano. Comentario: "${text}". Devuelve SOLO el texto de respuesta.` }
                ]
            });
            const reply = res?.choices?.[0]?.message?.content || '';
            setSuggestedReplies(prev => ({ ...prev, [commentId]: reply }));
        } catch { /* silence AI error */ }
        setIsSuggesting(null);
    };

    const currentClient = clients.find(c => c.id === activeClient) || clients[0];
    const clientName = currentClient ? `${currentClient.first_name} ${currentClient.last_name || ''}` : 'Cliente';

    // Compute current week days (Mon-Fri)
    const getWeekDays = () => {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0=Sun
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        return Array.from({ length: 5 }).map((_, i) => {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            return d;
        });
    };
    const weekDays = getWeekDays();
    const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    const currentMonthYear = weekDays[0].toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    const togglePlatform = (platformId: string) => {
        setSelectedPlatforms(prev =>
            prev.includes(platformId) ? prev.filter(p => p !== platformId) : [...prev, platformId]
        );
    };

    const fetchWeeklySchedule = async (clientId: string) => {
        const { data } = await insforge.database.from('social_client_schedules').select('*').eq('client_id', clientId).single();
        if (data) setWeeklySchedule(data);
        else setWeeklySchedule({ fb_per_week: 0, ig_per_week: 0, gmb_per_week: 0, blog_per_week: 0, video_per_week: 0 });
    };

    const handleSaveFrequency = async () => {
        if (!activeClient) return;
        const { error } = await insforge.database.from('social_client_schedules').upsert({
            client_id: activeClient,
            ...weeklySchedule,
            updated_at: new Date().toISOString()
        });
        if (error) alert('Error: ' + error.message);
        else {
            alert('Frecuencia guardada con éxito.');
            setIsFrequencyModalOpen(false);
        }
    };

    const handleSavePost = async (status: string) => {
        if (!activeClient || !postContent || selectedPlatforms.length === 0) return;

        setIsSaving(true);
        const publishAt = publishDate ? new Date(publishDate).toISOString() : new Date(Date.now() + 2 * 86400000).toISOString();

        const newPost = {
            client_id: activeClient,
            content: postContent,
            platforms: selectedPlatforms,
            status: status,
            publish_at: publishAt
        };

        const { error } = await insforge.database
            .from('social_posts')
            .insert([newPost]);

        if (!error) {
            setPostContent('');
            setSelectedPlatforms(['instagram', 'facebook']);
            await fetchPosts(activeClient);
            setActiveTab('calendar');
        }
        setIsSaving(false);
    };

    const handleDeletePost = async (id: number) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta publicación?')) return;
        await insforge.database.from('social_posts').delete().eq('id', id);
        setPosts(prev => prev.filter(p => p.id !== id));
    };

    const handleAiImprove = async () => {
        if (!postContent.trim() || isAiImproving) return;
        setIsAiImproving(true);
        try {
            const aiRes = await insforge.ai.chat.completions.create({
                model: 'anthropic/claude-3.5-haiku',
                messages: [
                    { role: 'system', content: 'Eres un experto en marketing digital y redes sociales. Mejora el siguiente texto para que sea más atractivo, con emojis relevantes y llamadas a la acción. Devuelve SOLO el texto mejorado, sin explicaciones ni comillas.' },
                    { role: 'user', content: postContent }
                ]
            });
            const improved = aiRes?.choices?.[0]?.message?.content;
            if (improved) setPostContent(improved);
        } catch {
            // silently fail if AI is unavailable
        }
        setIsAiImproving(false);
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        const { data: clientsData } = await insforge.database
            .from('crm_clients')
            .select('*')
            .order('first_name', { ascending: true });

        if (clientsData && clientsData.length > 0) {
            setClients(clientsData as Client[]);
            if (!activeClient && clientsData.length > 0) setActiveClient(clientsData[0].id);
        }

        // Fetch AI Settings
        const { data: aiData } = await insforge.database.from('ai_settings').select('key, value');
        if (aiData) {
            const settingsMap = aiData.reduce((acc: any, item: any) => {
                acc[item.key] = item.value;
                return acc;
            }, {});
            setAiSettings(prev => ({ ...prev, ...settingsMap }));
        }

        setLoading(false);
    }, [activeClient]);

    const fetchArticles = useCallback(async (clientId: string) => {
        const { data: articlesData } = await insforge.database
            .from('social_articles')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false });

        if (articlesData) setArticles(articlesData as Article[]);
    }, []);

    const fetchPosts = useCallback(async (clientId: string) => {
        const { data } = await insforge.database
            .from('social_posts')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false });

        setPosts((data as Post[]) || []);
    }, []);

    const handleImproveWithAi = async () => {
        if (!activeClient || !currentClient || !selectedPost) return;
        setIsAiImproving(true);
        try {
            const { data } = await insforge.functions.invoke('marketing-copilot', {
                body: {
                    action: 'improve_copy',
                    content: selectedPost.content,
                    clientName: clientName,
                    clientSector: currentClient.sector
                }
            });
            if (data?.success) setSelectedPost({ ...selectedPost, content: data.data.improved });
        } finally {
            setIsAiImproving(false);
        }
    };

    const handleGenerateSuggestions = async () => {
        if (!activeClient || !currentClient) return;
        setIsSaving(true);
        try {
            const { data } = await insforge.functions.invoke('marketing-copilot', {
                body: {
                    action: searchTopic ? 'search_ideas' : 'get_suggestions',
                    clientName: clientName,
                    clientSector: currentClient.sector,
                    clientContext: currentClient.context_info,
                    websiteUrl: currentClient.website_url,
                    blogMapUrl: currentClient.blog_map_url,
                    topic: searchTopic,
                    count: titleCount,
                    textModel: aiSettings.default_social_model
                }
            });

            if (data?.success && data.data.suggestions) {
                const newArticles = data.data.suggestions.map((s: any) => ({
                    client_id: activeClient,
                    title: s.title,
                    status: 'Sugerencia',
                    metadata: { reasoning: s.reasoning, strategy: s.strategy }
                }));

                await insforge.database.from('social_articles').insert(newArticles);
                await fetchArticles(activeClient);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleWriteArticle = async (articleId: number, title: string) => {
        setIsSaving(true);
        try {
            const { data } = await insforge.functions.invoke('marketing-copilot', {
                body: {
                    prompt: `Redactar un artículo completo, SEO optimizado de más de 2000 palabras sobre: ${title}`,
                    clientName: clientName,
                    clientSector: currentClient.sector,
                    clientContext: currentClient.context_info,
                    additionalHtml: additionalHtml,
                    textModel: aiSettings.default_social_model,
                    imageModel: selectedImageModel,
                    isArticle: true,
                    fullGen: true
                }
            });

            if (data?.success) {
                const { article, social_copies, base64Image } = data.data;
                await insforge.database.from('social_articles').update({
                    content_html: article.content,
                    social_copies: social_copies,
                    image_url: base64Image,
                    status: 'Borrador'
                }).eq('id', articleId);
                if (activeClient) await fetchArticles(activeClient);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteArticle = async (id: number) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta sugerencia?')) return;
        await insforge.database.from('social_articles').delete().eq('id', id);
        setArticles((prev: any[]) => prev.filter((article: any) => article.id !== id));
    };

    const handlePublishArticle = async (article: Article) => {
        if (!activeClient || !currentClient) return;
        setIsSaving(true);
        try {
            // 1. Publish to WordPress if credentials exist
            if (currentClient.wp_url && currentClient.wp_api_key) {
                console.log('Publicando en WordPress...', currentClient.wp_url);
                // Implementation would go here calling WP REST API
            }

            // 2. Publish/Schedule for Social Media
            if (article.status === 'Borrador' && article.content_html) {
                // In a real scenario, we'd use the social copies generated with the article
                const copies = article.metadata?.social_copies || [article.title, article.title, article.title];
                const newPosts = [
                    { client_id: activeClient, content: copies[0] || '', platforms: ['linkedin'], status: 'Programado', publish_at: new Date().toISOString() },
                    { client_id: activeClient, content: copies[1] || '', platforms: ['instagram'], status: 'Programado', publish_at: new Date().toISOString() },
                    { client_id: activeClient, content: copies[2] || '', platforms: ['facebook'], status: 'Programado', publish_at: new Date().toISOString() },
                ];
                await insforge.database.from('social_posts').insert(newPosts);
            }

            // 3. Mark article as published
            await insforge.database.from('social_articles').update({ status: 'Publicado', is_completed: true }).eq('id', article.id);

            alert('¡Artículo y publicaciones en redes programados con éxito!');
            await fetchArticles(activeClient);
        } catch (e: any) {
            alert('Error al publicar: ' + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const toggleCompletePost = async (post: Post) => {
        const { error } = await insforge.database.from('social_posts').update({ is_completed: !post.is_completed }).eq('id', post.id);
        if (!error && activeClient) fetchPosts(activeClient);
    };

    const toggleCompleteArticle = async (article: Article) => {
        const { error } = await insforge.database.from('social_articles').update({ is_completed: !article.is_completed }).eq('id', article.id);
        if (!error && activeClient) fetchArticles(activeClient);
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (activeClient) {
            fetchPosts(activeClient);
            fetchArticles(activeClient);
        }
    }, [activeClient, fetchPosts, fetchArticles]);

    if (loading || !currentClient) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-[#0a0f1c]">
                <div className="w-8 h-8 rounded-full border-2 border-pink-500 border-t-transparent animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-[#0a0f1c] transition-colors relative">
            {/* Background aesthetics */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-pink-500/10 via-rose-500/5 to-transparent blur-3xl rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-fuchsia-500/10 via-purple-500/5 to-transparent blur-3xl rounded-full pointer-events-none" />

            {/* Header Tipo Tickets */}
            <header className="flex-none px-6 py-4 border-b border-slate-200 dark:border-slate-800 relative z-10 w-full bg-slate-50/50 dark:bg-[#0B1121] backdrop-blur-md">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Share2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Contenido RRSS</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Generación y programación inteligente</p>
                        </div>
                    </div>

                    {/* Client Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setIsClientMenuOpen(!isClientMenuOpen)}
                            className="flex items-center bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-white/10 transition-colors shadow-sm"
                        >
                            <Building className="w-4 h-4 mr-2 text-slate-400" />
                            <span className="text-slate-900 dark:text-white mr-2">{clientName}</span>
                            <span className="text-xs bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full mr-2 hidden sm:inline-block">
                                {currentClient.sector || 'Sin sector'}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isClientMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isClientMenuOpen && (
                            <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-[#1a2235] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-50 overflow-hidden py-1 max-h-64 overflow-y-auto">
                                {clients.map(client => (
                                    <button
                                        key={client.id}
                                        onClick={() => { setActiveClient(client.id); setIsClientMenuOpen(false); }}
                                        className={`w-full text-left px-4 py-3 flex items-center hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${activeClient === client.id ? 'bg-blue-50 dark:bg-blue-500/10' : ''}`}
                                    >
                                        <div className={`w-3 h-3 rounded-full bg-blue-500 mr-3 shadow-sm`} />
                                        <div>
                                            <div className={`text-sm font-medium ${activeClient === client.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                {client.first_name} {client.last_name}
                                            </div>
                                            <div className="text-xs text-slate-500">{client.sector}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-1 relative z-10">
                    <button onClick={() => setActiveTab('suggestions')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'suggestions' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        <Sparkles className="w-4 h-4" /> Sugerencias IA
                    </button>
                    <button onClick={() => setActiveTab('calendar')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'calendar' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        <CalendarIcon className="w-4 h-4" /> Calendario
                    </button>
                    <button onClick={() => setActiveTab('create')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'create' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        <FileEdit className="w-4 h-4" /> Crear Posts
                    </button>
                </div>
            </header>

            {/* Main Area */}
            <div className="flex-1 overflow-y-auto p-8 relative z-10">

                {/* Tab: Sugerencias IA */}
                {activeTab === 'suggestions' && (
                    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-purple-500" />
                                    Cazador de Tendencias & Títulos
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">Busca temas virales o genera títulos magnéticos para {clientName}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <select
                                    value={titleCount}
                                    onChange={(e) => setTitleCount(parseInt(e.target.value))}
                                    className="bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-600 dark:text-slate-300 focus:outline-none"
                                >
                                    <option value={10}>10 Títulos</option>
                                    <option value={20}>20 Títulos</option>
                                    <option value={30}>30 Títulos</option>
                                </select>
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                    <input
                                        type="text"
                                        value={searchTopic}
                                        onChange={(e) => setSearchTopic(e.target.value)}
                                        placeholder="Ej: Tendencias Inmobiliarias 2026"
                                        className="relative w-80 bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/50 focus:outline-none transition-all"
                                    />
                                </div>
                                <button
                                    onClick={handleGenerateSuggestions}
                                    disabled={isSaving}
                                    className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2.5 rounded-xl font-bold flex items-center hover:shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Wand2 className="w-5 h-5 mr-2" />}
                                    {searchTopic ? 'Generar Títulos' : 'Sugerir Temas'}
                                </button>
                            </div>
                        </div>

                        {articles.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-white/5 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl text-slate-400">
                                <div className="w-16 h-16 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center mb-4">
                                    <Sparkles className="w-8 h-8 opacity-50 text-purple-500" />
                                </div>
                                <p className="text-lg font-medium text-slate-600 dark:text-slate-300">No hay sugerencias todavía</p>
                                <p className="text-sm mt-1 max-w-sm text-center">La IA analizará el sector, contexto y sitemap de {clientName} para proponer títulos únicos.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {articles.map((article: Article) => (
                                    <div key={article.id} className="group bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden hover:shadow-xl transition-all flex flex-col h-full ring-pink-500/20 hover:ring-4">
                                        <div className="p-6 flex-1">
                                            <div className="flex justify-between items-start mb-4">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${article.status === 'Sugerencia' ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                                                    {article.status}
                                                </span>
                                                <button onClick={() => handleDeleteArticle(article.id)} className="text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 line-clamp-2 leading-tight">{article.title}</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3">
                                                {article.metadata?.reasoning || 'Sugerencia optimizada para este sector.'}
                                            </p>

                                            {article.status === 'Borrador' && article.image_url && (
                                                <div className="mt-4 aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-white/10">
                                                    <img src={article.image_url} alt={article.title} className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                                            {article.status === 'Sugerencia' ? (
                                                <div className="space-y-3">
                                                    <div className="flex gap-2">
                                                        <select
                                                            value={selectedImageModel}
                                                            onChange={(e) => setSelectedImageModel(e.target.value)}
                                                            className="flex-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-2 py-1.5 text-[10px] text-slate-600 dark:text-slate-400"
                                                        >
                                                            <option value="flux-1-1-pro">FLUX 1.1 Pro</option>
                                                            <option value="kolors">Kolors</option>
                                                            <option value="ideogram-v2">Ideogram v2</option>
                                                            <option value="recraft-v3">Recraft v3</option>
                                                        </select>
                                                    </div>
                                                    <button
                                                        onClick={() => handleWriteArticle(article.id, article.title)}
                                                        disabled={isSaving}
                                                        className="w-full py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-sm font-bold flex items-center justify-center hover:bg-slate-50 dark:hover:bg-white/10 transition-colors shadow-sm"
                                                    >
                                                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-pink-500" /> : <Wand2 className="w-4 h-4 mr-2 text-pink-500" />}
                                                        Generar Artículo (+2000 palabras)
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex space-x-2">
                                                        <button className="flex-1 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors">
                                                            Editar HTML
                                                        </button>
                                                        <button
                                                            onClick={() => handlePublishArticle(article)}
                                                            disabled={isSaving}
                                                            className="flex-1 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                                                        >
                                                            Publicar en WP / RRSS
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab 1: Calendario */}
                {activeTab === 'calendar' && (
                    <div className="max-w-7xl mx-auto flex gap-6 animate-in fade-in duration-500">
                        {/* Calendar Sidebar */}
                        <div className="w-64 shrink-0 space-y-6">
                            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <BarChart2 className="w-4 h-4 text-blue-500" />
                                    Categorías
                                </h3>
                                <div className="space-y-2">
                                    {[
                                        { label: 'Blog Articles', count: articles.length, color: 'bg-emerald-500' },
                                        { label: 'Social Posts', count: posts.length, color: 'bg-blue-500' },
                                        { label: 'Videos', count: 0, color: 'bg-red-500' },
                                    ].map(cat => (
                                        <div key={cat.label} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${cat.color}`} />
                                                <span className="text-xs text-slate-600 dark:text-slate-400">{cat.label}</span>
                                            </div>
                                            <span className="text-xs font-bold text-slate-400">{cat.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-orange-500" />
                                    Próximos Eventos
                                </h3>
                                <div className="space-y-4">
                                    <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20">
                                        <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase">Mañana</p>
                                        <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">Lanzamiento Campaña</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">Automático: 3 posts + 1 blog</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
                                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">Vie, 14 Mar</p>
                                        <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">Revisión de Métricas</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">Analizar engagement semanal</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Calendar Main View */}
                        <div className="flex-1 space-y-6">

                            {/* Calendar Controls */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white capitalize">{currentMonthYear}</h2>
                                    <div className="flex space-x-1 border border-slate-200 dark:border-white/10 rounded-lg p-0.5 bg-white dark:bg-[#0a0f1c]">
                                        <button className="px-3 py-1 text-sm font-medium rounded-md bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white">Semana</button>
                                        <button className="px-3 py-1 text-sm font-medium rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">Mes</button>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-3">
                                    <div className="flex bg-white dark:bg-[#0a0f1c] border border-slate-200 dark:border-white/10 rounded-lg p-1">
                                        {[
                                            { id: 'all', icon: Share2, color: 'text-slate-500' },
                                            { id: 'instagram', icon: Instagram, color: 'text-pink-500' },
                                            { id: 'linkedin', icon: Linkedin, color: 'text-blue-500' },
                                            { id: 'facebook', icon: Facebook, color: 'text-blue-600' }
                                        ].map((p: any) => (
                                            <button
                                                key={p.id}
                                                onClick={() => setPlatformFilter(p.id as any)}
                                                className={`p-2 rounded-md transition-colors ${platformFilter === p.id ? 'bg-slate-100 dark:bg-white/10 shadow-sm' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}
                                            >
                                                <p.icon className={`w-4 h-4 ${p.id === 'all' && platformFilter !== 'all' ? 'text-slate-400' : p.color}`} />
                                            </button>
                                        ))}
                                    </div>
                                    <button onClick={() => setActiveTab('create')} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-lg font-medium flex items-center hover:shadow-lg transition-all hover:-translate-y-0.5">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Nuevo Post
                                    </button>
                                </div>
                            </div>

                            {/* Calendar Grid (Weekly View Mockup) */}
                            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
                                <div className="grid grid-cols-5 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
                                    {weekDays.map((day, i) => {
                                        const isToday = day.toDateString() === new Date().toDateString();
                                        const dayNum = day.getDate();
                                        const dayLabel = `${DAY_NAMES[i]} ${dayNum}`;
                                        return (
                                            <div key={i} className={`p-4 text-center font-medium text-sm ${isToday ? 'text-pink-600 dark:text-pink-400 font-bold border-b-2 border-pink-500' : 'text-slate-600 dark:text-slate-300'} border-r border-slate-200 dark:border-white/10 last:border-0`}>
                                                {dayLabel}
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="grid grid-cols-5 min-h-[500px] divide-x divide-slate-200 dark:divide-white/10">
                                    {weekDays.map((day: Date, colIdx: number) => {
                                        const dayPosts = posts.filter((p: any) => {
                                            const pubDate = new Date(p.publish_at);
                                            return pubDate.toDateString() === day.toDateString();
                                        });
                                        const dayArticles = articles.filter((a: any) => {
                                            const pubDate = new Date(a.publish_at || a.created_at);
                                            return pubDate.toDateString() === day.toDateString();
                                        });
                                        const allDayItems = [...dayPosts.map(p => ({ ...p, type: 'post' })), ...dayArticles.map(a => ({ ...a, type: 'article' }))];

                                        return (
                                            <div key={colIdx} className="p-2 space-y-2">
                                                {allDayItems.sort((a, b) => new Date(a.publish_at || a.created_at).getTime() - new Date(b.publish_at || b.created_at).getTime()).map((item: any) => (
                                                    <div
                                                        key={`${item.type}-${item.id}`}
                                                        className={`bg-white dark:bg-[#0a0f1c] border-2 ${item.is_completed ? 'opacity-60 border-emerald-500/30' : item.status === 'Programado' ? 'border-pink-200 dark:border-pink-500/30 shadow-sm' : 'border-slate-200 dark:border-white/10'} rounded-xl p-3 hover:border-pink-500/50 transition-all relative overflow-hidden group`}
                                                    >
                                                        {item.status === 'Programado' && !item.is_completed && <div className="absolute top-0 left-0 w-1 h-full bg-pink-500" />}
                                                        {item.is_completed && <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />}

                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center space-x-1">
                                                                {item.type === 'post' ? (
                                                                    <>
                                                                        {(item.platforms as string[]).includes('instagram') && <Instagram className="w-3.5 h-3.5 text-pink-500" />}
                                                                        {(item.platforms as string[]).includes('facebook') && <Facebook className="w-3.5 h-3.5 text-blue-600" />}
                                                                        {(item.platforms as string[]).includes('linkedin') && <Linkedin className="w-3.5 h-3.5 text-blue-500" />}
                                                                    </>
                                                                ) : (
                                                                    <FileEdit className="w-3.5 h-3.5 text-emerald-500" />
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={() => item.type === 'post' ? toggleCompletePost(item) : toggleCompleteArticle(item)}
                                                                    className={`p-1 rounded-full transition-colors ${item.is_completed ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-400 hover:text-emerald-500'}`}
                                                                >
                                                                    <Check className="w-3 h-3" />
                                                                </button>
                                                                <button
                                                                    onClick={() => item.type === 'post' ? handleDeletePost(item.id) : handleDeleteArticle(item.id)}
                                                                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-red-500 transition-all"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <p className={`text-xs font-medium line-clamp-3 ${item.is_completed ? 'line-through text-slate-400' : item.status === 'Programado' ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                                                            {item.type === 'post' ? item.content : item.title}
                                                        </p>

                                                        {item.type === 'post' && item.status === 'Publicado' && (
                                                            <button
                                                                onClick={(e: any) => { e.stopPropagation(); setSelectedPost(item); setIsInteractionsOpen(true); }}
                                                                className="mt-3 w-full py-1.5 bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 text-[10px] font-bold rounded-lg border border-pink-200 dark:border-pink-500/20 hover:bg-pink-100 transition-colors flex items-center justify-center shadow-sm"
                                                            >
                                                                <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Ver Interacciones
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                {allDayItems.length === 0 && (
                                                    <button onClick={() => setActiveTab('create')} className="w-full h-16 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl flex items-center justify-center text-slate-300 hover:text-pink-400 hover:border-pink-400/50 transition-colors">
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'create' && (
                    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 flex h-[calc(100vh-12rem)] space-x-6">

                        {/* Editor Side */}
                        <div className="flex-1 flex flex-col space-y-6">

                            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Nuevo Post</h3>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={handleAiImprove}
                                            disabled={!postContent.trim() || isAiImproving}
                                            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                                        >
                                            {isAiImproving ? <Loader2 className="w-4 h-4 text-pink-500 animate-spin" /> : <Sparkles className="w-4 h-4 text-pink-500" />}
                                            <span className="text-xs font-medium">{isAiImproving ? 'Mejorando...' : 'Mejorar con IA'}</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Plataformas</label>
                                        <div className="flex space-x-3">
                                            {[
                                                { id: 'instagram', icon: Instagram, name: 'Instagram', color: 'text-pink-500' },
                                                { id: 'facebook', icon: Facebook, name: 'Facebook', color: 'text-blue-600' },
                                                { id: 'linkedin', icon: Linkedin, name: 'LinkedIn', color: 'text-blue-500' },
                                                { id: 'twitter', icon: Twitter, name: 'X (Twitter)', color: 'text-slate-900 dark:text-white' },
                                            ].map((p) => {
                                                const isSel = selectedPlatforms.includes(p.id);
                                                return (
                                                    <button
                                                        key={p.id}
                                                        onClick={() => togglePlatform(p.id)}
                                                        className={`flex items-center px-4 py-2 rounded-xl border transition-all ${isSel ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/10' : 'border-slate-200 dark:border-white/10 bg-transparent hover:bg-slate-50 dark:hover:bg-white/5'}`}
                                                    >
                                                        <p.icon className={`w-4 h-4 mr-2 ${isSel ? p.color : 'text-slate-400'}`} />
                                                        <span className={`text-sm font-medium ${isSel ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{p.name}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Contenido</label>
                                        <div className="relative">
                                            <textarea
                                                value={postContent}
                                                onChange={(e) => setPostContent(e.target.value)}
                                                className="w-full h-32 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-pink-500/50 focus:outline-none resize-none transition-all"
                                                placeholder="¿Qué quieres compartir con tu audiencia hoy? Escribe aquí o usa el botón de IA para auto-generar..."
                                            />
                                            <div className="absolute bottom-3 right-3 flex items-center space-x-2">
                                                <span className="text-xs text-slate-400">{postContent.length} / 2200</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Fecha de publicación</label>
                                        <input
                                            type="date"
                                            value={publishDate}
                                            onChange={(e) => setPublishDate(e.target.value)}
                                            min={new Date().toISOString().slice(0, 10)}
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-pink-500/50 focus:outline-none transition-all"
                                        />
                                    </div>
                                    <div className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer">
                                        <div className="w-12 h-12 bg-white dark:bg-[#0a0f1c] rounded-full flex items-center justify-center shadow-sm mb-3">
                                            <ImageIcon className="w-6 h-6 text-slate-400" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Clica o arrastra tus imágenes/videos aquí</p>
                                        <p className="text-xs text-slate-500">Soporta JPG, PNG, MP4 (Max. 10MB)</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-between items-center border-t border-slate-200 dark:border-white/10 pt-6">
                                <button
                                    onClick={() => handleSavePost('Borrador')}
                                    disabled={isSaving || !postContent}
                                    className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors disabled:opacity-50"
                                >
                                    Guardar Borrador
                                </button>
                                <div className="flex space-x-3">
                                    <button
                                        onClick={() => handleSavePost('Programado')}
                                        disabled={isSaving || !postContent || selectedPlatforms.length === 0}
                                        className="px-6 py-2 rounded-xl text-sm font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 transition-colors disabled:opacity-50"
                                    >
                                        Programar
                                    </button>
                                    <button
                                        onClick={() => handleSavePost('Publicado')}
                                        disabled={isSaving || !postContent || selectedPlatforms.length === 0}
                                        className="px-6 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 hover:-translate-y-0.5 transition-all disabled:opacity-50"
                                    >
                                        {isSaving ? 'Guardando...' : 'Publicar Ahora'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Preview Side */}
                        <div
                            style={{ width: previewWidth }}
                            className="shrink-0 hidden lg:block relative"
                        >
                            {/* Resize Handle */}
                            <div
                                onMouseDown={startResizingPreview}
                                className="absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-pink-500/50 transition-colors z-20 group border-l border-transparent hover:border-pink-500/50"
                            >
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <GripVertical className="w-3 h-3 text-pink-500" />
                                </div>
                            </div>

                            <div className="sticky top-0 bg-white dark:bg-[#0a0f1c] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-4 shadow-xl shadow-slate-200/50 dark:shadow-none h-[650px] overflow-hidden flex flex-col ml-4">
                                {/* Mobile notch mockup */}
                                <div className="h-6 w-full flex justify-center mb-4">
                                    <div className="w-32 h-6 bg-slate-100 dark:bg-white/10 rounded-b-3xl"></div>
                                </div>

                                <div className="flex items-center justify-between px-2 mb-4">
                                    <div className="flex items-center space-x-2">
                                        <div className={`w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold leading-none`}>
                                            {currentClient?.first_name?.substring(0, 1) || 'C'}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{clientName}</p>
                                            <p className="text-[10px] text-slate-500">Patrocinado</p>
                                        </div>
                                    </div>
                                    <MoreHorizontal className="w-4 h-4 text-slate-400" />
                                </div>

                                <div className="flex-1 bg-slate-100 dark:bg-white/5 rounded-xl mb-4 overflow-hidden relative flex items-center justify-center text-slate-400">
                                    <ImageIcon className="w-8 h-8 opacity-50" />
                                    <span className="absolute text-xs opacity-50">Vista previa imagen</span>
                                </div>

                                <div className="px-2 pb-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex space-x-3">
                                            <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-white/30"></div>
                                            <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-white/30"></div>
                                            <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-white/30"></div>
                                        </div>
                                        <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-white/30"></div>
                                    </div>
                                    <p className="text-xs text-slate-900 dark:text-white leading-relaxed line-clamp-3">
                                        <span className="font-bold mr-1">{currentClient?.first_name}</span>
                                        {postContent || 'Escribe un post para previsualizarlo aquí...'}
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>

            {/* INTERACTIONS SIDEBAR */}
            {isInteractionsOpen && selectedPost && (
                <div
                    style={{ width: interactionsWidth }}
                    className="fixed inset-y-0 right-0 bg-white dark:bg-[#0f1629] border-l border-slate-200 dark:border-white/10 shadow-2xl z-[60] flex flex-col animate-in slide-in-from-right duration-300"
                >
                    {/* Resize Handle */}
                    <div
                        onMouseDown={startResizingInteractions}
                        className="absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-pink-500/50 transition-colors z-[70] group"
                    >
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <GripVertical className="w-3 h-3 text-pink-500" />
                        </div>
                    </div>
                    <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-start bg-slate-50/50 dark:bg-white/[0.02]">
                        <div className="flex-1 mr-4 overflow-hidden">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Interacciones</h2>
                            <p className="text-xs text-slate-500 truncate">{selectedPost.content}</p>
                        </div>
                        <button onClick={() => setIsInteractionsOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all">
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* Stats Section */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'Likes', value: stats.likes, icon: Heart, color: 'text-rose-500' },
                                { label: 'Comments', value: stats.comments, icon: MessageCircle, color: 'text-blue-500' },
                                { label: 'Shares', value: stats.shares, icon: Share2, color: 'text-emerald-500' },
                            ].map((stat, i) => (
                                <div key={i} className="bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-100 dark:border-white/5 text-center">
                                    <stat.icon className={`w-4 h-4 mx-auto mb-1 ${stat.color}`} />
                                    <div className="text-lg font-bold text-slate-900 dark:text-white">{stat.value}</div>
                                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{stat.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Comments Section */}
                        <div className="space-y-6">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Comentarios Recientes</h3>

                            <div className="space-y-6">
                                {interactions.length > 0 ? (
                                    interactions.map((comment) => (
                                        <div key={comment.id} className="space-y-3">
                                            <div className="flex items-start space-x-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                                    {comment.user.charAt(1).toUpperCase()}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-sm font-bold text-slate-900 dark:text-white">{comment.user}</span>
                                                        <span className="text-[10px] text-slate-400">{comment.time}</span>
                                                    </div>
                                                    <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-100 dark:border-white/5">
                                                        {comment.text}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Suggested Reply Area */}
                                            <div className="ml-11">
                                                {suggestedReplies[comment.id] ? (
                                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                                        <div className="p-3 bg-pink-50/50 dark:bg-pink-500/5 border border-pink-100 dark:border-pink-500/20 rounded-xl relative">
                                                            <div className="text-[10px] font-bold text-pink-600 dark:text-pink-400 uppercase tracking-tighter mb-1 flex items-center">
                                                                <Sparkles className="w-3 h-3 mr-1" /> Sugerencia IA
                                                            </div>
                                                            <p className="text-sm text-slate-800 dark:text-slate-200 italic">"{suggestedReplies[comment.id]}"</p>
                                                        </div>
                                                        <div className="flex space-x-2">
                                                            <button className="flex-1 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center">
                                                                <Send className="w-3.5 h-3.5 mr-2" /> Usar Respuesta
                                                            </button>
                                                            <button
                                                                onClick={() => handleSuggestReply(comment.id, comment.text)}
                                                                className="px-3 py-2 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
                                                            >
                                                                Regenerar
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleSuggestReply(comment.id, comment.text)}
                                                        disabled={isSuggesting === comment.id}
                                                        className="flex items-center space-x-2 text-xs font-bold text-pink-600 dark:text-pink-400 hover:text-pink-700 transition-colors disabled:opacity-50"
                                                    >
                                                        {isSuggesting === comment.id ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <Reply className="w-3.5 h-3.5" />
                                                        )}
                                                        <span>{isSuggesting === comment.id ? 'Pensando...' : 'Sugerir Respuesta con IA'}</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-white/[0.02]">
                                        <MessageCircle className="w-10 h-10 mb-3 opacity-20" />
                                        <p className="text-sm font-medium">Sin interacciones registradas</p>
                                        <p className="text-[10px] mt-1 px-8 text-center">Las interacciones de redes sociales aparecerán aquí una vez que se sincronicen vía webhook.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Frecuencia / Programación Automática Modal */}
            <div className="fixed bottom-8 right-8 z-40">
                <button
                    onClick={() => { if (activeClient) { fetchWeeklySchedule(activeClient); setIsFrequencyModalOpen(true); } else alert('Selecciona un cliente primero'); }}
                    className="bg-white dark:bg-[#1a2235] border border-slate-200 dark:border-white/10 p-4 rounded-2xl shadow-2xl flex items-center gap-3 hover:scale-105 transition-transform group"
                >
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                        <CalendarIcon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <p className="text-xs text-slate-500 font-medium">Frecuencia Semanal</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {weeklySchedule.fb_per_week + weeklySchedule.ig_per_week + weeklySchedule.gmb_per_week + weeklySchedule.blog_per_week + weeklySchedule.video_per_week > 0
                                ? `Plan Activo (${weeklySchedule.fb_per_week + weeklySchedule.ig_per_week + weeklySchedule.gmb_per_week + weeklySchedule.blog_per_week + weeklySchedule.video_per_week} total)`
                                : 'Click para configurar'}
                        </p>
                    </div>
                </button>
            </div>

            {isFrequencyModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#0f1629] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white text-center">Configurar Frecuencia Semanal</h2>
                            <button onClick={() => setIsFrequencyModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600"><XIcon className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-xs text-slate-500 mb-4 text-center italic">Define cuántos contenidos generar y publicar automáticamente para {clientName}.</p>

                            {[
                                { label: 'Facebook', key: 'fb_per_week', color: 'bg-blue-600' },
                                { label: 'Instagram', key: 'ig_per_week', color: 'bg-pink-600' },
                                { label: 'Google Business', key: 'gmb_per_week', color: 'bg-orange-500' },
                                { label: 'Artículos Blog', key: 'blog_per_week', color: 'bg-emerald-500' },
                                { label: 'Videos Shors/Reels', key: 'video_per_week', color: 'bg-red-500' },
                            ].map(item => (
                                <div key={item.key} className="flex items-center justify-between bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-100 dark:border-white/5 transition-all hover:shadow-md">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-8 rounded-full ${item.color}`} />
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setWeeklySchedule(prev => ({ ...prev, [item.key]: Math.max(0, (prev as any)[item.key] - 1) }))}
                                            className="w-8 h-8 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:bg-slate-50"
                                        >-</button>
                                        <span className="w-8 text-center font-bold text-slate-900 dark:text-white">{(weeklySchedule as any)[item.key]}</span>
                                        <button
                                            onClick={() => setWeeklySchedule(prev => ({ ...prev, [item.key]: (prev as any)[item.key] + 1 }))}
                                            className="w-8 h-8 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:bg-slate-50"
                                        >+</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-200 dark:border-white/10 flex gap-3">
                            <button onClick={() => setIsFrequencyModalOpen(false)} className="flex-1 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 transition-colors">Cancelar</button>
                            <button onClick={handleSaveFrequency} className="flex-1 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">Guardar Plan</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function XIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    );
}
