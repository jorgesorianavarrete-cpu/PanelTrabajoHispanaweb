'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Search, Bot, MoreVertical, Paperclip, Smile, Send, Check, CheckCheck,
    UserCircle, Zap, MessageCircle, Loader2, QrCode, GripVertical, Plus, X, Trash2,
    Archive, Pin, BellOff, Edit3, Image as ImageIcon, File, Mic, MapPin, Phone,
    RefreshCw, Settings, Users, Reply, Trash, TicketCheck
} from 'lucide-react';
import { useResizable } from '@/hooks/use-resizable';
import { insforge } from '@/lib/insforge';
import { createClient } from '@supabase/supabase-js';
import { QRCodeSVG } from 'qrcode.react';

const supabaseRealtime = createClient(
    process.env.NEXT_PUBLIC_INSFORGE_BASE_URL || '',
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || ''
);

// ─── Types ────────────────────────────────────────────────────────────────────
interface Thread {
    id: string; account_id: string; name: string; phone_number?: string;
    avatar?: string; color?: string; last_message?: string; unread_count: number;
    is_archived: boolean; is_pinned: boolean; is_muted: boolean; updated_at: string;
    online?: boolean;
}

interface Message {
    id: string; chat_id: string; text: string; sender: 'me' | 'them';
    status: string; media_type?: string; media_url?: string; media_data?: string;
    media_mime_type?: string; message_type?: string; reaction_emoji?: string;
    quoted_msg_id?: string; quoted_content?: string; quoted_from?: string;
    is_deleted?: boolean; created_at: string;
}

interface Account {
    id: string; name: string; type: string; status: string;
    phone_number?: string; is_connected?: boolean; created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function adaptiveTime(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 86400 && d.getDate() === now.getDate()) return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    if (diff < 172800) return 'Ayer';
    if (diff < 604800) return ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d.getDay()];
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function initials(name: string) { return name.slice(0, 2).toUpperCase(); }

const GRADIENTS = ['from-emerald-400 to-teal-500', 'from-violet-400 to-purple-500', 'from-blue-400 to-cyan-500', 'from-orange-400 to-red-500', 'from-pink-400 to-rose-500'];
function threadColor(id: string) { return GRADIENTS[id.charCodeAt(0) % GRADIENTS.length]; }

