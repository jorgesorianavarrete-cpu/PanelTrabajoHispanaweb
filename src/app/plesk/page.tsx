'use client';

import { useState, useEffect } from 'react';
import {
    Server, Activity, HardDrive, Cpu, Globe,
    ShieldCheck, AlertTriangle, Play, Square,
    RefreshCw, Terminal, Search, Settings,
    ChevronLeft, ChevronRight, ArrowUpRight, Zap, CheckCircle2, Loader2, X, GripVertical, Folder, Trash2, Eye, EyeOff, Copy, Plus as PlusIcon, Users, Key
} from 'lucide-react';

import { insforge } from '@/lib/insforge';
import { useResizable } from '@/hooks/use-resizable';
import FileManager from '@/components/FileManager';

interface ServerData {
    id: string;
    name: string;
    ip: string;
    status: 'online' | 'warning' | 'offline';
    cpu_usage: number;
    ram_usage: number;
    disk_usage: number;
    uptime: string;
    pending_updates: number;
    location?: string;
    api_key?: string;
    api_url?: string;
    root_username?: string;
    root_password?: string;
    plesk_username?: string;
    plesk_password?: string;
}

interface DomainData {
    name: string;
    cms: string;
    php: string;
    ssl: boolean;
    size: string;
    www_root?: string;
}

