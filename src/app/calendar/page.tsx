'use client';

import { useState, useEffect } from 'react';
import {
    Calendar as CalendarIcon, Clock, Video, User, List,
    MapPin, Plus, ChevronLeft, ChevronRight, X, Trash2, Edit2, Link, Download, CloudOff, RefreshCw, LayoutGrid
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, getHours, setHours, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface EventData {
    id?: string;
    title: string;
    description: string;
    location: string;
    start_time: string;
    end_time: string;
    event_type: 'meeting' | 'call' | 'appointment' | 'signing' | 'personal';
    client_name?: string;
    client_phone?: string;
    notes?: string;
    google_event_id?: string;
}

const EVENT_TYPES = {
    appointment: { label: 'Visita', color: 'bg-blue-500', icon: MapPin },
    meeting: { label: 'Reunión', color: 'bg-purple-500', icon: Video },
    call: { label: 'Llamada', color: 'bg-green-500', icon: Clock },
    signing: { label: 'Firma', color: 'bg-orange-500', icon: Edit2 },
    personal: { label: 'Personal', color: 'bg-red-500', icon: User },
};


export default function CalendarApp() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<'month' | 'week'>('month');
    const [events, setEvents] = useState<EventData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [googleStatus, setGoogleStatus] = useState<{ connected: boolean; email?: string }>({ connected: false });
    const [isImporting, setIsImporting] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');


    const [formData, setFormData] = useState<EventData>({
        title: '',
        description: '',
        location: '',
        start_time: '',
        end_time: '',
        event_type: 'meeting',
        client_name: '',
        client_phone: '',
        notes: ''
    });

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('google_connected') === 'true') {
            window.history.replaceState({}, document.title, window.location.pathname);
            checkGoogleStatus();
        }

        fetchEvents();
        checkGoogleStatus();
    }, [currentDate, view]);

    const fetchEvents = async () => {
        setIsLoading(true);
        const startBound = view === 'month' ? startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }) : startOfWeek(currentDate, { weekStartsOn: 1 });
        const endBound = view === 'month' ? endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }) : endOfWeek(currentDate, { weekStartsOn: 1 });

        try {
            const res = await fetch(`/api/calendario/events?start=${startBound.toISOString()}&end=${endBound.toISOString()}`);
            if (res.ok) {
                const data = await res.json();
                setEvents(data);
            }
        } catch (e) {
            console.error(e);
        }
        setIsLoading(false);
    };

    const filteredEvents = events.filter(e => selectedCategory === 'all' || e.event_type === selectedCategory);

    const upcomingEvents = events
        .filter(e => new Date(e.start_time) >= new Date())
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        .slice(0, 5);

    const eventStats = Object.keys(EVENT_TYPES).reduce((acc, key) => {
        acc[key] = events.filter(e => e.event_type === key).length;
        return acc;
    }, {} as Record<string, number>);


    const checkGoogleStatus = async () => {
        try {
            const res = await fetch('/api/calendario/google/status');
            if (res.ok) {
                const data = await res.json();
                setGoogleStatus(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleGoogleConnect = () => {
        window.location.href = '/api/calendario/google/auth';
    };

    const handleGoogleDisconnect = async () => {
        if (!confirm('¿Desconectar Google Calendar?')) return;
        try {
            await fetch('/api/calendario/google/status', { method: 'DELETE' });
            setGoogleStatus({ connected: false });
        } catch (e) {
            console.error(e);
        }
    };

    const handleGoogleImport = async () => {
        setIsImporting(true);
        try {
            const res = await fetch('/api/calendario/google/import', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                alert(`Importados ${data.imported} eventos.`);
                fetchEvents();
            } else {
                alert("Error al importar eventos.");
            }
        } catch (e) {
            console.error(e);
        }
        setIsImporting(false);
    };

    const openCreateModal = (date?: Date) => {
        setEditMode(false);
        setSelectedEventId(null);

        const start = date ? startOfDay(date) : new Date();
        const end = date ? addDays(startOfDay(date), 1) : addDays(new Date(), 1);

        if (date) {
            start.setHours(9, 0, 0, 0); // Default 9 AM
            end.setHours(10, 0, 0, 0);  // Default 10 AM
        }

        const toLocalISOString = (d: Date) => {
            const pad = (n: number) => n.toString().padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };

        setFormData({
            title: '',
            description: '',
            location: '',
            start_time: toLocalISOString(start),
            end_time: toLocalISOString(end),
            event_type: 'meeting',
            client_name: '',
            client_phone: '',
            notes: ''
        });
        setShowModal(true);
    };

    const openEditModal = (event: EventData) => {
        setEditMode(true);
        setSelectedEventId(event.id || null);

        const toLocalISOString = (dateStr: string) => {
            const d = new Date(dateStr);
            const pad = (n: number) => n.toString().padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };

        setFormData({
            ...event,
            start_time: toLocalISOString(event.start_time),
            end_time: toLocalISOString(event.end_time),
        });
        setShowModal(true);
    };

    const handleSaveEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const payload = {
            ...formData,
            start_time: new Date(formData.start_time).toISOString(),
            end_time: new Date(formData.end_time).toISOString(),
        };

        try {
            const method = editMode ? 'PATCH' : 'POST';
            const url = editMode ? `/api/calendario/events/${selectedEventId}` : '/api/calendario/events';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setShowModal(false);
                fetchEvents();
            } else {
                const data = await res.json();
                alert(`Error: ${data.error}`);
            }
        } catch (e) {
            console.error(e);
        }
        setIsSaving(false);
    };

    const handleDeleteEvent = async (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!confirm('¿Estás seguro de que quieres eliminar este evento?')) return;

        try {
            const res = await fetch(`/api/calendario/events/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setShowModal(false);
                fetchEvents();
            }
        } catch (e) {
            console.error(e);
        }
    };

    // --- Render Helpers ---

    const renderMonthView = () => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const days = [];
        let day = startDate;

        while (day <= endDate) {
            days.push(day);
            day = addDays(day, 1);
        }

        return (
            <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#0a0f1c]">
                {/* Header Días de Semana */}
                <div className="grid grid-cols-7 border-b border-slate-200 dark:border-white/10 shrink-0">
                    {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => (
                        <div key={d} className="p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                            {d}
                        </div>
                    ))}
                </div>

                {/* Grid */}
                <div className="flex-1 grid grid-cols-7 grid-rows-5 lg:grid-rows-6 auto-rows-fr overflow-y-auto">
                    {days.map((date, idx) => {
                        const dayEvents = filteredEvents.filter(e => isSameDay(new Date(e.start_time), date));
                        const isCurrentMonth = isSameMonth(date, monthStart);

                        const isToday = isSameDay(date, new Date());

                        return (
                            <div
                                key={idx}
                                onClick={() => openCreateModal(date)}
                                className={`min-h-[100px] border-b border-r border-slate-100 dark:border-white/5 p-2 transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 relative group
                                ${!isCurrentMonth ? 'bg-slate-50/50 dark:bg-[#0f1423]/50' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-orange-500 text-white shadow-md' : (isCurrentMonth ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-600')}`}>
                                        {format(date, 'd')}
                                    </span>
                                    <button className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-orange-500 transition-opacity p-1">
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="space-y-1 overflow-y-auto max-h-24 no-scrollbar">
                                    {dayEvents.map(evt => (
                                        <div
                                            key={evt.id}
                                            onClick={(e) => { e.stopPropagation(); openEditModal(evt); }}
                                            className={`text-xs p-1.5 rounded-md truncate font-medium text-white shadow-sm hover:opacity-90 transition-opacity ${EVENT_TYPES[evt.event_type].color}`}
                                        >
                                            {format(new Date(evt.start_time), 'HH:mm')} {evt.title}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderWeekView = () => {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
        const hours = Array.from({ length: 24 }).map((_, i) => i);

        return (
            <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#0a0f1c] overflow-y-auto relative">
                <div className="flex border-b border-slate-200 dark:border-white/10 sticky top-0 z-20 bg-white/90 dark:bg-[#0a0f1c]/90 backdrop-blur-md">
                    <div className="w-16 border-r border-slate-200 dark:border-white/10 shrink-0"></div>
                    <div className="flex-1 grid grid-cols-7">
                        {days.map((date, idx) => {
                            const isToday = isSameDay(date, new Date());
                            return (
                                <div key={idx} className={`p-3 text-center border-r border-slate-200 dark:border-white/10 ${isToday ? 'bg-orange-50 dark:bg-orange-500/10' : ''}`}>
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{format(date, 'EEE', { locale: es })}</div>
                                    <div className={`text-lg font-bold ${isToday ? 'text-orange-600 dark:text-orange-400' : 'text-slate-900 dark:text-white'}`}>
                                        {format(date, 'd')}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-1 relative min-h-[1440px]"> {/* 24 * 60px height per hour block */}
                    {/* Time labels axis */}
                    <div className="w-16 border-r border-slate-200 dark:border-white/10 shrink-0 relative bg-slate-50 dark:bg-[#0f1423]">
                        {hours.map(hour => (
                            <div key={hour} className="h-[60px] relative">
                                <span className="absolute -top-2.5 right-2 text-[10px] font-bold text-slate-400">
                                    {hour.toString().padStart(2, '0')}:00
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Day columns */}
                    <div className="flex-1 grid grid-cols-7 relative">
                        {days.map((date, dayIdx) => (
                            <div key={dayIdx} className="border-r border-slate-100 dark:border-white/5 relative" onClick={(e) => {
                                // Calculate click position an estimate start time (this is rudimentary)
                                const rect = e.currentTarget.getBoundingClientRect();
                                const y = e.clientY - rect.top;
                                const hourClick = Math.floor(y / 60);
                                const clickedDate = new Date(date);
                                clickedDate.setHours(hourClick, 0, 0, 0);
                                openCreateModal(clickedDate);
                            }}>
                                {hours.map(hour => (
                                    <div key={hour} className="h-[60px] border-b border-slate-100 dark:border-white/5"></div>
                                ))}

                                {/* Events for this day */}
                                {filteredEvents.filter(e => isSameDay(new Date(e.start_time), date)).map(evt => {
                                    const start = new Date(evt.start_time);

                                    const end = new Date(evt.end_time);
                                    const topOffset = (start.getHours() * 60) + start.getMinutes();
                                    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
                                    const heightPixels = Math.max(durationMinutes, 20); // enforce min height for visibility

                                    return (
                                        <div
                                            key={evt.id}
                                            onClick={(e) => { e.stopPropagation(); openEditModal(evt); }}
                                            className={`absolute left-1 right-1 rounded-md p-1.5 shadow-sm text-white text-xs overflow-hidden cursor-pointer hover:ring-2 hover:ring-white/50 transition-all z-10 ${EVENT_TYPES[evt.event_type].color}`}
                                            style={{ top: `${topOffset}px`, height: `${heightPixels}px` }}
                                        >
                                            <div className="font-bold leading-tight">{evt.title}</div>
                                            <div className="text-[10px] opacity-80 mt-0.5">{format(start, 'HH:mm')} - {format(end, 'HH:mm')}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-[#0B1121] overflow-hidden">
            {/* Header Tipo Tickets */}
            <header className="flex-none px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <CalendarIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Calendario de Eventos</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Gestión de citas, reuniones y sincronización con Google</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {googleStatus.connected ? (
                            <div className="flex items-center bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-3 py-2 rounded-xl hidden md:flex text-xs h-9">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                                <span className="text-emerald-700 dark:text-emerald-400 font-medium truncate max-w-[150px] mr-3">{googleStatus.email}</span>
                                <button onClick={handleGoogleImport} disabled={isImporting} className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded mr-1 transition-colors group" title="Importar de Google">
                                    <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ${isImporting ? 'animate-spin' : 'group-hover:rotate-180 transition-transform'}`} />
                                </button>
                                <button onClick={handleGoogleDisconnect} className="p-1 hover:bg-red-100 dark:hover:bg-red-500/20 rounded transition-colors group" title="Desconectar">
                                    <CloudOff className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:text-red-500" />
                                </button>
                            </div>
                        ) : (
                            <button onClick={handleGoogleConnect} className="hidden md:flex items-center text-xs font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors h-9">
                                <Link className="w-3.5 h-3.5 mr-2" /> Conectar Google
                            </button>
                        )}

                        <button className="hidden sm:flex items-center text-xs font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors h-9"
                            onClick={() => window.open('/api/calendario/export', '_blank')}>
                            <Download className="w-3.5 h-3.5 mr-2" /> iCal
                        </button>

                        <button onClick={() => openCreateModal()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
                            <Plus className="w-4 h-4" />Nuevo evento
                        </button>
                    </div>
                </div>
                <div className="flex gap-1">
                    <button onClick={() => setView('month')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'month' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        <LayoutGrid className="w-4 h-4" /> Vista Mensual
                    </button>
                    <button onClick={() => setView('week')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'week' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        <List className="w-4 h-4" /> Vista Semanal
                    </button>
                </div>
            </header>

            {/* Sub-Header Navegación Fecha */}
            <div className="h-12 border-b border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.02] flex items-center justify-between px-6 shrink-0 z-50">
                <div className="flex items-center space-x-2">
                    <button onClick={() => setCurrentDate(new Date())} className="text-xs font-bold px-3 py-1.5 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 dark:hover:bg-white/20 transition-colors">
                        Hoy
                    </button>
                    <div className="flex items-center space-x-1 border border-slate-200 dark:border-white/10 bg-white dark:bg-white/10 rounded-lg p-0.5">
                        <button onClick={() => setCurrentDate(d => view === 'month' ? subMonths(d, 1) : addDays(d, -7))} className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded"><ChevronLeft className="w-4 h-4" /></button>
                        <button onClick={() => setCurrentDate(d => view === 'month' ? addMonths(d, 1) : addDays(d, 7))} className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                </div>
                <div className="text-base font-bold text-slate-800 dark:text-white capitalize">
                    {view === 'month'
                        ? format(currentDate, 'MMMM yyyy', { locale: es })
                        : `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM', { locale: es })} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMM, yyyy', { locale: es })}`
                    }
                </div>
                <div className="w-32 hidden md:block"></div> {/* Spacer for symmetry */}
            </div>

            {/* Grid Area & Sidebar Container */}
            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Category Filters inside the content area */}
                    <div className="px-6 py-4 flex flex-wrap gap-2 bg-white/30 dark:bg-black/10">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${selectedCategory === 'all'
                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 shadow-sm'
                                : 'text-slate-500 border-transparent hover:border-slate-200'
                                }`}
                        >
                            Todos
                        </button>
                        {Object.entries(EVENT_TYPES).map(([key, val]) => (
                            <button
                                key={key}
                                onClick={() => setSelectedCategory(key)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${selectedCategory === key
                                    ? `bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 shadow-sm`
                                    : 'text-slate-500 border-transparent hover:border-slate-200'
                                    }`}
                            >
                                <span className={`w-2 h-2 rounded-full ${val.color}`} />
                                {val.label}
                            </button>
                        ))}
                    </div>

                    {isLoading && events.length === 0 ? (
                        <div className="flex-1 flex justify-center items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                    ) : (
                        view === 'month' ? renderMonthView() : renderWeekView()
                    )}
                </div>

                {/* Right Sidebar */}
                <aside className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex flex-col overflow-y-auto hidden xl:flex">
                    <div className="p-6 space-y-8">
                        {/* Upcoming Events */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Próximos Eventos</h3>
                            <div className="space-y-4">
                                {upcomingEvents.length > 0 ? (
                                    upcomingEvents.map(evt => (
                                        <div key={evt.id}
                                            onClick={() => openEditModal(evt)}
                                            className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${EVENT_TYPES[evt.event_type].color}`} />
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-sm text-slate-800 dark:text-white line-clamp-1 group-hover:text-blue-500 transition-colors">
                                                        {evt.title}
                                                    </h4>
                                                    <div className="flex items-center text-[10px] text-slate-500 mt-1 gap-2">
                                                        <Clock className="w-3 h-3" />
                                                        {format(new Date(evt.start_time), 'd MMM, HH:mm', { locale: es })}
                                                    </div>
                                                    {evt.location && (
                                                        <div className="flex items-center text-[10px] text-slate-500 mt-1 gap-2 truncate">
                                                            <MapPin className="w-3 h-3" />
                                                            {evt.location}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center">
                                        <CalendarIcon className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                                        <p className="text-sm font-bold text-slate-400">No hay eventos próximos</p>
                                        <p className="text-[10px] text-slate-500 mt-1">Crea tu primer evento</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Event Summary */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Resumen de Eventos</h3>
                            <div className="space-y-3">
                                {Object.entries(EVENT_TYPES).map(([key, val]) => (
                                    <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg ${val.color.replace('bg-', 'bg-')}/10 flex items-center justify-center`}>
                                                <val.icon className={`w-4 h-4 ${val.color.replace('bg-', 'text-')}`} />
                                            </div>
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{val.label}</span>
                                        </div>
                                        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center text-[10px] font-bold">
                                            {eventStats[key] || 0}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>
            </div>


            {/* Modal Crear/Editar */}
            {showModal && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto" onClick={() => setShowModal(false)}>
                    <div className="bg-white dark:bg-[#1a2235] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-white/10" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                                {editMode ? <Edit2 className="w-5 h-5 mr-2 text-blue-500" /> : <Plus className="w-5 h-5 mr-2 text-blue-500" />}
                                {editMode ? 'Editar Evento' : 'Nuevo Evento'}
                            </h2>
                            <div className="flex items-center gap-2">
                                {editMode && (
                                    <button onClick={(e) => handleDeleteEvent(selectedEventId!, e)} className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors" title="Eliminar">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-400 transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
                            <input
                                required
                                placeholder="Añade un título"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full text-xl font-semibold bg-transparent border-b-2 border-transparent hover:border-slate-200 focus:border-blue-500 dark:hover:border-white/10 dark:focus:border-blue-500 px-0 py-2 focus:outline-none transition-colors text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 mb-2"
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Inicio</label>
                                    <div className="relative">
                                        <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            required
                                            type="datetime-local"
                                            value={formData.start_time}
                                            onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Fin</label>
                                    <div className="relative">
                                        <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            required
                                            type="datetime-local"
                                            value={formData.end_time}
                                            onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                                            min={formData.start_time}
                                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Tipo de Evento</label>
                                    <select
                                        value={formData.event_type}
                                        onChange={e => setFormData({ ...formData, event_type: e.target.value as any })}
                                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
                                    >
                                        {Object.entries(EVENT_TYPES).map(([key, val]) => (
                                            <option key={key} value={key}>{val.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Ubicación / Enlace</label>
                                    <div className="relative">
                                        <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            placeholder="Google Meet, Oficina..."
                                            value={formData.location}
                                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center"><User className="w-3.5 h-3.5 mr-1" />Contacto</label>
                                    <input
                                        placeholder="Nombre del cliente"
                                        value={formData.client_name}
                                        onChange={e => setFormData({ ...formData, client_name: e.target.value })}
                                        className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center">&nbsp;</label>
                                    <input
                                        placeholder="Teléfono"
                                        value={formData.client_phone}
                                        onChange={e => setFormData({ ...formData, client_phone: e.target.value })}
                                        className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Descripción / Notas</label>
                                <textarea
                                    placeholder="Agrega notas o detalles adicionales..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all resize-none"
                                />
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex gap-3 justify-end items-center">
                                {formData.google_event_id && (
                                    <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center mr-auto bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-md">
                                        <Link className="w-3.5 h-3.5 mr-1.5" /> Sincronizado
                                    </div>
                                )}
                                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isSaving} className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold shadow-sm transition-colors disabled:opacity-50 flex items-center">
                                    {isSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    {isSaving ? 'Guardando...' : 'Guardar Evento'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