// ─── MessageBubble ─────────────────────────────────────────────────────────
function MessageBubble({ msg, onReact, onReply, onDelete, onCreateTicket, allMessages }: {
    msg: Message; onReact: (id: string, emoji: string) => void;
    onReply: (msg: Message) => void; onDelete: (id: string) => void;
    onCreateTicket: (msg: Message) => void;
    allMessages: Message[];
}) {
    const isMe = msg.sender === 'me';
    const [showActions, setShowActions] = useState(false);
    const quoted = msg.quoted_msg_id ? allMessages.find(m => m.id === msg.quoted_msg_id) : null;
    const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

    const renderContent = () => {
        if (msg.is_deleted) return <p className="text-xs italic opacity-60">🚫 Mensaje eliminado</p>;
        switch (msg.message_type) {
            case 'image': return msg.media_url || msg.media_data ? (
                <img src={msg.media_url || `data:image/jpeg;base64,${msg.media_data}`} alt="img" className="max-w-[200px] rounded-xl" />
            ) : <p className="text-sm">📷 Imagen</p>;
            case 'audio': return <audio controls className="max-w-[220px]" src={msg.media_url || `data:audio/mpeg;base64,${msg.media_data}`} />;
            case 'video': return <video controls className="max-w-[220px] rounded-xl" src={msg.media_url} />;
            case 'document': return (
                <div className="flex items-center gap-2 py-1">
                    <File className="w-5 h-5 opacity-70" />
                    <a href={msg.media_url} target="_blank" className="text-sm underline underline-offset-2">Descargar documento</a>
                </div>
            );
            case 'location': return <div className="flex items-center gap-2 py-1"><MapPin className="w-4 h-4" /><span className="text-sm">Ubicación</span></div>;
            case 'sticker': return <img src={msg.media_url} alt="sticker" className="w-16 h-16" />;
            default: return <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>;
        }
    };

    return (
        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
            onMouseEnter={() => setShowActions(true)} onMouseLeave={() => setShowActions(false)}>
            {/* Quoted message */}
            {quoted && (
                <div className={`max-w-[70%] mb-1 px-3 py-1.5 rounded-lg border-l-4 text-xs opacity-80 ${isMe ? 'border-emerald-300 bg-emerald-700/30 text-emerald-100' : 'border-slate-400 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                    <p className="font-semibold mb-0.5">{quoted.sender === 'me' ? 'Tú' : 'Contacto'}</p>
                    <p className="truncate">{quoted.text || '📎 Media'}</p>
                </div>
            )}
            <div className="flex items-end gap-2">
                {!isMe && (
                    <div className={`flex-none transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'} flex gap-1`}>
                        <button onClick={() => onReply(msg)} className="p-1 rounded text-slate-400 hover:text-slate-600"><Reply className="w-3.5 h-3.5" /></button>
                        <button onClick={() => onCreateTicket(msg)} title="Crear Ticket" className="p-1 rounded text-slate-400 hover:text-blue-500"><TicketCheck className="w-3.5 h-3.5" /></button>
                    </div>
                )}
                <div className="relative">
                    <div className={`max-w-[75%] lg:max-w-[60%] px-4 py-2.5 shadow-sm ${isMe ? 'bg-emerald-600 text-white rounded-2xl rounded-tr-sm' : 'bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-white/90 border border-slate-200 dark:border-white/5 rounded-2xl rounded-tl-sm'}`}>
                        {renderContent()}
                    </div>
                    {msg.reaction_emoji && (
                        <span className="absolute -bottom-3 right-0 text-base">{msg.reaction_emoji}</span>
                    )}
                </div>
                {isMe && (
                    <div className={`flex-none transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'} flex gap-1`}>
                        <button onClick={() => onReply(msg)} className="p-1 rounded text-slate-400 hover:text-slate-600"><Reply className="w-3.5 h-3.5" /></button>
                        <button onClick={() => onDelete(msg.id)} className="p-1 rounded text-slate-400 hover:text-red-500"><Trash className="w-3.5 h-3.5" /></button>
                        <button onClick={() => onCreateTicket(msg)} title="Crear Ticket" className="p-1 rounded text-slate-400 hover:text-blue-500"><TicketCheck className="w-3.5 h-3.5" /></button>
                    </div>
                )}
            </div>
            {/* Reaction picker */}
            {showActions && !msg.is_deleted && (
                <div className={`mt-1 flex gap-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {REACTIONS.map(e => (
                        <button key={e} onClick={() => onReact(msg.id, e)} className="text-sm hover:scale-125 transition-transform">{e}</button>
                    ))}
                </div>
            )}
            <div className="flex items-center mt-1 gap-1">
                <span className="text-[10px] text-slate-400">{new Date(msg.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                {isMe && (msg.status === 'read' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Check className="w-3.5 h-3.5 text-slate-400" />)}
            </div>
        </div>
    );
}

// ─── ThreadItem ─────────────────────────────────────────────────────────────
function ThreadItem({ thread, active, onClick, onAction }: {
    thread: Thread; active: boolean;
    onClick: () => void; onAction: (action: string, val?: any) => void;
}) {
    const [menu, setMenu] = useState(false);
    const color = thread.color || threadColor(thread.id);
    return (
        <div onClick={onClick}
            className={`relative p-4 border-b border-slate-200 dark:border-white/5 cursor-pointer transition-colors flex items-start gap-3 ${active ? 'bg-emerald-50 dark:bg-white/10 border-l-2 border-l-emerald-500' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}>
            <div className={`w-12 h-12 rounded-full bg-gradient-to-tr ${color} flex items-center justify-center text-white font-bold shrink-0 shadow`}>
                {initials(thread.name)}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-1 mb-0.5">
                    <h4 className={`text-sm truncate ${thread.unread_count > 0 ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                        {thread.is_pinned && '📌 '}{thread.name}
                    </h4>
                    <span className={`text-[10px] shrink-0 ${thread.unread_count > 0 ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                        {adaptiveTime(thread.updated_at)}
                    </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {thread.is_muted && '🔇 '}{thread.last_message || '...'}
                    </p>
                    {thread.unread_count > 0 && (
                        <span className="shrink-0 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{thread.unread_count}</span>
                    )}
                </div>
            </div>
            <button onClick={e => { e.stopPropagation(); setMenu(!menu); }}
                className="opacity-0 group-hover:opacity-100 shrink-0 p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 transition-all">
                <MoreVertical className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {menu && (
                <div className="absolute right-2 top-10 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl py-1 w-44" onClick={e => e.stopPropagation()}>
                    {[
                        { label: 'Renombrar', icon: Edit3, action: 'rename' },
                        { label: thread.is_archived ? 'Desarchivar' : 'Archivar', icon: Archive, action: 'archive' },
                        { label: thread.is_pinned ? 'Desfijar' : 'Fijar', icon: Pin, action: 'pin' },
                        { label: thread.is_muted ? 'Activar' : 'Silenciar', icon: BellOff, action: 'mute' },
                    ].map(({ label, icon: Icon, action }) => (
                        <button key={action} onClick={() => { onAction(action); setMenu(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                            <Icon className="w-4 h-4 text-slate-400" />{label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function WhatsAppPage() {
    const [tab, setTab] = useState<'chats' | 'accounts' | 'config'>('chats');
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [filterAccount, setFilterAccount] = useState<string>('all');
    const [showArchived, setShowArchived] = useState(false);
    const [threads, setThreads] = useState<Thread[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [draft, setDraft] = useState('');
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const [sending, setSending] = useState(false);
    const [loadingThreads, setLoadingThreads] = useState(true);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState('');
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [newAccName, setNewAccName] = useState('');
    const [newAccType, setNewAccType] = useState<'qr' | 'twilio'>('qr');
    const [newAccConfig, setNewAccConfig] = useState<any>({});
    const [showNewAcc, setShowNewAcc] = useState(false);
    const [renameVal, setRenameVal] = useState('');
    const [renameId, setRenameId] = useState<string | null>(null);
    const [aiPrompt, setAiPrompt] = useState('');
    const [savingPrompt, setSavingPrompt] = useState(false);
    const msgEndRef = useRef<HTMLDivElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const { width: listW, startResizing: startListResize } = useResizable({ initialWidth: 330, minWidth: 260, maxWidth: 480, storageKey: 'wa-list-w' });
    const { width: ctxW, startResizing: startCtxResize } = useResizable({ initialWidth: 300, minWidth: 250, maxWidth: 500, storageKey: 'wa-ctx-w' });

    const activeThread = threads.find(t => t.id === activeId);

    // Fetch
    const loadAccounts = useCallback(async () => {
        const { data } = await insforge.database.from('whatsapp_accounts').select('*').order('created_at', { ascending: false });
        if (data) setAccounts(data);
    }, []);

    const loadThreads = useCallback(async () => {
        setLoadingThreads(true);
        let q = insforge.database.from('whatsapp_chats').select('*').eq('is_archived', showArchived).order('updated_at', { ascending: false });
        if (filterAccount !== 'all') q = q.eq('account_id', filterAccount);
        const { data } = await q;
        setThreads(data || []);
        setLoadingThreads(false);
    }, [filterAccount, showArchived]);

    const loadMessages = useCallback(async (id: string) => {
        setLoadingMsgs(true);
        const { data } = await insforge.database.from('whatsapp_messages').select('*').eq('chat_id', id).order('created_at', { ascending: true });
        setMessages(data || []);
        setLoadingMsgs(false);
        setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, []);

    useEffect(() => { loadAccounts(); }, [loadAccounts]);
    useEffect(() => { loadThreads(); }, [loadThreads]);

    useEffect(() => {
        if (!activeId) { setMessages([]); return; }
        loadMessages(activeId);
        // Mark as read
        insforge.database.from('whatsapp_chats').update({ unread_count: 0 }).eq('id', activeId).then();
        setThreads(p => p.map(t => t.id === activeId ? { ...t, unread_count: 0 } : t));
        // Realtime messages
        const ch = supabaseRealtime.channel(`msgs-${activeId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages', filter: `chat_id=eq.${activeId}` }, p => {
                setMessages(prev => { if (prev.find(m => m.id === p.new.id)) return prev; setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80); return [...prev, p.new as Message]; });
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'whatsapp_messages', filter: `chat_id=eq.${activeId}` }, p => {
                setMessages(prev => prev.map(m => m.id === p.new.id ? { ...m, ...p.new } : m));
            })
            .subscribe();
        return () => { supabaseRealtime.removeChannel(ch); };
    }, [activeId, loadMessages]);

    // Realtime threads
    useEffect(() => {
        const ch = supabaseRealtime.channel('threads').on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_chats' }, () => loadThreads()).subscribe();
        return () => { supabaseRealtime.removeChannel(ch); };
    }, [loadThreads]);

    const sendMsg = async () => {
        if (!draft.trim() || !activeId) return;
        setSending(true);
        const text = draft.trim(); setDraft(''); setAiSuggestion('');
        const payload: any = { chat_id: activeId, text, sender: 'me', status: 'sent', message_type: 'text' };
        if (replyTo) { payload.quoted_msg_id = replyTo.id; payload.quoted_content = replyTo.text; payload.quoted_from = replyTo.sender; }
        await insforge.database.from('whatsapp_messages').insert([payload]);
        await insforge.database.from('whatsapp_chats').update({ last_message: text, updated_at: new Date().toISOString() }).eq('id', activeId);
        setReplyTo(null); setSending(false);
    };

    const sendImage = async (file: File) => {
        if (!activeId) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64 = (e.target?.result as string).split(',')[1];
            await insforge.database.from('whatsapp_messages').insert([{ chat_id: activeId, text: '', sender: 'me', status: 'sent', message_type: 'image', media_data: base64, media_type: 'image' }]);
        };
        reader.readAsDataURL(file);
    };

    const handleReact = async (id: string, emoji: string) => {
        await fetch(`/api/whatsapp/messages/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emoji }) });
        setMessages(p => p.map(m => m.id === id ? { ...m, reaction_emoji: emoji } : m));
    };

    const handleDelete = async (id: string) => {
        await fetch(`/api/whatsapp/messages/${id}`, { method: 'DELETE' });
        setMessages(p => p.map(m => m.id === id ? { ...m, is_deleted: true, text: '' } : m));
    };

    const handleCreateTicket = async (msg: Message) => {
        const thread = threads.find(t => t.id === msg.chat_id);
        if (!thread) return;
        try {
            const res = await fetch('/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: 'Ticket desde WhatsApp',
                    description: `Ticket creado desde WhatsApp (${thread.name}).\n\nMensaje:\n${msg.text || 'Multimedia'}`,
                    contactName: thread.name || '',
                    sourceChannel: 'whatsapp',
                    sourceRef: thread.id,
                })
            });
            if (res.ok) alert('Ticket creado exitosamente');
            else alert('Error al crear el ticket');
        } catch (error) { console.error(error); }
    };

    const handleThreadAction = async (threadId: string, action: string) => {
        const t = threads.find(x => x.id === threadId)!;
        if (action === 'rename') { setRenameId(threadId); setRenameVal(t.name); return; }
        const vals: Record<string, any> = { archive: !t.is_archived, pin: !t.is_pinned, mute: !t.is_muted };
        await fetch(`/api/whatsapp/threads/${threadId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, value: vals[action] }) });
        setThreads(p => p.map(x => x.id === threadId ? { ...x, is_archived: action === 'archive' ? vals.archive : x.is_archived, is_pinned: action === 'pin' ? vals.pin : x.is_pinned, is_muted: action === 'mute' ? vals.mute : x.is_muted } : x));
    };

    const handleRename = async () => {
        if (!renameId || !renameVal.trim()) return;
        await fetch(`/api/whatsapp/threads/${renameId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'rename', value: renameVal }) });
        setThreads(p => p.map(t => t.id === renameId ? { ...t, name: renameVal } : t));
        setRenameId(null);
    };

    const getAiSuggestion = async () => {
        if (!activeId) return;
        setAiLoading(true);
        const r = await fetch('/api/whatsapp/llm/suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ threadId: activeId }) });
        const d = await r.json();
        if (d.suggestion) setAiSuggestion(d.suggestion);
        setAiLoading(false);
    };

    const createAccount = async () => {
        if (!newAccName) return;
        const { data } = await insforge.database.from('whatsapp_accounts').insert({ name: newAccName, type: newAccType, config: newAccConfig, status: newAccType === 'qr' ? 'connecting' : 'active' }).select().single();
        if (data) { setAccounts(p => [data, ...p]); setShowNewAcc(false); setNewAccName(''); setNewAccConfig({}); }
    };

    const deleteAccount = async (id: string) => {
        if (!confirm('¿Eliminar esta cuenta y todos sus chats?')) return;
        await insforge.database.from('whatsapp_accounts').delete().eq('id', id);
        setAccounts(p => p.filter(a => a.id !== id));
    };

    const filtered = threads.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.phone_number?.includes(search)).sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0) || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0a0f1c] overflow-hidden">
            {/* Rename Modal */}
            {renameId && (
                <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                        <h3 className="font-semibold text-slate-800 dark:text-white mb-3">Renombrar contacto</h3>
                        <input type="text" value={renameVal} onChange={e => setRenameVal(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 mb-4" onKeyDown={e => e.key === 'Enter' && handleRename()} autoFocus />
                        <div className="flex gap-2 justify-end"><button onClick={() => setRenameId(null)} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300">Cancelar</button><button onClick={handleRename} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium">Guardar</button></div>
                    </div>
                </div>
            )}

            {/* Header Tipo Tickets */}
            <header className="flex-none px-6 py-4 border-b border-slate-200 dark:border-slate-800 relative z-10 w-full bg-slate-50/50 dark:bg-[#0B1121] backdrop-blur-md">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <MessageCircle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-slate-800 dark:text-white">WhatsApp</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Gestión de comunicaciones multicanal</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-1 relative z-10">
                    {[{ id: 'chats', label: 'Conversaciones', icon: MessageCircle }, { id: 'accounts', label: 'Cuentas', icon: Users }, { id: 'config', label: 'Configuración', icon: Settings }].map(t => (
                        <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                            <t.icon className="w-4 h-4" />{t.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* ── TAB CUENTAS ─────────────────────────────────────── */}
            {tab === 'accounts' && (
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-2xl">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-semibold text-slate-800 dark:text-white">Cuentas WhatsApp</h2>
                            <button onClick={() => setShowNewAcc(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"><Plus className="w-4 h-4" />Nueva cuenta</button>
                        </div>
                        {showNewAcc && (
                            <div className="mb-5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
                                <h3 className="font-medium text-slate-800 dark:text-white mb-4">Nueva cuenta</h3>
                                <div className="space-y-3">
                                    <input type="text" value={newAccName} onChange={e => setNewAccName(e.target.value)} placeholder="Nombre (Ej: Ventas, Soporte...)" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
                                    <div className="flex gap-2">
                                        {(['qr', 'twilio'] as const).map(type => (
                                            <button key={type} onClick={() => setNewAccType(type)} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${newAccType === type ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                                                {type === 'qr' ? '📱 QR Nativo' : '☁️ Twilio'}
                                            </button>
                                        ))}
                                    </div>
                                    {newAccType === 'twilio' && (
                                        <div className="space-y-2">
                                            {['Account SID', 'Auth Token', 'Número Twilio'].map((ph, i) => (
                                                <input key={ph} type="text" placeholder={ph} onChange={e => setNewAccConfig((p: any) => ({ ...p, [['sid', 'token', 'number'][i]]: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex gap-2 justify-end pt-1">
                                        <button onClick={() => setShowNewAcc(false)} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300">Cancelar</button>
                                        <button onClick={createAccount} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium">Crear</button>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="space-y-3">
                            {accounts.map(acc => (
                                <div key={acc.id} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold flex-none">{initials(acc.name)}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-800 dark:text-white text-sm">{acc.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs text-slate-500">{acc.type === 'qr' ? 'Nativa (QR)' : 'Twilio'}</span>
                                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${acc.is_connected || acc.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>{acc.is_connected || acc.status === 'active' ? '● Conectada' : '○ Desconectada'}</span>
                                        </div>
                                    </div>
                                    {acc.phone_number && <span className="text-xs text-slate-400">{acc.phone_number}</span>}
                                    <button onClick={() => deleteAccount(acc.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-400 transition-colors flex-none"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                            {accounts.length === 0 && <div className="text-center py-12 text-slate-400">No hay cuentas configuradas</div>}
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB CONFIGURACIÓN ───────────────────────────────── */}
            {tab === 'config' && (
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-xl">
                        <h2 className="font-semibold text-slate-800 dark:text-white mb-5">Configuración del canal IA</h2>
                        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Prompt del asistente WhatsApp</label>
                            <textarea rows={8} value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="Eres un asistente de atención al cliente profesional y amigable..." className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none" />
                            <button onClick={async () => { setSavingPrompt(true); await insforge.database.from('system_settings').upsert({ category: 'whatsapp_ai', value: { prompt: aiPrompt } }); setSavingPrompt(false); }} disabled={savingPrompt} className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                                {savingPrompt ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : 'Guardar prompt'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB CONVERSACIONES ──────────────────────────────── */}
            {tab === 'chats' && (
                <div className="flex-1 flex overflow-hidden">
                    {/* Lista */}
                    <div style={{ width: listW }} className="border-r border-slate-200 dark:border-white/10 flex flex-col bg-white/50 dark:bg-white/[0.02] shrink-0 relative">
                        <div className="p-3 border-b border-slate-200 dark:border-white/10 space-y-2 shrink-0">
                            <div className="flex items-center gap-2">
                                <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} className="flex-1 text-xs bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-slate-700 dark:text-white focus:outline-none">
                                    <option value="all">Todas las cuentas</option>
                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                                <button onClick={() => setShowArchived(!showArchived)} title={showArchived ? 'Ver activos' : 'Ver archivados'} className={`p-1.5 rounded-lg transition-colors ${showArchived ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'}`}><Archive className="w-4 h-4" /></button>
                                <button onClick={() => loadThreads()} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"><RefreshCw className="w-4 h-4" /></button>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all" />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {loadingThreads ? (
                                <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
                            ) : filtered.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm text-center p-6">
                                    <MessageCircle className="w-10 h-10 mb-2 opacity-30" />
                                    {showArchived ? 'Sin conversaciones archivadas' : 'Sin conversaciones activas'}
                                </div>
                            ) : (
                                <>
                                    {showArchived && <div className="px-4 py-2 bg-amber-50 dark:bg-amber-500/5 border-b border-amber-200 dark:border-amber-500/10"><p className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1"><Archive className="w-3 h-3" />Archivados</p></div>}
                                    {filtered.map(t => (
                                        <ThreadItem key={t.id} thread={t} active={activeId === t.id}
                                            onClick={() => setActiveId(t.id)}
                                            onAction={(action) => handleThreadAction(t.id, action)} />
                                    ))}
                                </>
                            )}
                        </div>
                        {/* Resize */}
                        <div onMouseDown={startListResize} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-emerald-500/50 z-20" />
                    </div>

                    {/* Chat Panel */}
                    <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-white/[0.005]">
                        {activeThread ? (
                            <>
                                {/* Header */}
                                <div className="h-16 border-b border-slate-200 dark:border-white/10 flex items-center justify-between px-5 shrink-0 bg-white/80 dark:bg-[#0a0f1c]/80 backdrop-blur-md">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${threadColor(activeThread.id)} flex items-center justify-center text-white text-xs font-bold`}>{initials(activeThread.name)}</div>
                                        <div>
                                            <h2 className="font-semibold text-slate-900 dark:text-white text-sm">{activeThread.name}</h2>
                                            <p className="text-xs text-slate-500">{activeThread.phone_number || 'WhatsApp'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={getAiSuggestion} disabled={aiLoading} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${aiLoading ? 'bg-violet-100 dark:bg-violet-500/10 text-violet-500 animate-pulse' : 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-500/20'}`}>
                                            <Bot className="w-3.5 h-3.5" />{aiLoading ? 'Generando...' : 'Sugerencia IA'}
                                        </button>
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
                                    {loadingMsgs ? (
                                        <div className="flex justify-center pt-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
                                    ) : messages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">Sin mensajes aún</div>
                                    ) : messages.map(msg => (
                                        <MessageBubble key={msg.id} msg={msg} allMessages={messages}
                                            onReact={handleReact} onReply={setReplyTo} onDelete={handleDelete}
                                            onCreateTicket={handleCreateTicket} />
                                    ))}
                                    <div ref={msgEndRef} />
                                </div>

                                {/* Input */}
                                <div className="p-3 border-t border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#0a0f1c]/80 backdrop-blur-md shrink-0">
                                    {/* AI suggestion */}
                                    {aiSuggestion && (
                                        <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-violet-50 dark:bg-violet-500/5 border border-violet-200 dark:border-violet-500/20">
                                            <Bot className="w-4 h-4 text-violet-500 flex-none" />
                                            <p className="text-xs text-slate-600 dark:text-slate-300 flex-1 truncate">{aiSuggestion}</p>
                                            <button onClick={() => setDraft(aiSuggestion)} className="text-xs font-medium text-violet-600 hover:text-violet-800 dark:text-violet-400">Usar</button>
                                            <button onClick={() => setAiSuggestion('')} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                                        </div>
                                    )}
                                    {/* Reply banner */}
                                    {replyTo && (
                                        <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-slate-100 dark:bg-white/5 border-l-4 border-emerald-500">
                                            <Reply className="w-4 h-4 text-emerald-500 flex-none" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{replyTo.sender === 'me' ? 'Tú' : activeThread.name}</p>
                                                <p className="text-xs text-slate-500 truncate">{replyTo.text || '📎 Media'}</p>
                                            </div>
                                            <button onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-slate-600 flex-none"><X className="w-4 h-4" /></button>
                                        </div>
                                    )}
                                    <div className="flex items-end gap-2">
                                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) sendImage(f); }} />
                                        <button onClick={() => fileRef.current?.click()} className="p-2.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shrink-0"><ImageIcon className="w-5 h-5" /></button>
                                        <div className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl flex items-end">
                                            <textarea value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMsg())} placeholder="Escribe un mensaje..." className="w-full bg-transparent border-none focus:ring-0 resize-none py-3 px-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-500 max-h-32" rows={1} disabled={sending} />
                                            <button onClick={async () => { if (!draft.trim()) { getAiSuggestion(); } else { const r = await fetch('/api/whatsapp/llm/suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ threadId: activeId }) }); const d = await r.json(); if (d.suggestion) setDraft(d.suggestion); } }} className="p-3 text-violet-500 hover:text-violet-700 shrink-0 transition-colors"><Zap className="w-5 h-5" /></button>
                                        </div>
                                        <button onClick={sendMsg} disabled={!draft.trim() || sending} className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-colors shrink-0">
                                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
                                <MessageCircle className="w-16 h-16 opacity-20" />
                                <p>Selecciona una conversación</p>
                            </div>
                        )}
                    </div>

                    {/* Context Panel */}
                    {activeThread && (
                        <div style={{ width: ctxW }} className="border-l border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex flex-col shrink-0 relative">
                            <div onMouseDown={startCtxResize} className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-emerald-500/50 z-20" />
                            <div className="p-4 border-b border-slate-200 dark:border-white/10 shrink-0">
                                <h3 className="font-medium text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2"><UserCircle className="w-4 h-4" />Información del contacto</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                <div className="text-center py-4">
                                    <div className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-tr ${threadColor(activeThread.id)} flex items-center justify-center text-white font-bold text-xl mb-3 shadow-lg`}>{initials(activeThread.name)}</div>
                                    <h2 className="font-semibold text-slate-800 dark:text-white">{activeThread.name}</h2>
                                    <p className="text-sm text-slate-500 mt-0.5">{activeThread.phone_number || '—'}</p>
                                </div>
                                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 space-y-2 text-sm">
                                    {[{ label: 'Mensajes', val: messages.length }, { label: 'Archivado', val: activeThread.is_archived ? 'Sí' : 'No' }, { label: 'Fijado', val: activeThread.is_pinned ? 'Sí' : 'No' }].map(r => (
                                        <div key={r.label} className="flex justify-between"><span className="text-slate-500">{r.label}</span><span className="text-slate-800 dark:text-slate-200 font-medium">{r.val}</span></div>
                                    ))}
                                </div>
                                <div className="space-y-2">
                                    {[{ label: 'Archivar', icon: Archive, action: 'archive' }, { label: 'Fijar', icon: Pin, action: 'pin' }, { label: 'Silenciar', icon: BellOff, action: 'mute' }, { label: 'Renombrar', icon: Edit3, action: 'rename' }].map(({ label, icon: Icon, action }) => (
                                        <button key={action} onClick={() => handleThreadAction(activeThread.id, action)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors">
                                            <Icon className="w-4 h-4 text-slate-400" />{label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