export default function PleskServersApp() {
    const [servers, setServers] = useState<ServerData[]>([]);
    const [activeServerId, setActiveServerId] = useState<string>('');
    const [domains, setDomains] = useState<DomainData[]>([]);
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Global Data State (for Global Search)
    const [allData, setAllData] = useState<Record<string, {
        domains: any[],
        subscriptions: any[],
        customers: any[]
    }>>({});
    const [isGlobalLoading, setIsGlobalLoading] = useState(false);

    // Filter & Pagination State
    const [activeTab, setActiveTab] = useState<'domains' | 'subscriptions' | 'customers'>('subscriptions');
    const [searchQuery, setSearchQuery] = useState('');
    const [isGlobalSearch, setIsGlobalSearch] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    // Live Metrics State
    const [liveMetrics, setLiveMetrics] = useState<Record<string, {
        cpu: number,
        ram: number,
        disk?: number,
        load?: number[],
        ram_usage?: number,
        ram_total?: string,
        ram_used?: string,
        os_version?: string,
        plesk_version?: string
    }>>({});

    const [isAiScanning, setIsAiScanning] = useState(false);
    const [aiScanResult, setAiScanResult] = useState(false);
    const [aiDiagnosticText, setAiDiagnosticText] = useState('');
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);
    const { width: sidebarWidth, startResizing: startResizingSidebar } = useResizable({
        initialWidth: 320,
        minWidth: 260,
        maxWidth: 450,
        storageKey: 'plesk-sidebar-width',
    });

    useEffect(() => {
        fetchServers();
    }, []);

    const fetchServers = async () => {
        setIsLoading(true);
        const { data, error } = await insforge.database
            .from('hosting_servers')
            .select('*')
            .order('name');

        if (!error && data) {
            setServers(data as ServerData[]);
            if (data.length > 0) {
                setActiveServerId(data[0].id);
            }
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (activeServerId) fetchDomains(activeServerId);
    }, [activeServerId, activeTab]);

    const fetchDomains = async (serverId: string) => {
        setIsLoading(true);
        try {
            // Determine endpoint based on active tab
            let endpoint = '/api/v2/domains';
            if (activeTab === 'customers') {
                endpoint = '/api/v2/clients';
            }

            const res = await fetch(`${window.location.origin}/api/plesk/proxy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serverId, endpoint, withDetails: activeTab !== 'customers' })
            });
            const result = await res.json();
            if (result.success && Array.isArray(result.data)) {
                let mapped: any[] = [];
                if (activeTab === 'domains') {
                    mapped = result.data.map((d: any) => ({
                        name: d.name || d.ascii_name || 'Desconocido',
                        cms: d.cms || (d.description?.includes('WordPress') ? 'WordPress' : ''),
                        php: d.php || (d.hosting_type || 'Activo'),
                        ssl: d.ssl === true || d.status === 0 || d.ssl_certificate_id > 0,
                        size: 'N/A',
                        www_root: d.www_root,
                        serverId: serverId // For global search
                    }));
                    setDomains(mapped);
                } else if (activeTab === 'subscriptions') {
                    // Filter for primary domains
                    const subs = result.data.filter((d: any) => typeof d.base_domain_id === 'undefined' || d.base_domain_id === 0);
                    mapped = subs.map((s: any) => ({
                        name: s.name || s.ascii_name || 'Suscripción',
                        cms: s.cms || 'Contenido Raíz',
                        php: s.php || s.hosting_type || 'Activo',
                        ssl: s.ssl === true || s.status === 0 || s.ssl_certificate_id > 0,
                        size: 'N/A',
                        www_root: s.www_root,
                        serverId: serverId
                    }));
                    setSubscriptions(mapped);
                } else if (activeTab === 'customers') {
                    mapped = result.data.map((c: any) => ({
                        name: c.name || c.pname || c.login || 'Cliente',
                        cms: c.email || c.login || '',
                        php: 'Cliente',
                        ssl: false,
                        size: 'N/A',
                        www_root: '',
                        serverId: serverId
                    }));
                    setCustomers(mapped);
                }

                // Update AllData for Global Search
                setAllData(prev => ({
                    ...prev,
                    [serverId]: {
                        ...prev[serverId],
                        [activeTab]: mapped
                    }
                }));
            } else {
                if (activeTab === 'domains') setDomains([]);
                else if (activeTab === 'subscriptions') setSubscriptions([]);
                else setCustomers([]);
            }
        } catch (e) {
            console.error('Error fetching data from Plesk API:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchGlobalData = async () => {
        setIsGlobalLoading(true);
        try {
            const domainPromises = servers.map(server =>
                fetch(`${window.location.origin}/api/plesk/proxy`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ serverId: server.id, endpoint: '/api/v2/domains', withDetails: true })
                }).then(r => r.json()).then(result => ({ serverId: server.id, type: 'domains', result }))
            );

            const clientPromises = servers.map(server =>
                fetch(`${window.location.origin}/api/plesk/proxy`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ serverId: server.id, endpoint: '/api/v2/clients' })
                }).then(r => r.json()).then(result => ({ serverId: server.id, type: 'clients', result }))
            );

            const allResults = await Promise.all([...domainPromises, ...clientPromises]);
            const newData: Record<string, any> = {};
            servers.forEach(s => newData[s.id] = { domains: [], subscriptions: [], customers: [] });

            allResults.forEach(({ serverId, type, result }) => {
                const serverName = servers.find(s => s.id === serverId)?.name || 'Desconocido';
                if (result.success && Array.isArray(result.data)) {
                    if (type === 'domains') {
                        const mappedDomains = result.data.map((d: any) => ({
                            name: d.name || d.ascii_name || 'Desconocido',
                            cms: d.cms || (d.description?.includes('WordPress') ? 'WordPress' : ''),
                            php: d.php || (d.hosting_type || 'Activo'),
                            ssl: d.ssl === true || d.status === 0 || d.ssl_certificate_id > 0,
                            size: 'N/A',
                            www_root: d.www_root,
                            serverId: serverId,
                            server_name: serverName
                        }));
                        const subs = result.data.filter((d: any) => typeof d.base_domain_id === 'undefined' || d.base_domain_id === 0);
                        const mappedSubs = subs.map((s: any) => ({
                            name: s.name || s.ascii_name || 'Suscripción',
                            cms: s.cms || 'Contenido Raíz',
                            php: s.php || s.hosting_type || 'Activo',
                            ssl: s.ssl === true || s.status === 0 || s.ssl_certificate_id > 0,
                            size: 'N/A',
                            www_root: s.www_root,
                            serverId: serverId,
                            server_name: serverName
                        }));
                        newData[serverId].domains = mappedDomains;
                        newData[serverId].subscriptions = mappedSubs;
                    } else if (type === 'clients') {
                        const mappedClients = result.data.map((c: any) => ({
                            name: c.name || c.pname || c.login || 'Cliente',
                            cms: c.email || c.login || '',
                            php: 'Cliente',
                            ssl: false,
                            size: 'N/A',
                            www_root: '',
                            serverId: serverId,
                            server_name: serverName
                        }));
                        newData[serverId].customers = mappedClients;
                    }
                }
            });

            setAllData(newData);
        } catch (e) {
            console.error('Error fetching global data:', e);
        } finally {
            setIsGlobalLoading(false);
        }
    };

    const goToPlesk = async (serverId: string) => {
        const server = servers.find(s => s.id === serverId);
        if (!server) return;
        setIsGeneratingLink(true);
        try {
            const res = await fetch(`${window.location.origin}/api/plesk/proxy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serverId, endpoint: 'get_login_link' })
            });
            const result = await res.json();
            if (result.success && result.link) {
                window.open(result.link, '_blank');
            } else {
                window.open(server.api_url || `https://${server.ip}:8443`, '_blank');
            }
        } catch (e) {
            console.error('Login link error:', e);
            window.open(server.api_url || `https://${server.ip}:8443`, '_blank');
        } finally {
            setIsGeneratingLink(false);
        }
    };

    // Fetch Live Metrics without simulation
    useEffect(() => {
        if (servers.length === 0) return;

        // Initialize metrics state to 0 or database stored initial values
        const initialMetrics: Record<string, { cpu: number, ram: number, os_version: string, plesk_version: string }> = {};
        servers.forEach(s => {
            initialMetrics[s.id] = { cpu: 0, ram: 0, os_version: 'Obteniendo...', plesk_version: 'Obteniendo...' };
        });
        setLiveMetrics(initialMetrics);

        const fetchRealMetrics = async () => {
            if (!activeServerId) return;

            const s = servers.find(sv => sv.id === activeServerId);
            if (!s || !s.api_key) {
                return;
            }

            try {
                // Obtenemos metadata general del servidor en Plesk
                const res = await fetch(`${window.location.origin}/api/plesk/proxy`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ serverId: activeServerId, endpoint: '/api/v2/server', withMetrics: true })
                });
                const result = await res.json();

                if (result.success && result.data) {
                    const data = result.data;

                    let os_version = 'Desconocido';
                    let plesk_version = 'Desconocido';

                    if (data.stat?.version?.plesk_os) os_version = data.stat.version.plesk_os;
                    else if (data.version?.plesk_os) os_version = data.version.plesk_os;
                    else if (data.os) os_version = data.os;

                    if (data.stat?.version?.plesk_version) plesk_version = data.stat.version.plesk_version;
                    else if (data.version?.plesk_version) plesk_version = data.version.plesk_version;
                    else if (data.plesk_version) plesk_version = data.plesk_version;

                    // CPU / RAM real si la API (o nuestro enhancement SSH) lo expone
                    const cpu = data.cpu_usage ?? 0;
                    const ram = data.ram_usage ?? 0;
                    const disk = data.disk_usage ?? 0;

                    setLiveMetrics(prev => ({
                        ...prev,
                        [activeServerId]: {
                            ...prev[activeServerId],
                            cpu,
                            ram,
                            disk,
                            load: data.load,
                            ram_total: data.ram_total,
                            ram_used: data.ram_used
                        }
                    }));
                }
            } catch (e) {
                console.error('Failed to fetch real live metrics', e);
            }
        };

        // Primer fetch inmediato
        fetchRealMetrics();
        const interval = setInterval(fetchRealMetrics, 15000);
        return () => clearInterval(interval);
    }, [servers, activeServerId]);

    const handleServerAction = async (action: 'reboot' | 'stop') => {
        if (!currentServer) return;
        setActionLoading(action);

        try {
            const res = await fetch(`${window.location.origin}/api/plesk/reboot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serverId: currentServer.id, action })
            });
            const result = await res.json();
            if (result.success) {
                fetchServers(); // refresh state
            }
        } catch (e) {
            console.error('Error action server', e);
        } finally {
            setActionLoading(null);
        }
    };

    const currentServer = servers.find(s => s.id === activeServerId) || null;
    const currentMetrics = currentServer ? (liveMetrics[currentServer.id] || { cpu: currentServer.cpu_usage, ram: currentServer.ram_usage, os_version: 'Cargando...', plesk_version: 'Cargando...' }) : { cpu: 0, ram: 0, os_version: 'N/A', plesk_version: 'N/A' };
    const [showAddNodeModal, setShowAddNodeModal] = useState(false);
    const [showApiConfigModal, setShowApiConfigModal] = useState(false);
    const [apiConfigForm, setApiConfigForm] = useState({ id: '', api_key: '', api_url: '' });
    const [isSavingApi, setIsSavingApi] = useState(false);
    const [newNodeForm, setNewNodeForm] = useState({
        name: '', ip: '', location: '', api_url: '', api_key: '',
        root_username: 'root', root_password: '', plesk_username: 'admin', plesk_password: ''
    });
    const [isSavingNode, setIsSavingNode] = useState(false);
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error' | 'testingEdit' | 'successEdit' | 'errorEdit'>('idle');
    const [isGeneratingKey, setIsGeneratingKey] = useState<'idle' | 'add' | 'edit'>('idle');
    const [generateKeyError, setGenerateKeyError] = useState('');
    const [showRootPw, setShowRootPw] = useState(false);
    const [showPleskPw, setShowPleskPw] = useState(false);
    const [showEditNodeModal, setShowEditNodeModal] = useState(false);
    const [isUpdatingNode, setIsUpdatingNode] = useState(false);
    const [editNodeForm, setEditNodeForm] = useState({
        id: '', name: '', ip: '', location: '', api_url: '', api_key: '',
        root_username: 'root', root_password: '', plesk_username: 'admin', plesk_password: ''
    });

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };
    const [fileManagerDomain, setFileManagerDomain] = useState<string | null>(null);
    const [isDeletingServer, setIsDeletingServer] = useState(false);

    const handleSaveApiConfig = async () => {
        if (!apiConfigForm.id) return;
        setIsSavingApi(true);
        const { error } = await insforge.database
            .from('hosting_servers')
            .update({ api_key: apiConfigForm.api_key, api_url: apiConfigForm.api_url })
            .eq('id', apiConfigForm.id);

        if (!error) {
            setShowApiConfigModal(false);
            await fetchServers();
        }
        setIsSavingApi(false);
    };

    const handleTestConnection = async (url: string, key: string, source: 'add' | 'edit') => {
        if (!url || !key) return;
        setIsTestingConnection(true);
        setConnectionStatus(source === 'add' ? 'testing' : 'testingEdit');
        try {
            const res = await fetch(`${window.location.origin}/api/plesk/proxy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serverId: 'demo', // bypass flag
                    endpoint: '/api/v2/server',
                    testConfig: { api_url: url, api_key: key }
                })
            });
            const result = await res.json();
            if (result.success) {
                setConnectionStatus(source === 'add' ? 'success' : 'successEdit');
            } else {
                setConnectionStatus(source === 'add' ? 'error' : 'errorEdit');
            }
        } catch {
            setConnectionStatus(source === 'add' ? 'error' : 'errorEdit');
        }
        setIsTestingConnection(false);
    };

    const handleGenerateKey = async (source: 'add' | 'edit') => {
        const form = source === 'add' ? newNodeForm : editNodeForm;
        if (!form.ip || !form.root_username || (!form.root_password && !(source === 'edit' && currentServer?.root_password))) {
            setGenerateKeyError('Para generar la API Key, primero debes rellenar la IP, Usuario Root y Contraseña Root.');
            setTimeout(() => setGenerateKeyError(''), 5000);
            return;
        }

        setIsGeneratingKey(source);
        setGenerateKeyError('');

        try {
            const res = await fetch(`${window.location.origin}/api/plesk/generate-key`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ip: form.ip,
                    username: form.root_username,
                    password: form.root_password || currentServer?.root_password
                })
            });
            const result = await res.json();

            if (result.success && result.key) {
                if (source === 'add') {
                    setNewNodeForm(prev => ({ ...prev, api_key: result.key }));
                } else {
                    setEditNodeForm(prev => ({ ...prev, api_key: result.key }));
                }
            } else {
                setGenerateKeyError(result.error || 'Error desconocido generando clave.');
            }
        } catch (e: any) {
            setGenerateKeyError('Fallo en la conexión: ' + e.message);
        } finally {
            setIsGeneratingKey('idle');
            setTimeout(() => setGenerateKeyError(''), 8000);
        }
    };

    const handleAddNode = async () => {
        if (!newNodeForm.name || !newNodeForm.ip) return;
        setIsSavingNode(true);
        const { error } = await insforge.database.from('hosting_servers').insert([{
            name: newNodeForm.name,
            ip: newNodeForm.ip,
            location: newNodeForm.location || 'Sin especificar',
            status: 'online',
            cpu_usage: 0,
            ram_usage: 0,
            disk_usage: 0,
            uptime: '0d',
            pending_updates: 0,
            api_url: newNodeForm.api_url || `https://${newNodeForm.ip}:8443`,
            api_key: newNodeForm.api_key,
            root_username: newNodeForm.root_username,
            root_password: newNodeForm.root_password,
            plesk_username: newNodeForm.plesk_username,
            plesk_password: newNodeForm.plesk_password
        }]);
        if (!error) {
            setShowAddNodeModal(false);
            setNewNodeForm({ name: '', ip: '', location: '', api_url: '', api_key: '', root_username: 'root', root_password: '', plesk_username: 'admin', plesk_password: '' });
            setConnectionStatus('idle');
            await fetchServers();
        } else {
            console.error('Insert error', error);
            alert('Error al guardar: ' + error.message);
        }
        setIsSavingNode(false);
    };

    const handleUpdateNode = async () => {
        if (!editNodeForm.name || !editNodeForm.ip || !editNodeForm.id) return;
        setIsUpdatingNode(true);
        const updateData: any = {
            name: editNodeForm.name,
            ip: editNodeForm.ip,
            location: editNodeForm.location,
            api_url: editNodeForm.api_url || `https://${editNodeForm.ip}:8443`,
            root_username: editNodeForm.root_username,
            plesk_username: editNodeForm.plesk_username,
        };
        // Solo actualizamos contraseñas o claves si el usuario ha escrito algo en ellas
        if (editNodeForm.api_key) updateData.api_key = editNodeForm.api_key;
        if (editNodeForm.root_password) updateData.root_password = editNodeForm.root_password;
        if (editNodeForm.plesk_password) updateData.plesk_password = editNodeForm.plesk_password;

        const { error } = await insforge.database.from('hosting_servers')
            .update(updateData)
            .eq('id', editNodeForm.id);

        if (!error) {
            setShowEditNodeModal(false);
            await fetchServers();
        } else {
            console.error('Update error', error);
            alert('Error al guardar: ' + error.message);
        }
        setIsUpdatingNode(false);
    };

    const handleDeleteServer = async () => {
        if (!currentServer || !window.confirm(`¿Estás seguro de que quieres eliminar el servidor ${currentServer.name}?\nSe borrarán permanentemente sus datos y los de sus dominios asociados en el Panel.`)) return;

        setIsDeletingServer(true);
        try {
            const { error } = await insforge.database
                .from('hosting_servers')
                .delete()
                .eq('id', currentServer.id);

            if (error) throw error;

            // Refrescar lista y resetear panel activo
            await fetchServers();
            setActiveServerId(''); // Clear active server after deletion
        } catch (e) {
            console.error('Error borrando servidor:', e);
            alert('Error al intentar eliminar el servidor.');
        } finally {
            setIsDeletingServer(false);
        }
    };

    const [nodeHealthScore, setNodeHealthScore] = useState<number | null>(null);

    const runAiDiagnostic = async () => {
        if (!currentServer) return;
        setIsAiScanning(true);
        setAiScanResult(false);
        setAiDiagnosticText('');
        try {
            const m = currentMetrics;
            const domainContext = domains.map(d => `- ${d.name}: CMS=${d.cms}, PHP=${d.php}, SSL=${d.ssl ? 'Sí' : 'No'}`).join('\n');
            const prompt = `Analiza los siguientes métricas de un servidor Plesk y sus dominios alojados. Proporciona:
1. Un diagnóstico breve (máx. 3 frases).
2. Recomendaciones críticas.
3. Una puntuación de salud de 0 a 100 basada en TODO (métricas + estados de dominio). Formato: "PUNTUACIÓN: [valor]".

DATOS DEL SERVIDOR:
- Nombre: ${currentServer.name} (${currentServer.ip})
- CPU: ${m.cpu}% | RAM: ${m.ram}% | Disco: ${currentServer.disk_usage}%
- Uptime: ${currentServer.uptime}
- Actualizaciones pendientes: ${currentServer.pending_updates}

DOMINIOS ALOJADOS:
${domainContext || 'Sin dominios detectados.'}

Sé conciso y técnico.`;

            const res = await insforge.ai.chat.completions.create({
                model: 'openai/gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }]
            });
            const text = res?.choices?.[0]?.message?.content || 'Sin resultados.';

            // Extract score if exists
            const scoreMatch = text.match(/PUNTUACIÓN:\s*(\d+)/i);
            if (scoreMatch) {
                setNodeHealthScore(parseInt(scoreMatch[1]));
            } else {
                setNodeHealthScore(85); // fallback
            }

            setAiDiagnosticText(text.replace(/PUNTUACIÓN:\s*\d+/i, '').trim());
            setAiScanResult(true);
        } catch {
            setAiDiagnosticText('Error al conectar con el servicio de IA.');
            setAiScanResult(true);
        }
        setIsAiScanning(false);
    };

    if (isLoading && servers.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-[#0a0f1c]">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            </div>
        );
    }

    // Filtered & Paginated Results
    const getGlobalResults = () => {
        let all: any[] = [];
        Object.values(allData).forEach((data: any) => {
            if (searchQuery.trim() !== '') {
                // Return everything from all categories when searching globally
                all = [...all, ...(data.domains || []), ...(data.subscriptions || []), ...(data.customers || [])];
            } else {
                if (activeTab === 'domains') all = [...all, ...(data.domains || [])];
                else if (activeTab === 'subscriptions') all = [...all, ...(data.subscriptions || [])];
                else if (activeTab === 'customers') all = [...all, ...(data.customers || [])];
            }
        });

        if (searchQuery.trim() !== '') {
            const unique = new Map();
            all.forEach(item => {
                unique.set(`${item.serverId}-${item.name}`, item);
            });
            all = Array.from(unique.values());
        }

        return all;
    };

    const currentResults = isGlobalSearch ? getGlobalResults() : (activeTab === 'domains' ? domains : activeTab === 'subscriptions' ? subscriptions : customers);

    const filteredResults = currentResults.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.cms?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
    const paginatedResults = filteredResults.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleSelectItemsPerPage = (val: number) => {
        setItemsPerPage(val);
        setCurrentPage(1);
    };

    return (
        <>
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-[#0a0f1c] transition-colors relative">
                {/* Background aesthetics - Tech/Server style */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-slate-400/10 via-blue-500/5 to-transparent blur-3xl rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-cyan-500/10 via-emerald-500/5 to-transparent blur-3xl rounded-full pointer-events-none" />

                {/* Header Tipo Tickets */}
                <header className="flex-none px-6 py-4 border-b border-slate-200 dark:border-slate-800 relative z-10 w-full bg-slate-50/50 dark:bg-[#0B1121] backdrop-blur-md">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <Server className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Infraestructura Plesk</h1>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Monitorización, gestión de recursos y optimización IA de servidores</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-4 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm hidden md:flex">
                                <Activity className="w-4 h-4 text-emerald-500" />
                                <span>Sistema Global Operativo</span>
                            </div>
                            <button onClick={() => setShowAddNodeModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all">
                                <PlusIcon className="w-4 h-4" />
                                Añadir Nodo
                            </button>
                        </div>
                    </div>
                </header>

                {/* Main Container */}
                <div className="flex-1 flex overflow-hidden z-10">

                    {/* Sidebar: Server List */}
                    <div
                        style={{ width: sidebarWidth }}
                        className="border-r border-slate-200 dark:border-white/10 overflow-y-auto bg-slate-50/50 dark:bg-white/[0.02] flex flex-col shrink-0 relative"
                    >
                        {/* Resize Handle */}
                        <div
                            onMouseDown={startResizingSidebar}
                            className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50 transition-colors z-20 group"
                        >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <GripVertical className="w-3 h-3 text-blue-500" />
                            </div>
                        </div>

                        <div className="p-4 border-b border-slate-200 dark:border-white/10">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar servidor o IP..."
                                    className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                            {/* Global Search Button */}
                            <button
                                onClick={() => { setIsGlobalSearch(true); setActiveServerId(''); }}
                                className={`w-full text-left p-4 rounded-xl border transition-all mb-4 ${isGlobalSearch
                                    ? 'bg-blue-600 text-white border-blue-500 shadow-md ring-1 ring-blue-500/20'
                                    : 'bg-white/50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:bg-white/10 shadow-sm text-slate-900 dark:text-white'
                                    }`}
                            >
                                <div className="flex items-center space-x-3">
                                    <Search className={`w-5 h-5 ${isGlobalSearch ? 'text-white' : 'text-blue-500'}`} />
                                    <div>
                                        <div className="font-bold text-sm">Búsqueda Global</div>
                                        <div className={`text-[10px] ${isGlobalSearch ? 'text-blue-100' : 'text-slate-500'}`}>En todos los servidores</div>
                                    </div>
                                </div>
                            </button>

                            {servers.map((server) => (
                                <button
                                    key={server.id}
                                    onClick={() => { setActiveServerId(server.id); setIsGlobalSearch(false); }}
                                    className={`w-full text-left p-4 rounded-xl border transition-all ${activeServerId === server.id
                                        ? 'bg-white dark:bg-white/10 border-blue-500/50 dark:border-blue-400/50 shadow-md ring-1 ring-blue-500/20'
                                        : 'bg-white/50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:bg-white/10 shadow-sm'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center space-x-2">
                                            <Server className={`w-4 h-4 ${server.status === 'online' ? 'text-emerald-500' :
                                                server.status === 'warning' ? 'text-amber-500' : 'text-slate-400'
                                                }`} />
                                            <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">{server.name}</span>
                                        </div>
                                        {server.status === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
                                    </div>

                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-3 font-mono">
                                        {server.ip}
                                    </div>

                                    <div className="flex items-center space-x-3 text-xs font-medium">
                                        <div className="flex items-center tooltip-trigger" title="CPU">
                                            <Cpu className={`w-3.5 h-3.5 mr-1 ${(liveMetrics[server.id]?.cpu || server.cpu_usage) > 80 ? 'text-rose-500' : 'text-slate-400'}`} />
                                            <span className={(liveMetrics[server.id]?.cpu || server.cpu_usage) > 80 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'}>{liveMetrics[server.id]?.cpu || server.cpu_usage}%</span>
                                        </div>
                                        <div className="flex items-center tooltip-trigger" title="RAM">
                                            <Activity className={`w-3.5 h-3.5 mr-1 ${(liveMetrics[server.id]?.ram || server.ram_usage) > 80 ? 'text-amber-500' : 'text-slate-400'}`} />
                                            <span className={(liveMetrics[server.id]?.ram || server.ram_usage) > 80 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300'}>{liveMetrics[server.id]?.ram || server.ram_usage}%</span>
                                        </div>
                                        <div className="flex items-center tooltip-trigger" title="Disco">
                                            <HardDrive className="w-3.5 h-3.5 mr-1 text-slate-400" />
                                            <span className="text-slate-600 dark:text-slate-300">{liveMetrics[server.id]?.disk || server.disk_usage || 0}%</span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Panel: Server Dashboard */}
                    <div className="flex-1 overflow-y-auto p-8 relative">
                        {(!currentServer && !isGlobalSearch) ? (
                            <div className="max-w-5xl mx-auto flex flex-col items-center justify-center h-full text-slate-500 space-y-4">
                                <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-300">
                                    <Server className="w-10 h-10" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Panel de Infraestructura</h3>
                                    <p className="text-sm">Selecciona un servidor de la lista lateral o utiliza la Búsqueda Global.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="max-w-5xl mx-auto space-y-6 pb-12">
                                {isGlobalSearch ? (
                                    <div className="bg-blue-600 rounded-3xl p-8 shadow-xl text-white relative overflow-hidden group">
                                        <div className="absolute right-0 top-0 w-80 h-80 bg-white/10 blur-[80px] rounded-full -mr-20 -mt-20 group-hover:bg-white/20 transition-all duration-700" />
                                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                            <div>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl">
                                                        <Search className="w-6 h-6" />
                                                    </div>
                                                    <h2 className="text-3xl font-black tracking-tight">Búsqueda Global</h2>
                                                </div>
                                                <p className="text-blue-100/80 text-lg font-medium">Buscando en {servers.length} servidores activos</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                                                    <p className="text-[10px] uppercase font-bold text-blue-100 opacity-70">Servidores</p>
                                                    <p className="text-xl font-black">{servers.length}</p>
                                                </div>
                                                <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                                                    <p className="text-[10px] uppercase font-bold text-blue-100 opacity-70">Resultados</p>
                                                    <p className="text-xl font-black">{filteredResults.length}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : currentServer && (
                                    <>
                                        {/* Top Server Info Row */}
                                        <div className="flex flex-col md:flex-row gap-6 items-start justify-between bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                                            <div className="flex items-center space-x-6">
                                                <div className="relative">
                                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-white/5 dark:to-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center shadow-inner">
                                                        <Server className="w-8 h-8 text-slate-700 dark:text-slate-300" />
                                                    </div>
                                                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-[#0a0f1c] ${currentServer.status === 'online' ? 'bg-emerald-500' :
                                                        currentServer.status === 'warning' ? 'bg-amber-500' : 'bg-slate-400'
                                                        }`} />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1 flex items-center">
                                                        {currentServer.name}
                                                        {currentServer.status === 'online' && <span className="ml-3 text-[10px] uppercase font-bold tracking-wider bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded">Operativo</span>}
                                                        {currentServer.status === 'warning' && <span className="ml-3 text-[10px] uppercase font-bold tracking-wider bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded">Alerta</span>}
                                                    </h2>
                                                    <div className="flex items-center space-x-4 text-sm font-medium text-slate-500">
                                                        <span className="font-mono bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded">{currentServer.ip}</span>
                                                        <span className="flex items-center"><Activity className="w-4 h-4 mr-1 text-blue-500" /> {currentServer.uptime}</span>
                                                        <span className="flex items-center"><Globe className="w-4 h-4 mr-1 text-emerald-500" /> {domains.length} Dominios</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex space-x-2 w-full md:w-auto">
                                                <button onClick={() => handleServerAction('reboot')} disabled={actionLoading !== null} className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50" title="Reiniciar">
                                                    <RefreshCw className={`w-5 h-5 ${actionLoading === 'reboot' ? 'animate-spin' : ''}`} />
                                                </button>
                                                <button onClick={() => {
                                                    if (currentServer?.root_username && currentServer?.ip) {
                                                        try {
                                                            const sshUrl = `ssh://${currentServer.root_username}@${currentServer.ip}`;
                                                            window.location.href = sshUrl;
                                                        } catch (e) {
                                                            alert('Usa ssh ' + currentServer.root_username + '@' + currentServer.ip);
                                                        }
                                                    }
                                                }} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:shadow-lg transition-all font-medium flex items-center">
                                                    <Terminal className="w-4 h-4 mr-2" /> SSH
                                                </button>
                                                <button onClick={() => {
                                                    setApiConfigForm({ id: currentServer.id, api_key: currentServer.api_key || '', api_url: currentServer.api_url || `https://${currentServer.ip}:8443` });
                                                    setShowApiConfigModal(true);
                                                }} className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all font-medium shadow-sm flex items-center">
                                                    <Settings className="w-4 h-4 mr-2" /> API
                                                </button>
                                                <button onClick={() => {
                                                    setEditNodeForm({
                                                        id: currentServer.id, name: currentServer.name, ip: currentServer.ip, location: currentServer.location || '',
                                                        api_url: currentServer.api_url || '', api_key: currentServer.api_key || '',
                                                        root_username: currentServer.root_username || 'root', root_password: '',
                                                        plesk_username: currentServer.plesk_username || 'admin', plesk_password: ''
                                                    });
                                                    setShowEditNodeModal(true);
                                                }} className="p-2.5 rounded-xl border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors" title="Editar">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                                                </button>
                                                <button onClick={handleDeleteServer} disabled={isDeletingServer} className="p-2.5 rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors disabled:opacity-50" title="Eliminar">
                                                    {isDeletingServer ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>

                                        {!isGlobalSearch && !aiScanResult && (
                                            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-6 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between">
                                                <div className="absolute right-0 top-0 w-32 h-32 bg-amber-400/20 blur-3xl rounded-full" />
                                                <div className="flex items-start md:items-center space-x-4 relative z-10 mb-4 md:mb-0">
                                                    <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                                                        <Zap className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Diagnóstico Preventivo</h3>
                                                        <p className="text-sm text-slate-600 dark:text-slate-300">Inicia un escaneo IA para optimizar procesos.</p>
                                                    </div>
                                                </div>
                                                <button onClick={runAiDiagnostic} disabled={isAiScanning} className={`relative z-10 px-6 py-2.5 rounded-xl font-bold flex items-center shadow-lg transition-all text-white w-full md:w-auto justify-center ${isAiScanning ? 'bg-amber-400 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-amber-500/30'}`}>
                                                    {isAiScanning ? (<span className="flex items-center"><Loader2 className="w-4 h-4 animate-spin -ml-1 mr-3 h-4 w-4 text-white" /> Analizando...</span>) : (<span className="flex items-center"><Zap className="w-4 h-4 mr-2" /> Analizar con IA</span>)}
                                                </button>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {[
                                                { label: 'Uso de CPU', value: currentMetrics.cpu, icon: Cpu, color: currentMetrics.cpu > 80 ? 'text-rose-500' : 'text-blue-500', bg: currentMetrics.cpu > 80 ? 'bg-rose-500' : 'bg-blue-500' },
                                                { label: 'Memoria RAM', value: currentMetrics.ram, icon: Activity, color: currentMetrics.ram > 80 ? 'text-amber-500' : 'text-emerald-500', bg: currentMetrics.ram > 80 ? 'bg-amber-500' : 'bg-emerald-500' },
                                                { label: 'Almacenamiento', value: liveMetrics[currentServer?.id || '']?.disk || currentServer?.disk_usage || 0, icon: HardDrive, color: 'text-violet-500', bg: 'bg-violet-500' },
                                            ].map((metric, i) => (
                                                <div key={i} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">{metric.label}</h3>
                                                        <metric.icon className={`w-5 h-5 ${metric.color}`} />
                                                    </div>
                                                    <div className="flex items-end space-x-2 mb-4">
                                                        <span className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">{metric.value}%</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 dark:bg-white/10 rounded-full h-2.5 overflow-hidden">
                                                        <div className={`h-2.5 rounded-full ${metric.bg} transition-all duration-1000 ease-out`} style={{ width: `${metric.value}%` }}></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                            <div className="lg:col-span-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                                                <div className="p-5 border-b border-slate-200 dark:border-white/10 space-y-4">
                                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                        <div className="flex bg-slate-100 dark:bg-white/10 p-1 rounded-xl">
                                                            <button onClick={() => { setActiveTab('subscriptions'); setCurrentPage(1); }} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'subscriptions' ? 'bg-white dark:bg-white/20 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Suscripciones</button>
                                                            <button onClick={() => { setActiveTab('domains'); setCurrentPage(1); }} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'domains' ? 'bg-white dark:bg-white/20 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Dominios</button>
                                                            <button onClick={() => { setActiveTab('customers'); setCurrentPage(1); }} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'customers' ? 'bg-white dark:bg-white/20 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Clientes</button>
                                                        </div>
                                                        <div className="flex items-center gap-3 w-full sm:w-auto">
                                                            <div className="relative flex-1 sm:w-64">
                                                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                                <input type="text" placeholder="Buscar..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-inner" />
                                                            </div>
                                                            {isGlobalSearch ? (
                                                                <button onClick={fetchGlobalData} disabled={isGlobalLoading} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-all shadow-md disabled:opacity-50">
                                                                    {isGlobalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                                                    {isGlobalLoading ? 'Buscando...' : 'Actualizar'}
                                                                </button>
                                                            ) : (
                                                                <button onClick={() => activeServerId && goToPlesk(activeServerId)} disabled={isGeneratingLink} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-white/20 transition-all border border-slate-200 dark:border-white/10 whitespace-nowrap disabled:opacity-50">
                                                                    {isGeneratingLink ? 'Conectando...' : 'Ir a Plesk'} <ArrowUpRight className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex-1 divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-[#0a0f1c]/30 overflow-y-auto">
                                                    {isLoading || isGlobalLoading ? (
                                                        <div className="flex flex-col items-center justify-center h-full min-h-[300px] space-y-4">
                                                            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                                                            <p className="text-sm text-slate-500 font-medium">Consultando datos...</p>
                                                        </div>
                                                    ) : paginatedResults.length > 0 ? (
                                                        paginatedResults.map((item, i) => (
                                                            <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-all group border-l-2 border-transparent hover:border-blue-500">
                                                                <div className="flex items-center space-x-4">
                                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                                                        {activeTab === 'customers' ? <Users className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <p className="font-bold text-slate-900 dark:text-white tracking-tight">{item.name}</p>
                                                                            {isGlobalSearch && item.server_name && (
                                                                                <span className="text-[10px] font-black uppercase tracking-tighter bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/10">
                                                                                    {item.server_name}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                                                            {item.cms && <span className="text-blue-500">{item.cms}</span>}
                                                                            {item.cms && <span className="text-slate-300">•</span>}
                                                                            <span>{item.php || item.email || item.login || 'Propio'}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    {activeTab === 'domains' && (
                                                                        item.ssl ? (
                                                                            <span className="hidden sm:flex items-center text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                                                                                <ShieldCheck className="w-3 h-3 mr-1" /> SSL OK
                                                                            </span>
                                                                        ) : (
                                                                            <span className="hidden sm:flex items-center text-[10px] font-black uppercase tracking-widest text-rose-500 bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20">
                                                                                <AlertTriangle className="w-3 h-3 mr-1" /> Sin SSL
                                                                            </span>
                                                                        )
                                                                    )}
                                                                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0">
                                                                        {activeTab !== 'customers' && (
                                                                            <button onClick={() => setFileManagerDomain(item.name)} className="p-2 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-500 hover:text-blue-600 hover:border-blue-500/50 shadow-sm transition-all" title="Archivos">
                                                                                <Folder className="w-4 h-4" />
                                                                            </button>
                                                                        )}
                                                                        <button onClick={() => {
                                                                            const sId = item.server_id || activeServerId;
                                                                            const s = servers.find(srv => srv.id === sId);
                                                                            if (s) {
                                                                                const baseUrl = s.api_url || `https://${s.ip}:8443`;
                                                                                const target = activeTab === 'customers' ? `smb/customer/view/id/${item.id}` : `smb/web/view/id/${item.name}`;
                                                                                window.open(`${baseUrl}/${target}`, '_blank');
                                                                            }
                                                                        }} className="p-2 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-500 hover:text-blue-600 hover:border-blue-500/50 shadow-sm transition-all" title="Configuración">
                                                                            <Settings className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-400 space-y-2">
                                                            <Globe className="w-10 h-10 opacity-20" />
                                                            <p className="text-sm font-semibold">No se encontraron resultados</p>
                                                        </div>
                                                    )}
                                                </div>
                                                {filteredResults.length > 0 && (
                                                    <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                                                        <div className="flex items-center space-x-3 text-xs font-bold text-slate-500 tracking-tight">
                                                            <span>MOSTRAR</span>
                                                            <select value={itemsPerPage} onChange={(e) => handleSelectItemsPerPage(parseInt(e.target.value))} className="bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 outline-none text-blue-600">
                                                                {[20, 50, 100].map(v => <option key={v} value={v}>{v}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-xs font-black text-slate-400">PÁGINA <span className="text-blue-600">{currentPage}</span> DE {totalPages || 1}</span>
                                                            <div className="flex gap-1">
                                                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-20 hover:bg-white dark:hover:bg-white/10 transition-all font-bold"><ChevronLeft className="w-4 h-4" /></button>
                                                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-20 hover:bg-white dark:hover:bg-white/10 transition-all font-bold"><ChevronRight className="w-4 h-4" /></button>
                                                            </div>
                                                        </div>
                                                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest hidden md:block">
                                                            TOTAL <span className="text-slate-900 dark:text-white px-1.5 py-0.5 bg-slate-100 dark:bg-white/10 rounded">{filteredResults.length}</span> REGISTROS
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            {!isGlobalSearch && (
                                                <div className="space-y-6">
                                                    <div className="bg-slate-900 dark:bg-white/5 border border-slate-800 dark:border-white/10 rounded-2xl p-6 text-white shadow-2xl relative overflow-hidden">
                                                        <h3 className="font-bold flex items-center gap-2 mb-4">
                                                            <ShieldCheck className="w-5 h-5 text-blue-400" /> Salud del Nodo
                                                        </h3>
                                                        <div className="space-y-4">
                                                            <div className="grid grid-cols-3 gap-3">
                                                                {['1m', '5m', '15m'].map((time, idx) => (
                                                                    <div key={time} className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
                                                                        <p className="text-[10px] text-slate-500 mb-1">{time}</p>
                                                                        <p className="text-base font-black">{(currentMetrics as any).load?.[idx] || '0.00'}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm overflow-hidden group">
                                                        <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                                                            <Key className="w-5 h-5 text-blue-500" /> Bóveda de Accesos
                                                        </h3>
                                                        <div className="space-y-3">
                                                            {[
                                                                { label: 'Acceso SSH (Root)', user: currentServer?.root_username || 'root', pass: currentServer?.root_password, show: showRootPw, setShow: setShowRootPw },
                                                                { label: 'Acceso Plesk (Admin)', user: currentServer?.plesk_username || 'admin', pass: currentServer?.plesk_password, show: showPleskPw, setShow: setShowPleskPw }
                                                            ].map((box, i) => (
                                                                <div key={i} className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 border border-slate-200 dark:border-white/10">
                                                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-3">{box.label}</p>
                                                                    <div className="space-y-2">
                                                                        <div className="flex justify-between items-center bg-white dark:bg-black/20 rounded-lg px-3 py-1.5 border border-slate-100 dark:border-white/5">
                                                                            <span className="font-mono text-xs font-bold">{box.user}</span>
                                                                            <button onClick={() => copyToClipboard(box.user)} className="text-slate-300 hover:text-blue-500"><Copy className="w-3.5 h-3.5" /></button>
                                                                        </div>
                                                                        <div className="flex justify-between items-center bg-white dark:bg-black/20 rounded-lg px-3 py-1.5 border border-slate-100 dark:border-white/5">
                                                                            <span className="font-mono text-xs font-bold">{box.show ? (box.pass || '---') : '••••••••'}</span>
                                                                            <div className="flex gap-2">
                                                                                <button onClick={() => box.setShow(!box.show)} className="text-slate-300 hover:text-blue-500">
                                                                                    {box.show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                                                </button>
                                                                                <button onClick={() => copyToClipboard(box.pass || '')} className="text-slate-300 hover:text-blue-500"><Copy className="w-3.5 h-3.5" /></button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Node Modal */}
            {
                showAddNodeModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-[#0f1629] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/10 shrink-0">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Añadir Nuevo Servidor Plesk</h2>
                                <button onClick={() => setShowAddNodeModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-8">
                                {/* Sección: Detalles Básicos */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center">
                                        <Server className="w-4 h-4 mr-2 text-blue-500" /> Datos Básicos
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nombre *</label>
                                            <input type="text" placeholder="ej: VPS-Madrid-01" value={newNodeForm.name} onChange={e => setNewNodeForm(prev => ({ ...prev, name: e.target.value }))} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Dirección IP *</label>
                                            <input type="text" placeholder="ej: 192.168.1.100" value={newNodeForm.ip} onChange={e => setNewNodeForm(prev => ({ ...prev, ip: e.target.value }))} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                                        </div>
                                    </div>
                                </div>

                                {/* Sección: Conexión API */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center">
                                        <Globe className="w-4 h-4 mr-2 text-indigo-500" /> Conexión API Plesk
                                    </h3>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">URL de la API Plesk</label>
                                        <input type="text" placeholder="ej: https://192.168.1.100:8443" value={newNodeForm.api_url} onChange={e => setNewNodeForm(prev => ({ ...prev, api_url: e.target.value }))} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Plesk API Key (Secret Key)</label>
                                        <div className="flex gap-2 mb-2">
                                            <input type="password" placeholder="Clave generada en Plesk" value={newNodeForm.api_key} onChange={e => setNewNodeForm(prev => ({ ...prev, api_key: e.target.value }))} className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                                            <button
                                                onClick={() => handleTestConnection(newNodeForm.api_url, newNodeForm.api_key, 'add')}
                                                disabled={!newNodeForm.api_key || isTestingConnection}
                                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap flex items-center"
                                                title="La URL se generará automáticamente usando el puerto 8443 si se deja en blanco"
                                            >
                                                {(isTestingConnection && connectionStatus === 'testing') ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                                                Probar Conexión
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => handleGenerateKey('add')}
                                            disabled={isGeneratingKey !== 'idle' || !newNodeForm.ip || !newNodeForm.root_password}
                                            className="w-full px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center">
                                            {isGeneratingKey === 'add' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                                            {isGeneratingKey === 'add' ? 'Conectando por SSH y generando...' : 'Generar y Auto-Rellenar API Key vía SSH'}
                                        </button>
                                        {generateKeyError && <p className="text-rose-500 text-xs mt-2 flex items-center"><AlertTriangle className="w-3.5 h-3.5 mr-1" /> {generateKeyError}</p>}
                                        {connectionStatus === 'success' && <p className="text-emerald-500 text-xs mt-2 flex items-center"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Conexión exitosa a Plesk.</p>}
                                        {connectionStatus === 'error' && <p className="text-rose-500 text-xs mt-2 flex items-center"><AlertTriangle className="w-3.5 h-3.5 mr-1" /> Fallo de conexión o credenciales inválidas.</p>}
                                    </div>
                                </div>

                                {/* Sección: Credenciales Bóveda */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center">
                                        <ShieldCheck className="w-4 h-4 mr-2 text-emerald-500" /> Bóveda de Accesos Privados
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 space-y-3">
                                            <h4 className="text-xs font-semibold text-slate-500">ACCESO SSH / ROOT</h4>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Usuario</label>
                                                <input type="text" value={newNodeForm.root_username} onChange={e => setNewNodeForm(prev => ({ ...prev, root_username: e.target.value }))} className="w-full bg-white dark:bg-[#0f1629] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Contraseña</label>
                                                <input type="password" value={newNodeForm.root_password} onChange={e => setNewNodeForm(prev => ({ ...prev, root_password: e.target.value }))} className="w-full bg-white dark:bg-[#0f1629] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm" />
                                            </div>
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 space-y-3">
                                            <h4 className="text-xs font-semibold text-slate-500">ACCESO PLESK PANEL</h4>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Usuario</label>
                                                <input type="text" value={newNodeForm.plesk_username} onChange={e => setNewNodeForm(prev => ({ ...prev, plesk_username: e.target.value }))} className="w-full bg-white dark:bg-[#0f1629] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Contraseña</label>
                                                <input type="password" value={newNodeForm.plesk_password} onChange={e => setNewNodeForm(prev => ({ ...prev, plesk_password: e.target.value }))} className="w-full bg-white dark:bg-[#0f1629] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] rounded-b-2xl shrink-0">
                                <button onClick={() => setShowAddNodeModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleAddNode}
                                    disabled={isSavingNode || !newNodeForm.name || !newNodeForm.ip}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold shadow-md hover:from-blue-500 hover:to-indigo-500 transition-all disabled:opacity-50"
                                >
                                    {isSavingNode ? 'Guardando red...' : 'Registrar Servidor'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Edit Node Modal */}
            {
                showEditNodeModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-[#0f1629] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/10 shrink-0">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Editar Servidor Plesk</h2>
                                <button onClick={() => setShowEditNodeModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-8">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center">
                                        <Server className="w-4 h-4 mr-2 text-blue-500" /> Datos Básicos
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nombre *</label>
                                            <input type="text" placeholder="ej: VPS-Madrid-01" value={editNodeForm.name} onChange={e => setEditNodeForm(prev => ({ ...prev, name: e.target.value }))} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Dirección IP *</label>
                                            <input type="text" placeholder="ej: 192.168.1.100" value={editNodeForm.ip} onChange={e => setEditNodeForm(prev => ({ ...prev, ip: e.target.value }))} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Localización (Geográfica / DC)</label>
                                            <input type="text" placeholder="ej: Madrid, ES" value={editNodeForm.location} onChange={e => setEditNodeForm(prev => ({ ...prev, location: e.target.value }))} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center">
                                        <Globe className="w-4 h-4 mr-2 text-indigo-500" /> Conexión API Plesk
                                    </h3>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">URL de la API Plesk</label>
                                        <input type="text" placeholder="ej: https://192.168.1.100:8443" value={editNodeForm.api_url} onChange={e => setEditNodeForm(prev => ({ ...prev, api_url: e.target.value }))} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Plesk API Key (Opcional si no se cambia)</label>
                                        <div className="flex gap-2 mb-2">
                                            <input type="password" placeholder="Dejar en blanco para mantener la actual" value={editNodeForm.api_key} onChange={e => setEditNodeForm(prev => ({ ...prev, api_key: e.target.value }))} className="flex-1 w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                                            <button
                                                onClick={() => handleTestConnection(editNodeForm.api_url, editNodeForm.api_key, 'edit')}
                                                disabled={!editNodeForm.api_key || isTestingConnection}
                                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap flex items-center"
                                                title="La URL se generará automáticamente usando el puerto 8443 si se deja en blanco"
                                            >
                                                {(isTestingConnection && connectionStatus === 'testingEdit') ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                                                Probar Conexión
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => handleGenerateKey('edit')}
                                            disabled={isGeneratingKey !== 'idle' || !editNodeForm.ip || (!editNodeForm.root_password && !currentServer?.root_password)}
                                            className="w-full px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center">
                                            {isGeneratingKey === 'edit' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                                            {isGeneratingKey === 'edit' ? 'Conectando por SSH y generando...' : 'Generar y Auto-Rellenar API Key vía SSH'}
                                        </button>
                                        {generateKeyError && <p className="text-rose-500 text-xs mt-2 flex items-center"><AlertTriangle className="w-3.5 h-3.5 mr-1" /> {generateKeyError}</p>}
                                        {connectionStatus === 'successEdit' && <p className="text-emerald-500 text-xs mt-2 flex items-center"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Conexión exitosa a Plesk.</p>}
                                        {connectionStatus === 'errorEdit' && <p className="text-rose-500 text-xs mt-2 flex items-center"><AlertTriangle className="w-3.5 h-3.5 mr-1" /> Fallo de conexión o credenciales inválidas.</p>}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center">
                                        <ShieldCheck className="w-4 h-4 mr-2 text-emerald-500" /> Bóveda de Accesos Privados
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 space-y-3">
                                            <h4 className="text-xs font-semibold text-slate-500">ACCESO SSH / ROOT</h4>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Usuario</label>
                                                <input type="text" value={editNodeForm.root_username} onChange={e => setEditNodeForm(prev => ({ ...prev, root_username: e.target.value }))} className="w-full bg-white dark:bg-[#0f1629] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Contraseña (Opcional)</label>
                                                <input type="password" placeholder="Dejar en blanco para mantener" value={editNodeForm.root_password} onChange={e => setEditNodeForm(prev => ({ ...prev, root_password: e.target.value }))} className="w-full bg-white dark:bg-[#0f1629] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm" />
                                            </div>
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 space-y-3">
                                            <h4 className="text-xs font-semibold text-slate-500">ACCESO PLESK PANEL</h4>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Usuario</label>
                                                <input type="text" value={editNodeForm.plesk_username} onChange={e => setEditNodeForm(prev => ({ ...prev, plesk_username: e.target.value }))} className="w-full bg-white dark:bg-[#0f1629] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Contraseña (Opcional)</label>
                                                <input type="password" placeholder="Dejar en blanco para mantener" value={editNodeForm.plesk_password} onChange={e => setEditNodeForm(prev => ({ ...prev, plesk_password: e.target.value }))} className="w-full bg-white dark:bg-[#0f1629] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] rounded-b-2xl shrink-0">
                                <button onClick={() => setShowEditNodeModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleUpdateNode}
                                    disabled={isUpdatingNode || !editNodeForm.name || !editNodeForm.ip}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold shadow-md hover:from-blue-500 hover:to-indigo-500 transition-all disabled:opacity-50"
                                >
                                    {isUpdatingNode ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* API Config Modal */}
            {
                showApiConfigModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-[#0f1629] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Configuración API Plesk</h2>
                                <button onClick={() => setShowApiConfigModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">URL de la API</label>
                                    <input
                                        type="text"
                                        placeholder="ej: https://192.168.1.100:8443"
                                        value={apiConfigForm.api_url}
                                        onChange={e => setApiConfigForm(prev => ({ ...prev, api_url: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Secret Key (API Key)</label>
                                    <input
                                        type="password"
                                        placeholder="Clave generada en Plesk"
                                        value={apiConfigForm.api_key}
                                        onChange={e => setApiConfigForm(prev => ({ ...prev, api_key: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button onClick={() => setShowApiConfigModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveApiConfig}
                                    disabled={isSavingApi || !apiConfigForm.api_url}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-all disabled:opacity-50"
                                >
                                    {isSavingApi ? 'Guardando...' : 'Guardar Credenciales'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                fileManagerDomain && (
                    <FileManager
                        serverId={activeServerId}
                        domainName={fileManagerDomain}
                        wwwRoot={domains.find(d => d.name === fileManagerDomain)?.www_root || ''}
                        onClose={() => setFileManagerDomain(null)}
                    />
                )
            }
        </>
    );
}
