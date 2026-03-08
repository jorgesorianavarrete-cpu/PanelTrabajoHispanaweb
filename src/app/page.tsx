'use client';

import {
  LayoutDashboard,
  Mail,
  MessageCircle,
  Megaphone,
  Share2,
  Server,
  Users,
  Calendar as CalendarIcon,
  Link as LinkIcon,
  Clock,
  TrendingUp,
  Bell,
  PhoneCall,
  Bot,
  MessageSquare,
  TicketCheck,
  Sun,
  Moon
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { insforge } from '@/lib/insforge';

export default function Home() {
  const [metrics, setMetrics] = useState([
    { label: 'Campañas Activas', value: '...', glow: 'shadow-violet-500/20', color: 'from-violet-500 to-fuchsia-500' },
    { label: 'Servidores Activos', value: '...', glow: 'shadow-blue-500/20', color: 'from-blue-500 to-cyan-500' },
    { label: 'Tareas Pendientes', value: '...', glow: 'shadow-emerald-500/20', color: 'from-emerald-500 to-teal-500' },
    { label: 'Negocios Ganados', value: '...', glow: 'shadow-pink-500/20', color: 'from-pink-500 to-rose-500' },
  ]);

  const [activities, setActivities] = useState<any[]>([]);
  const [nextEvent, setNextEvent] = useState<any>(null);
  const [waUnread, setWaUnread] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 1. Metrics
        const { data: campaigns } = await insforge.database
          .from('marketing_campaigns').select('id').eq('status', 'Activa');
        const numCampaigns = campaigns ? campaigns.length : 0;

        const { data: servers } = await insforge.database.from('hosting_servers').select('status');
        const onlineServers = servers ? servers.filter((s: any) => s.status === 'online').length : 0;
        const totalServers = servers ? servers.length : 0;

        const { data: tasks } = await insforge.database.from('tasks').select('id').eq('completed', false);
        const numTasks = tasks ? tasks.length : 0;

        const { data: deals } = await insforge.database.from('deals').select('stage');
        const wonDeals = deals ? deals.filter((d: any) => d.stage === 'Ganado' || d.stage === 'won').length : 0;

        setMetrics([
          { label: 'Campañas Activas', value: numCampaigns.toString(), glow: 'shadow-violet-500/20', color: 'from-violet-500 to-fuchsia-500' },
          { label: 'Servidores Activos', value: `${onlineServers} / ${totalServers}`, glow: 'shadow-blue-500/20', color: 'from-blue-500 to-cyan-500' },
          { label: 'Tareas Pendientes', value: numTasks.toString(), glow: 'shadow-emerald-500/20', color: 'from-emerald-500 to-teal-500' },
          { label: 'Negocios Ganados', value: wonDeals.toString(), glow: 'shadow-pink-500/20', color: 'from-pink-500 to-rose-500' },
        ]);

        // 2. WhatsApp unread count
        const { data: chats } = await insforge.database
          .from('whatsapp_chats').select('unread_count');
        if (chats) {
          const total = chats.reduce((sum: number, c: any) => sum + (c.unread_count || 0), 0);
          setWaUnread(total);
        }

        // 3. Next upcoming calendar event
        const { data: events } = await insforge.database
          .from('calendar_events')
          .select('title, start_time, event_type')
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(1);
        if (events && events.length > 0) setNextEvent(events[0]);

        // 4. Recent Activities (emails + WA + social posts)
        const recentItems: { icon: any; title: string; time: Date; color: string; bg: string; href: string }[] = [];

        const { data: emails } = await insforge.database
          .from('emails').select('id, subject, created_at')
          .order('created_at', { ascending: false }).limit(3);
        emails?.forEach((e: any) => recentItems.push({
          icon: Mail, title: `Correo: ${e.subject}`, time: new Date(e.created_at),
          color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-white/5 border-blue-100 dark:border-white/10',
          href: '/mail'
        }));

        const { data: wappMsg } = await insforge.database
          .from('whatsapp_messages').select('id, text, created_at')
          .order('created_at', { ascending: false }).limit(3);
        wappMsg?.forEach((m: any) => recentItems.push({
          icon: MessageCircle, title: `WhatsApp: ${String(m.text || '').substring(0, 25)}...`, time: new Date(m.created_at),
          color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-white/5 border-emerald-100 dark:border-white/10',
          href: '/whatsapp'
        }));

        const { data: posts } = await insforge.database
          .from('social_posts').select('id, content, created_at')
          .order('created_at', { ascending: false }).limit(2);
        posts?.forEach((p: any) => recentItems.push({
          icon: Share2, title: 'RRSS: Nuevo Post', time: new Date(p.created_at),
          color: 'text-pink-500 dark:text-pink-400', bg: 'bg-pink-50 dark:bg-white/5 border-pink-100 dark:border-white/10',
          href: '/social'
        }));

        recentItems.sort((a, b) => b.time.getTime() - a.time.getTime());
        setActivities(recentItems.slice(0, 5));

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      }
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const apps = [
    { title: 'Correo', icon: Mail, href: '/mail', color: 'from-blue-500 to-cyan-500' },
    { title: 'WhatsApp', icon: MessageCircle, href: '/whatsapp', color: 'from-emerald-500 to-teal-500', badge: waUnread },
    { title: 'Marketing Studio', icon: Megaphone, href: '/marketing', color: 'from-orange-500 to-red-500' },
    { title: 'Contenido RRSS', icon: Share2, href: '/social', color: 'from-pink-500 to-rose-500' },
    { title: 'Servidores Plesk', icon: Server, href: '/plesk', color: 'from-slate-500 to-gray-500' },
    { title: 'CRM & Tareas', icon: Users, href: '/crm', color: 'from-indigo-500 to-blue-600' },
    { title: 'Chatbot IA', icon: Bot, href: '/chatbot', color: 'from-indigo-400 to-violet-500' },
    { title: 'Asistente Telefónico', icon: PhoneCall, href: '/vapi', color: 'from-violet-500 to-purple-600' },
    { title: 'Tickets', icon: TicketCheck, href: '/tickets', color: 'from-blue-500 to-indigo-600' },
    { title: 'Calendario', icon: CalendarIcon, href: '/calendar', color: 'from-yellow-400 to-orange-500' },
    { title: 'Conexiones Web', icon: LinkIcon, href: '/webhooks', color: 'from-teal-400 to-emerald-500' },
  ];

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    const interval = [
      { label: 'años', secs: 31536000 },
      { label: 'meses', secs: 2592000 },
      { label: 'días', secs: 86400 },
      { label: 'horas', secs: 3600 },
      { label: 'minutos', secs: 60 },
    ];
    for (const { label, secs } of interval) {
      const v = Math.floor(seconds / secs);
      if (v >= 1) return `Hace ${v} ${label}`;
    }
    return 'Hace unos segundos';
  };

  const greeting = () => {
    const h = currentTime.getHours();
    if (h < 13) return 'Buenos días';
    if (h < 20) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const formattedDate = currentTime.toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <>
      <header className="h-20 flex-none border-b border-slate-200 dark:border-white/10 flex items-center justify-between px-8 bg-white/50 dark:bg-white/5 backdrop-blur-md sticky top-0 z-10 w-full transition-colors">
        <div>
          <h1 className="text-xl font-light text-slate-800 dark:text-white">
            {greeting()}, <span className="font-semibold">Jorge</span>
          </h1>
          <p className="text-xs text-slate-400 capitalize mt-0.5">{formattedDate}</p>
        </div>
        <div className="flex items-center space-x-3">
          {waUnread > 0 && (
            <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-full text-xs font-semibold">
              <Bell className="w-3 h-3" />
              {waUnread} WA sin leer
            </div>
          )}
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 mr-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10 transition-all border border-transparent dark:hover:border-white/10"
              title="Cambiar Tema"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          )}
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-lg tracking-wider">
            J
          </div>
        </div>
      </header>

      <div className="p-8 flex-1 overflow-y-auto">
        {/* Top Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {metrics.map((stat, i) => (
            <div key={i} className={`p-6 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-lg ${stat.glow} transition-all hover:shadow-md dark:hover:bg-white/[0.08] relative overflow-hidden group`}>
              <div className={`absolute right-0 top-0 w-20 h-20 bg-gradient-to-bl ${stat.color} opacity-10 group-hover:opacity-20 transition-opacity blur-2xl rounded-full`} />
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{stat.value}</h3>
            </div>
          ))}
        </div>

        {/* Next Event Banner */}
        {nextEvent && (
          <Link href="/calendar">
            <div className="mb-8 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-500/10 dark:to-amber-500/10 border border-orange-200 dark:border-orange-500/20 rounded-2xl p-4 flex items-center gap-4 hover:shadow-md transition-all cursor-pointer group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-orange-500/20">
                <Clock className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-0.5">Próximo Evento</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{nextEvent.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {new Date(nextEvent.start_time).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} · {new Date(nextEvent.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <TrendingUp className="w-5 h-5 text-orange-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Access Apps */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-semibold tracking-tight text-slate-800 dark:text-white">Acceso Rápido</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {apps.map((app, i) => (
                <Link
                  key={i}
                  href={app.href}
                  className="p-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:bg-white/[0.08] backdrop-blur-md transition-all duration-300 group hover:-translate-y-1 shadow-sm hover:shadow-md dark:shadow-none dark:hover:shadow-xl relative"
                >
                  {app.badge && app.badge > 0 ? (
                    <div className="absolute top-3 right-3 min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {app.badge > 99 ? '99+' : app.badge}
                    </div>
                  ) : null}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${app.color} p-2.5 mb-4 shadow-lg text-white`}>
                    <app.icon className="w-full h-full" />
                  </div>
                  <h3 className="font-semibold text-slate-700 group-hover:text-slate-900 dark:text-white/90 dark:group-hover:text-white text-sm">{app.title}</h3>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold tracking-tight text-slate-800 dark:text-white">Actividad Reciente</h2>
            <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-lg min-h-[400px] transition-colors">
              <div className="space-y-5">
                {activities.length > 0 ? (
                  activities.map((act, i) => (
                    <Link key={i} href={act.href} className="flex items-start group hover:bg-slate-50 dark:hover:bg-white/5 p-2 -m-2 rounded-xl transition-colors">
                      <div className={`mt-1 p-2 rounded-lg border ${act.bg} ${act.color} shrink-0 transition-transform group-hover:scale-110`}>
                        <act.icon className="w-4 h-4" />
                      </div>
                      <div className="ml-4 flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-white/90 truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{act.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{formatTimeAgo(act.time)}</p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <LayoutDashboard className="w-10 h-10 mb-3 opacity-20" />
                    <p className="text-sm">Cargando actividad...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
