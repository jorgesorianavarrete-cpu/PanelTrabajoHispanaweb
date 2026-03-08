'use client';

import {
    LayoutDashboard,
    Mail,
    MessageCircle,
    Megaphone,
    Share2,
    Server,
    Users,
    Calendar,
    Link as LinkIcon,
    ChevronLeft,
    ChevronRight,
    Sun,
    Moon,
    GripVertical,
    Settings,
    Sparkles,
    Building2,
    PhoneCall,
    Bot,
    MessageSquare,
    Wand2,
    TicketCheck,
    Film
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { insforge } from '@/lib/insforge';
import { useResizable } from '@/hooks/use-resizable';

export default function Sidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(true);
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [waUnread, setWaUnread] = useState(0);
    const [mailUnread, setMailUnread] = useState(0);
    const [tasksUnread, setTasksUnread] = useState(0);

    const { width: sidebarWidth, startResizing: startResizingSidebar } = useResizable({
        initialWidth: 256,
        minWidth: 200,
        maxWidth: 450,
        storageKey: 'main-sidebar-width',
    });

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        const fetchAllUnread = async () => {
            // 1. WhatsApp
            const { data: waData } = await insforge.database.from('whatsapp_chats').select('unread_count');
            if (waData) setWaUnread(waData.reduce((sum: number, c: any) => sum + (c.unread_count || 0), 0));

            // 2. Email
            const { data: mailData } = await insforge.database.from('emails').select('id').eq('read_status', false);
            if (mailData) setMailUnread(mailData.length);

            // 3. CRM Tasks
            const { data: tasksData } = await insforge.database.from('tasks').select('id').eq('completed', false);
            if (tasksData) setTasksUnread(tasksData.length);
        };
        fetchAllUnread();
        const interval = setInterval(fetchAllUnread, 30000);
        return () => clearInterval(interval);
    }, []);

    const categories = [
        {
            title: 'Principal',
            items: [
                { title: 'Dashboard', icon: LayoutDashboard, href: '/', color: 'from-violet-500 to-fuchsia-500' },
                { title: 'CRM & Tareas', icon: Users, href: '/crm', color: 'from-indigo-500 to-blue-600', badge: tasksUnread },
                { title: 'Calendario', icon: Calendar, href: '/calendar', color: 'from-yellow-400 to-orange-500' },
                { title: 'Tickets', icon: TicketCheck, href: '/tickets', color: 'from-blue-500 to-indigo-600' },
            ]
        },
        {
            title: 'Comunicaciones',
            items: [
                { title: 'Correo', icon: Mail, href: '/mail', color: 'from-blue-500 to-cyan-500', badge: mailUnread },
                { title: 'WhatsApp', icon: MessageCircle, href: '/whatsapp', color: 'from-emerald-500 to-teal-500', badge: waUnread },
                { title: 'Chatbot IA', icon: Bot, href: '/chatbot', color: 'from-indigo-400 to-violet-500' },
                { title: 'Asistente Telefónico', icon: PhoneCall, href: '/vapi', color: 'from-violet-500 to-purple-600' },
            ]
        },
        {
            title: 'Marketing & Ventas',
            items: [
                { title: 'Marketing Studio', icon: Megaphone, href: '/marketing', color: 'from-orange-500 to-red-500' },
                { title: 'Contenido RRSS', icon: Share2, href: '/social', color: 'from-pink-500 to-rose-500' },
            ]
        },
        {
            title: 'Sistema',
            items: [
                { title: 'Servidores Plesk', icon: Server, href: '/plesk', color: 'from-slate-500 to-gray-500' },
                { title: 'Conexiones Web', icon: LinkIcon, href: '/webhooks', color: 'from-teal-400 to-emerald-500' },
                { title: 'Configuración IA', icon: Sparkles, href: '/settings/ai', color: 'from-purple-500 to-indigo-500' },
                { title: 'Modelos IA Studio', icon: Film, href: '/settings/ai-models', color: 'from-violet-500 to-fuchsia-500' },
                { title: 'Integraciones', icon: Settings, href: '/settings/integrations', color: 'from-indigo-400 to-blue-500' },
            ]
        }
    ];

    return (
        <aside
            style={{ width: isCollapsed ? 80 : sidebarWidth }}
            className={`border-r border-slate-800 dark:border-white/10 bg-slate-950 dark:bg-white/5 backdrop-blur-xl flex flex-col transition-all duration-300 h-full shrink-0 shadow-lg dark:shadow-none relative z-20`}
        >
            <div className={`h-20 flex items-center border-b border-slate-800 dark:border-white/10 shrink-0 overflow-hidden transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'justify-start px-6'}`}>
                {isCollapsed ? (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
                        <Wand2 className="w-5 h-5 text-white" />
                    </div>
                ) : (
                    <img
                        src="/logo.png"
                        alt="Hispanaweb Comunicaciones"
                        className="h-12 w-auto object-contain transition-opacity duration-300 brightness-0 invert opacity-60"
                    />
                )}
            </div>

            <nav className={`flex-1 py-4 px-2 overflow-hidden hover:overflow-y-auto w-full ${isCollapsed ? 'space-y-2' : 'space-y-4'}`}>
                {categories.map((category, idx) => (
                    <div key={idx} className="space-y-0.5">
                        {!isCollapsed && (
                            <div className="px-3 mb-2">
                                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                    {category.title}
                                </span>
                            </div>
                        )}
                        {isCollapsed && idx !== 0 && <div className="border-t border-slate-800/50 dark:border-white/5 mx-2 my-1"></div>}
                        {category.items.map((app, i) => {
                            const isActive = pathname === app.href || (pathname.startsWith(app.href) && app.href !== '/');
                            const badge = ('badge' in app ? app.badge : 0) ?? 0;
                            return (
                                <Link
                                    key={`${idx}-${i}`}
                                    href={app.href}
                                    title={isCollapsed ? app.title : undefined}
                                    className={`flex items-center rounded-lg transition-all duration-200 group relative
                ${isCollapsed ? 'justify-center w-full py-2.5 px-0' : 'px-3 py-2'}
                ${isActive
                                            ? 'bg-slate-800 text-white dark:bg-white/10 font-medium'
                                            : 'text-slate-400 hover:text-white hover:bg-slate-800 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'}`}
                                >
                                    <div className="relative shrink-0">
                                        <app.icon className="w-5 h-5" />
                                        {badge > 0 && (
                                            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                                                {badge > 99 ? '99+' : badge}
                                            </span>
                                        )}
                                    </div>
                                    {!isCollapsed && <span className="ml-3 text-sm font-medium whitespace-nowrap flex-1">{app.title}</span>}
                                    {!isCollapsed && badge > 0 && (
                                        <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                                            {badge > 99 ? '99+' : badge}
                                        </span>
                                    )}
                                    {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-violet-500 rounded-r-full" />
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>

            {/* Footer Controls */}
            <div className="p-4 border-t border-slate-800 dark:border-white/10 flex flex-col gap-2 shrink-0">
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`hidden lg:flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5 transition-all mx-auto
            ${!isCollapsed ? 'w-full justify-start p-2' : 'w-8 h-8 p-0'}`}
                    title={isCollapsed ? "Expandir menú" : "Contraer menú"}
                >
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    {!isCollapsed && <span className="ml-2 text-xs font-medium">Contraer</span>}
                </button>
            </div>

            {/* Resize Handle */}
            {!isCollapsed && (
                <div
                    onMouseDown={startResizingSidebar}
                    className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-violet-500/50 transition-colors z-30 group"
                >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="w-3 h-3 text-violet-500" />
                    </div>
                </div>
            )}
        </aside>
    );
}
