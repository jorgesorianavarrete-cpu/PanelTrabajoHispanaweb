"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, ImageIcon, Video, Mic, Music, LayoutGrid, Sparkles,
    MessageSquare, X, Send, Building, ChevronDown
} from 'lucide-react';
import { MarketingProvider, useMarketingContext } from '@/components/MarketingContext';

const NAV_ITEMS = [
    { name: 'Dashboard', href: '/marketing', icon: LayoutDashboard },
    { name: 'Foto Studio', href: '/marketing/foto-studio', icon: ImageIcon },
    { name: 'Video Studio', href: '/marketing/video-studio', icon: Video },
    { name: 'Audio Studio', href: '/marketing/audio-studio', icon: Mic },
    { name: 'Canciones', href: '/marketing/canciones-studio', icon: Music },
    { name: 'Galería', href: '/marketing/gallery', icon: LayoutGrid },
];

function MarketingInnerLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { clients, activeClient, setActiveClientId, loading } = useMarketingContext();
    const [isClientMenuOpen, setIsClientMenuOpen] = useState(false);

    // Chat states
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
        { role: 'assistant', content: '¡Hola! Soy tu asistente creativo de marketing. ¿En qué te puedo ayudar hoy?' }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    const handleSendChat = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!chatInput.trim()) return;

        const newUserMessage = chatInput;
        setChatMessages(prev => [...prev, { role: 'user', content: newUserMessage }]);
        setChatInput('');
        setIsTyping(true);

        try {
            const res = await fetch('/api/marketing/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: newUserMessage, isGlobal: true, propertyContext: pathname, clientId: activeClient?.id })
            });
            const data = await res.json();

            setChatMessages(prev => [...prev, { role: 'assistant', content: data.data.text }]);
        } catch (err) {
            setChatMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, hubo un error de conexión.' }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-slate-50 dark:bg-[#0a0f1c] relative">
            {/* Header Estándar Tipo Tickets */}
            <header className="flex-none px-6 py-4 border-b border-slate-200 dark:border-slate-800 relative z-[100] w-full bg-slate-50/50 dark:bg-[#0B1121] backdrop-blur-md">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Marketing Studio</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Suite de herramientas de IA para Marketing</p>
                        </div>
                    </div>

                    {/* Controles Globales a la derecha */}
                    <div className="flex items-center gap-3">
                        {/* Selector de Cliente Global */}
                        {!loading && (
                            <div className="relative hidden sm:block">
                                <button
                                    onClick={() => setIsClientMenuOpen(!isClientMenuOpen)}
                                    className="flex items-center bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-white/10 transition-colors shadow-sm"
                                >
                                    <Building className="w-4 h-4 mr-2 text-slate-400" />
                                    <span className="text-slate-900 dark:text-white mr-2 truncate max-w-[150px]">{activeClient ? activeClient.name : "Sin Cliente"}</span>
                                    {activeClient && (
                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full mr-2">
                                            {activeClient.sector}
                                        </span>
                                    )}
                                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isClientMenuOpen ? "rotate-180" : ""}`} />
                                </button>

                                {isClientMenuOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-[#1a2235] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-[9999] overflow-hidden py-2" style={{ transformOrigin: "top right", animation: "scale-in 0.2s ease-out" }}>
                                        {/* Menú Dropdown Clientes */}
                                        <button
                                            onClick={() => { setActiveClientId(null); setIsClientMenuOpen(false); }}
                                            className={`w-full text-left px-4 py-3 flex items-center hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${!activeClient ? "bg-orange-50 dark:bg-orange-500/10" : ""}`}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mr-3 shadow-sm border border-slate-200 dark:border-white/5">
                                                <Building className="w-4 h-4 text-slate-400" />
                                            </div>
                                            <div>
                                                <div className={`text-sm font-bold ${!activeClient ? "text-orange-600 dark:text-orange-400" : "text-slate-700 dark:text-slate-300"}`}>
                                                    Sin Cliente
                                                </div>
                                                <div className="text-xs text-slate-500">Trabajo Global (Sin Asignar)</div>
                                            </div>
                                        </button>

                                        <div className="h-px bg-slate-100 dark:bg-white/5 my-1" />

                                        <div className="max-h-64 overflow-y-auto">
                                            {clients.map(client => (
                                                <button
                                                    key={client.id}
                                                    onClick={() => { setActiveClientId(client.id); setIsClientMenuOpen(false); }}
                                                    className={`w-full text-left px-4 py-3 flex items-center hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${activeClient?.id === client.id ? "bg-orange-50 dark:bg-orange-500/10" : ""}`}
                                                >
                                                    <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${client.color || "from-slate-400 to-slate-500"} flex items-center justify-center mr-3 shadow-sm text-white font-bold text-xs`}>
                                                        {client.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className={`text-sm font-bold ${activeClient?.id === client.id ? "text-orange-600 dark:text-orange-400" : "text-slate-700 dark:text-slate-300"}`}>
                                                            {client.name}
                                                        </div>
                                                        <div className="text-xs text-slate-500">{client.sector}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <button className="hidden sm:flex items-center gap-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-white/10 transition-colors shadow-sm text-slate-700 dark:text-slate-300">
                            <Sparkles className="w-4 h-4 text-orange-500" />
                            <span>Sugerencias IA</span>
                        </button>
                        <div className="bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 px-4 py-2 rounded-xl text-xs font-bold flex items-center shadow-inner">
                            <Sparkles className="w-4 h-4 mr-2" />
                            Créditos: ∞
                        </div>
                    </div>
                </div>

                {/* Tabs de Navegación de Marketing */}
                <div className="flex gap-1 relative z-10 overflow-x-auto hide-scrollbar pt-2">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                <item.icon className="w-4 h-4" />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col relative z-0">
                {children}
            </div>

            {/* Floating Global Chat Widget */}
            <div className="absolute bottom-6 right-6 z-[60] flex flex-col items-end">
                {isChatOpen && (
                    <div className="mb-4 w-80 sm:w-96 bg-white dark:bg-[#1a2235] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
                        <div className="p-4 bg-gradient-to-r from-orange-500 to-rose-500 text-white flex justify-between items-center">
                            <div className="flex items-center font-bold">
                                <Sparkles className="w-4 h-4 mr-2" /> Global Copilot
                            </div>
                            <button onClick={() => setIsChatOpen(false)} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="h-80 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-[#0a0f1c]/50">
                            {chatMessages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                                        ? 'bg-orange-500 text-white rounded-tr-none'
                                        : 'bg-white dark:bg-white/10 border border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-200 rounded-tl-none shadow-sm'
                                        }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-white dark:bg-white/10 border border-slate-200 dark:border-white/5 p-3 rounded-2xl rounded-tl-none shadow-sm flex space-x-1">
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-3 bg-white dark:bg-[#1a2235] border-t border-slate-200 dark:border-white/10">
                            <form onSubmit={handleSendChat} className="flex items-center space-x-2 bg-slate-100 dark:bg-[#0a0f1c] rounded-xl p-1 pr-2">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    placeholder="Consultar a la IA..."
                                    className="flex-1 bg-transparent p-2 text-sm outline-none text-slate-900 dark:text-white"
                                />
                                <button type="submit" disabled={!chatInput.trim() || isTyping} className="p-2 bg-orange-500 text-white rounded-lg disabled:opacity-50 hover:bg-orange-600 transition-colors">
                                    <Send className="w-4 h-4" />
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                <button
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    className="w-14 h-14 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-orange-500/30 hover:scale-105 transition-all"
                >
                    {isChatOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                </button>
            </div>
        </div>
    );
}

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <MarketingProvider>
            <MarketingInnerLayout>{children}</MarketingInnerLayout>
        </MarketingProvider>
    );
}
