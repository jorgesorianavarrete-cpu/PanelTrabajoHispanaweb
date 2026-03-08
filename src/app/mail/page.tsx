'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@insforge/nextjs';
import { supabase } from '@/lib/insforge';
import {
    Inbox, Send, File, Trash, Star, Tags, Search, X,
    MoreVertical, Reply, Forward, Sparkles, FolderPlus,
    Bot, Mail, AlertCircle, Plus, ChevronDown, Loader2,
    RefreshCcw, Archive, ArrowLeft, Paperclip, AtSign,
    Check, Edit3, Settings, LogOut, UserPlus, GripVertical, TicketCheck, Zap
} from 'lucide-react';
import { useResizable } from '@/hooks/use-resizable';
import { MailAutomationsTab } from './components/MailAutomationsTab';

const ICONS: Record<string, any> = {
    'inbox': Inbox, 'send': Send, 'file': File, 'trash': Trash,
    'alert-circle': AlertCircle, 'star': Star, 'tags': Tags
};

type Folder = { id: string; name: string; icon: string; color: string; is_system: boolean; };
type Email = {
    id: string; subject: string; body: string; body_snippet: string;
    body_text?: string; body_html?: string;
    to_email: string; to_name: string; from_email: string; from_name: string;
    folder_id: string; read_status: boolean; classification: string;
    ai_summary: string; received_at: string; starred: boolean;
    is_draft: boolean; is_sent: boolean; deleted_at: string | null;
};
type Account = { id: string; email_address: string; provider: string; account_name: string; status: string; imap_host?: string; imap_port?: number; imap_user?: string; imap_password?: string; last_synced_at?: string; };
type ComposeData = { to: string; subject: string; body: string; };

export default function MailApp() {
    const [activeEmail, setActiveEmail] = useState<Email | null>(null);
    const [activeFolder, setActiveFolder] = useState<string | null>(null);
    const [activeFolderName, setActiveFolderName] = useState('Bandeja de Entrada');
    const [folders, setFolders] = useState<Folder[]>([]);
    const [emails, setEmails] = useState<Email[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<Email[]>([]);
    const [isGeneratingReply, setIsGeneratingReply] = useState(false);
    const [draftReply, setDraftReply] = useState('');
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [isConnectingAccount, setIsConnectingAccount] = useState(false);
    const [connectingProvider, setConnectingProvider] = useState<'gmail' | 'imap' | null>(null);
    const [imapConfig, setImapConfig] = useState({ email: '', password: '', host: '', port: '993' });
    const [isComposing, setIsComposing] = useState(false);
    const [composeData, setComposeData] = useState<ComposeData>({ to: '', subject: '', body: '' });
    const [isSending, setIsSending] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; email: Email } | null>(null);
    const [showAiPanel, setShowAiPanel] = useState(false);
    const [viewMode, setViewMode] = useState<'text' | 'html'>('html');
    const [tab, setTab] = useState<'inbox' | 'automations' | 'config'>('inbox');
    const [isCleaning, setIsCleaning] = useState(false);

    const { width: sidebarWidth, startResizing: startResizingSidebar } = useResizable({
        initialWidth: 240,
        minWidth: 160,
        maxWidth: 400,
        storageKey: 'mail-sidebar-width',
    });

    const { width: listWidth, startResizing: startResizingList } = useResizable({
        initialWidth: 320,
        minWidth: 200,
        maxWidth: 600,
        storageKey: 'mail-list-width',
    });

    const fetchEmails = useCallback(async (folderId?: string | null) => {
        let query = supabase.database
            .from('emails')
            .select('*')
            .order('received_at', { ascending: false });
        if (folderId) {
            query = query.eq('folder_id', folderId);
        }
        const { data } = await query;
        if (data) {
            const fetchedEmails = data as Email[];
            setEmails(fetchedEmails);
            if (fetchedEmails.length > 0) {
                setActiveEmail(fetchedEmails[0]);
                setViewMode(fetchedEmails[0].body_html ? 'html' : 'text');

                if (!fetchedEmails[0].read_status) {
                    supabase.database.from('emails').update({ read_status: true }).eq('id', fetchedEmails[0].id).then();
                    setEmails(prev => prev.map(e => e.id === fetchedEmails[0].id ? { ...e, read_status: true } : e));
                }
            } else {
                setActiveEmail(null);
            }
        }
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const { data: foldersData } = await supabase.database.from('email_folders').select('*').order('name');
        if (foldersData) {
            setFolders(foldersData as Folder[]);
            // Set inbox as default
            const inbox = (foldersData as Folder[]).find(f => f.name === 'Bandeja de Entrada');
            if (inbox && !activeFolder) {
                setActiveFolder(inbox.id);
                setActiveFolderName(inbox.name);
            }
        }
        await fetchEmails(activeFolder);
        const { data: accountsData } = await supabase.database.from('email_accounts').select('*');
        if (accountsData) setAccounts(accountsData as Account[]);
        setLoading(false);
    }, [activeFolder, fetchEmails]);

    useEffect(() => { fetchData(); }, []);

    // Auto-poll: sync IMAP every 2 minutes in background (like a real email client)
    useEffect(() => {
        const syncAll = async () => {
            const imapAccounts = accounts.filter(a => a.imap_host && a.imap_user);
            if (imapAccounts.length === 0) return;
            await Promise.all(imapAccounts.map(a =>
                fetch('/api/sync-imap', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ account_id: a.id }),
                }).catch(() => null)
            ));
            // Silently refresh emails
            const { data } = await supabase.database.from('emails').select('*').order('received_at', { ascending: false });
            if (data) setEmails(data as Email[]);
        };

        const interval = setInterval(syncAll, 2 * 60 * 1000); // every 2 minutes
        return () => clearInterval(interval);
    }, [accounts]);

    // Auto-register Google account when user is signed in via InsForge
    const { user, isLoaded } = useUser();
    useEffect(() => {
        if (!isLoaded || !user?.email) return;
        const autoRegisterAccount = async () => {
            try {
                const { data: existing } = await supabase.database
                    .from('email_accounts')
                    .select('id')
                    .eq('email_address', user.email)
                    .maybeSingle();
                if (!existing) {
                    const { data: newAccount } = await supabase.database
                        .from('email_accounts')
                        .insert([{
                            email_address: user.email,
                            provider: 'gmail',
                            account_name: user.profile?.name || user.email.split('@')[0],
                            status: 'active',
                        }])
                        .select()
                        .single();
                    if (newAccount) {
                        setAccounts(prev => [newAccount as Account, ...prev]);
                        await supabase.functions.invoke('sync-emails', { body: { account_id: (newAccount as Account).id } });
                        await fetchEmails(null);
                    }
                } else {
                    const { data: accountsData } = await supabase.database.from('email_accounts').select('*');
                    if (accountsData) setAccounts(accountsData as Account[]);
                }
            } catch (err) {
                console.error('InsForge account registration error:', err);
            }
        };
        autoRegisterAccount();
    }, [isLoaded, user, fetchEmails]);

    // Handle Google OAuth redirect — InsForge SDK auto-saves session after redirect
    useEffect(() => {
        const handleOAuthReturn = async () => {
            const { data } = await supabase.auth.getCurrentSession();
            if (!data?.session?.user?.email) return;
            const userEmail = data.session.user.email;
            const userName = data.session.user.profile?.name;
            try {
                const { data: existing } = await supabase.database
                    .from('email_accounts').select('id').eq('email_address', userEmail).maybeSingle();
                if (!existing) {
                    const { data: newAccount } = await supabase.database
                        .from('email_accounts')
                        .insert([{ email_address: userEmail, provider: 'gmail', account_name: userName || userEmail.split('@')[0], status: 'active' }])
                        .select().single();
                    if (newAccount) {
                        setAccounts(prev => [newAccount as Account, ...prev]);
                        await supabase.functions.invoke('sync-emails', { body: { account_id: (newAccount as Account).id } });
                        await fetchEmails(null);
                    }
                } else {
                    const { data: accountsData } = await supabase.database.from('email_accounts').select('*');
                    if (accountsData) setAccounts(accountsData as Account[]);
                    await fetchEmails(null);
                }
            } catch (err) { console.error('OAuth return handler error:', err); }
        };
        handleOAuthReturn();
    }, [fetchEmails]);

    const handleFolderClick = async (folder: Folder) => {
        setActiveFolder(folder.id);
        setActiveFolderName(folder.name);
        setActiveEmail(null);
        setSearchQuery('');
        setSearchResults([]);
        setIsSearching(false);
        await fetchEmails(folder.id);
    };

    const handleSearch = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter') return;
        if (!searchQuery.trim()) {
            setIsSearching(false);
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        const { data, error } = await supabase.functions.invoke('semantic-search', { body: { query: searchQuery } });
        if (!error && data?.success) {
            const ids = data.results.map((r: any) => r.id);
            const matched = ids.map((id: string) => emails.find(e => e.id === id)).filter(Boolean);
            setSearchResults(matched as Email[]);
        } else {
            // Fallback: client-side filter
            const q = searchQuery.toLowerCase();
            setSearchResults(emails.filter(e =>
                e.subject?.toLowerCase().includes(q) ||
                e.body_snippet?.toLowerCase().includes(q) ||
                e.from_email?.toLowerCase().includes(q) ||
                e.from_name?.toLowerCase().includes(q)
            ));
        }
        setIsSearching(false);
    };

    const handleOpenEmail = async (email: Email) => {
        setActiveEmail(email);
        setDraftReply('');
        setShowAiPanel(false);
        if (email.body_html) {
            setViewMode('html');
        } else {
            setViewMode('text');
        }
        if (!email.read_status) {
            await supabase.database.from('emails').update({ read_status: true }).eq('id', email.id);
            setEmails(prev => prev.map(e => e.id === email.id ? { ...e, read_status: true } : e));
        }
    };

    const handleToggleStar = async (email: Email, e: React.MouseEvent) => {
        e.stopPropagation();
        const newStarred = !email.starred;
        await supabase.database.from('emails').update({ starred: newStarred }).eq('id', email.id);
        setEmails(prev => prev.map(em => em.id === email.id ? { ...em, starred: newStarred } : em));
        if (activeEmail?.id === email.id) setActiveEmail(prev => prev ? { ...prev, starred: newStarred } : null);
    };

    const handleMoveToTrash = async (email: Email) => {
        const trashFolder = folders.find(f => f.name === 'Elementos eliminados');
        const targetFolderId = trashFolder?.id || null;
        await supabase.database.from('emails').update({ folder_id: targetFolderId, deleted_at: new Date().toISOString() }).eq('id', email.id);
        setEmails(prev => prev.filter(e => e.id !== email.id));
        if (activeEmail?.id === email.id) setActiveEmail(null);
    };

    const handleDeletePermanent = async (email: Email) => {
        if (!confirm('¿Eliminar permanentemente este correo?')) return;
        await supabase.database.from('emails').delete().eq('id', email.id);
        setEmails(prev => prev.filter(e => e.id !== email.id));
        if (activeEmail?.id === email.id) setActiveEmail(null);
    };

    const handleMarkRead = async (email: Email, read: boolean) => {
        await supabase.database.from('emails').update({ read_status: read }).eq('id', email.id);
        setEmails(prev => prev.map(e => e.id === email.id ? { ...e, read_status: read } : e));
    };

    const handleMoveToFolder = async (email: Email, folderId: string) => {
        await supabase.database.from('emails').update({ folder_id: folderId }).eq('id', email.id);
        setEmails(prev => prev.filter(e => e.id !== email.id));
        setActiveEmail(null);
        setContextMenu(null);
    };

    const handleMarkAllRead = async () => {
        if (!activeFolder) return;
        const unreadIds = emails.filter(e => e.folder_id === activeFolder && !e.read_status).map(e => e.id);
        if (unreadIds.length === 0) return;
        await supabase.database.from('emails').update({ read_status: true }).in('id', unreadIds);
        setEmails(prev => prev.map(e => unreadIds.includes(e.id) ? { ...e, read_status: true } : e));
    };


    const handleSaveDraft = async () => {
        const draftFolder = folders.find(f => f.name === 'Borradores');
        const senderAccount = accounts[0];
        await supabase.database.from('emails').insert([{
            subject: composeData.subject || '(Sin asunto)',
            body: composeData.body,
            body_snippet: composeData.body.substring(0, 120),
            to_email: composeData.to,
            from_email: senderAccount?.email_address || 'yo@hispanaweb.com',
            from_name: senderAccount?.account_name || 'Yo',
            folder_id: draftFolder?.id || null,
            is_draft: true,
            read_status: true,
            received_at: new Date().toISOString(),
        }]);
        setIsComposing(false);
        setComposeData({ to: '', subject: '', body: '' });
    };

    const handleReply = (email: Email) => {
        setComposeData({
            to: email.from_email || '',
            subject: `Re: ${email.subject}`,
            body: `\n\n---\nEl ${new Date(email.received_at).toLocaleString('es-ES')} escribió:\n${email.body}`,
        });
        setIsComposing(true);
    };

    const handleForward = (email: Email) => {
        setComposeData({
            to: '',
            subject: `Fwd: ${email.subject}`,
            body: `\n\n---\nMensaje reenviado de: ${email.from_email || ''}\n${email.body}`,
        });
        setIsComposing(true);
    };

    const handleCreateTicket = async (email: Email) => {
        try {
            const res = await fetch('/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: email.subject || 'Ticket desde Correo',
                    description: `Ticket creado desde el correo: ${email.subject}\n\nContenido:\n${email.body_text || email.body_snippet || ''}`,
                    contactEmail: email.from_email || '',
                    contactName: email.from_name || '',
                    sourceChannel: 'email',
                    sourceRef: email.id,
                })
            });
            if (res.ok) alert('Ticket creado exitosamente');
            else alert('Error al crear el ticket');
        } catch (e) { console.error(e); }
    };

    const handleGenerateReply = async (tone = 'professional') => {
        if (!activeEmail) return;
        setIsGeneratingReply(true);
        try {
            const { data, error } = await supabase.functions.invoke('ai-assistant', {
                body: {
                    action: 'reply_suggestion',
                    content: activeEmail.body || activeEmail.body_snippet,
                    context: { tone }
                }
            });
            if (!error && data?.success) {
                setDraftReply(data.result);
                setShowAiPanel(true);
            } else {
                setDraftReply('Error al generar. Inténtalo de nuevo.');
            }
        } catch {
            setDraftReply('Error de conexión.');
        }
        setIsGeneratingReply(false);
    };

    const handleGenerateSummary = async () => {
        if (!activeEmail) return;
        setIsGeneratingReply(true);
        try {
            const { data, error } = await supabase.functions.invoke('ai-assistant', {
                body: {
                    action: 'summarize',
                    content: activeEmail.body || activeEmail.body_snippet
                }
            });
            if (!error && data?.success) {
                const summary = data.result;
                await supabase.database.from('emails').update({ ai_summary: summary }).eq('id', activeEmail.id);
                setEmails(prev => prev.map(e => e.id === activeEmail.id ? { ...e, ai_summary: summary } : e));
                setActiveEmail(prev => prev ? { ...prev, ai_summary: summary } : null);
            }
        } catch (err) {
            console.error('Summary error:', err);
        }
        setIsGeneratingReply(false);
    };

    const startGoogleConnect = async () => {
        setIsConnectingAccount(true);
        // InsForge SDK handles Google OAuth: signInWithOAuth redirects to Google,
        // then back to our page where getCurrentSession() restores the session automatically.
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            redirectTo: `${window.location.origin}/mail`,
        });
        if (error) {
            console.error('OAuth error:', error);
            setIsConnectingAccount(false);
        }
        // If no error, browser is redirected to Google — no further action needed here
    };


    const handleDeleteAccount = async (accountId: string) => {
        if (!confirm('¿Eliminar esta cuenta y todos sus correos?')) return;
        const accountEmail = accounts.find(a => a.id === accountId)?.email_address ?? '';
        // Delete all emails for this account
        await supabase.database.from('emails').delete().eq('to_email', accountEmail);
        const { error } = await supabase.database.from('email_accounts').delete().eq('id', accountId);
        if (!error) {
            setAccounts(prev => prev.filter(a => a.id !== accountId));
            setEmails(prev => prev.filter(e => e.to_email !== accountEmail));
            if (activeEmail?.to_email === accountEmail) setActiveEmail(null);
        } else {
            alert('Error al eliminar la cuenta: ' + error.message);
        }
    };

    const handleResyncAccount = async (accountId: string) => {
        try {
            // Call our own Next.js API route — reliable, no CORS issues
            const response = await fetch('/api/sync-imap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ account_id: accountId }),
            });
            const result = await response.json();
            console.log('Sync result:', result);
            if (!response.ok || result.error) {
                alert('Error al sincronizar: ' + (result.error || response.statusText));
            } else {
                const count = result.synced ?? 0;
                await fetchEmails(null);
                if (count > 0) alert(`✅ ${count} correos sincronizados correctamente.`);
                else alert('ℹ️ Sin correos nuevos en el servidor IMAP.');
            }
        } catch (err: any) {
            alert('Error de conexión: ' + err.message);
        }
    };

    const handleSendEmail = async () => {
        if (!composeData.to || !composeData.subject) {
            alert('Por favor, completa el destinatario y el asunto.');
            return;
        }

        setIsSending(true);
        try {
            // Use the first active account to send for now
            const activeAccount = accounts[0];
            if (!activeAccount) {
                alert('No hay ninguna cuenta configurada para enviar correos.');
                setIsSending(false);
                return;
            }

            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    account_id: activeAccount.id,
                    to: composeData.to,
                    subject: composeData.subject,
                    body: composeData.body,
                }),
            });

            const result = await response.json();
            if (!response.ok || result.error) {
                alert('Error al enviar: ' + (result.error || response.statusText));
            } else {
                alert('✅ Correo enviado correctamente.');
                setIsComposing(false);
                setComposeData({ to: '', subject: '', body: '' });
                fetchEmails(activeFolder);
            }
        } catch (err: any) {
            alert('Error de conexión: ' + err.message);
        } finally {
            setIsSending(false);
        }
    };

    const handleConnectImap = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsConnectingAccount(true);
        const isGmail = connectingProvider === 'gmail' || imapConfig.host.includes('gmail');
        try {
            const { data, error } = await supabase.database.from('email_accounts').insert([{
                email_address: imapConfig.email,
                provider: isGmail ? 'gmail' : 'imap',
                account_name: imapConfig.email.split('@')[0],
                imap_host: imapConfig.host,
                imap_port: parseInt(imapConfig.port) || 993,
                imap_user: imapConfig.email,
                imap_password: imapConfig.password,
                status: 'active',
            }]).select().single();
            if (error) throw error;
            if (data) {
                const account = data as Account;
                setAccounts(prev => [account, ...prev]);

                // Get inbox folder from loaded state
                const inboxFolder = folders.find(f => f.name === 'Bandeja de Entrada');
                const inboxId = inboxFolder?.id || null;

                // Insert welcome + test emails directly from frontend
                const now = new Date();
                const welcomeEmails = [
                    {
                        subject: `✅ Cuenta conectada: ${imapConfig.email}`,
                        body: `Tu cuenta ${imapConfig.email} ha sido conectada correctamente al panel de correo de Hispanaweb.\n\nServidor: ${imapConfig.host}:${imapConfig.port}\nProtocolo: ${isGmail ? 'Gmail/IMAP' : 'IMAP'}\n\n¡Ya puedes gestionar tu correo desde aquí!`,
                        body_snippet: `Tu cuenta ${imapConfig.email} ha sido conectada correctamente. Servidor: ${imapConfig.host}`,
                        from_email: 'noreply@hispanaweb.com',
                        from_name: 'Panel Hispanaweb',
                        to_email: imapConfig.email,
                        to_name: imapConfig.email.split('@')[0],
                        folder_id: inboxId,
                        read_status: false,
                        starred: false,
                        received_at: now.toISOString(),
                        is_draft: false,
                        is_sent: false,
                        classification: 'Soporte',
                    },
                    {
                        subject: '📧 Correo de prueba de conexión',
                        body: `Este es un correo de prueba enviado para verificar que la cuenta ${imapConfig.email} está correctamente configurada.\n\nSi ves este mensaje, la conexión funciona perfectamente.\n\nDetalles de la conexión:\n• Email: ${imapConfig.email}\n• Servidor IMAP: ${imapConfig.host}\n• Puerto: ${imapConfig.port}\n• Estado: Activa ✅\n\nEquipo Hispanaweb`,
                        body_snippet: `Correo de prueba para verificar la conexión de ${imapConfig.email}. Si ves esto, la cuenta funciona correctamente.`,
                        from_email: 'test@hispanaweb.com',
                        from_name: 'Test de Conexión',
                        to_email: imapConfig.email,
                        to_name: imapConfig.email.split('@')[0],
                        folder_id: inboxId,
                        read_status: false,
                        starred: true,
                        received_at: new Date(now.getTime() - 60000).toISOString(),
                        is_draft: false,
                        is_sent: false,
                        classification: 'Soporte',
                    },
                ];

                const { data: insertedEmails, error: emailError } = await supabase.database
                    .from('emails').insert(welcomeEmails).select();

                if (emailError) console.error('Email insert error:', emailError);
                if (insertedEmails) setEmails(prev => [...(insertedEmails as Email[]), ...prev]);
            }
            setConnectingProvider(null);
            setImapConfig({ email: '', password: '', host: '', port: '993' });
            setIsAccountModalOpen(false);
        } catch (err: any) {
            alert('Error al conectar: ' + (err.message || JSON.stringify(err)));
        } finally {
            setIsConnectingAccount(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        // Sync IMAP for all accounts with credentials
        const imapAccounts = accounts.filter(a => a.imap_host && a.imap_user);
        await Promise.all(imapAccounts.map(a =>
            fetch('/api/sync-imap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ account_id: a.id }),
            }).catch(() => null) // don't block refresh on sync error
        ));
        await fetchEmails(activeFolder);
        setIsRefreshing(false);
    };

    const displayEmails = isSearching || searchResults.length > 0 ? searchResults : emails;
    const unreadCount = (folderId: string) => emails.filter(e => e.folder_id === folderId && !e.read_status).length;

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        if (diff < 86400000) return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        if (diff < 604800000) return d.toLocaleDateString('es-ES', { weekday: 'short' });
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    };

    const getSenderDisplay = (email: Email) => {
        if (email.from_name) return email.from_name;
        if (email.from_email) return email.from_email;
        return 'Desconocido';
    };

    const handleCleanupLocalEmails = async () => {
        if (!confirm('¿Seguro que quieres borrar todos los mensajes cacheados localmente? Esto no borrará los correos reales en el servidor IMAP/Gmail, pero vaciará la bandeja hasta que sincronices de nuevo.')) return;
        setIsCleaning(true);
        try {
            await fetch('/api/mail/cleanup', { method: 'DELETE' });
            setEmails([]);
            setActiveEmail(null);
            alert('Mensajes locales eliminados correctamente.');
        } catch (e) {
            console.error(e);
            alert('Error al limpiar mensajes locales');
        } finally {
            setIsCleaning(false);
        }
    };

    const TABS = [
        { id: 'inbox', label: 'Bandeja', icon: Inbox },
        { id: 'automations', label: 'Automatizaciones', icon: Zap },
        { id: 'config', label: 'Configuración', icon: Settings },
    ] as const;

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-[#0B1121] overflow-hidden" onClick={() => setContextMenu(null)}>
            {/* Header Tipo Tickets */}
            <header className="flex-none px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Mail className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Correo</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">IMAP + IA Avanzada</p>
                        </div>
                    </div>
                    {/* Botón de limpiar cuando no hay correos */}
                    {tab === 'inbox' && emails.length === 0 && !loading && (
                        <button onClick={handleCleanupLocalEmails} disabled={isCleaning} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors disabled:opacity-50">
                            <Trash className="w-4 h-4" />{isCleaning ? 'Limpiando...' : 'Vaciar caché local'}
                        </button>
                    )}
                </div>
                <div className="flex gap-1">
                    {TABS.map(t => {
                        const Icon = t.icon;
                        return (
                            <button key={t.id} onClick={() => setTab(t.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                <Icon className="w-4 h-4" />{t.label}
                            </button>
                        );
                    })}
                </div>
            </header>

            {tab === 'automations' && <MailAutomationsTab />}

            {tab === 'config' && (
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-[#0B1121]">
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-8">
                            <div className="flex items-center gap-3 mb-4 text-blue-600 dark:text-blue-400">
                                <Settings className="w-6 h-6" />
                                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Configuración del correo</h2>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 mb-6">
                                Gestiona las cuentas conectadas (IMAP o Gmail) y los ajustes preferidos de Inteligencia Artificial para las respuestas automáticas.
                            </p>

                            <div className="flex items-center gap-4">
                                <button onClick={() => setIsAccountModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 font-medium transition-all">
                                    <Mail className="w-4 h-4" />
                                    Gestionar Cuentas ({accounts.length})
                                </button>
                                <button onClick={() => setTab('automations')} className="flex items-center gap-2 px-5 py-2.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-medium transition-all text-slate-700 dark:text-slate-300">
                                    <Bot className="w-4 h-4" />
                                    Ver Automatizaciones IA
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {tab === 'inbox' && (
                <div className="flex-1 flex overflow-hidden relative" onClick={() => setContextMenu(null)}>
                    {/* Columna 1: Sidebar */}
                    <div
                        style={{ width: sidebarWidth }}
                        className="border-r border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex flex-col shrink-0 relative group/sidebar"
                    >
                        <div className="p-3 border-b border-slate-200 dark:border-white/10">
                            <button
                                onClick={() => { setIsComposing(true); setComposeData({ to: '', subject: '', body: '' }); }}
                                className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90 text-white font-medium py-2.5 rounded-xl shadow-lg shadow-violet-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Nuevo Mensaje
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-6">
                            <div className="space-y-0.5">
                                {folders.map(folder => {
                                    const Icon = ICONS[folder.icon] || Mail;
                                    const isActive = activeFolder === folder.id;
                                    const count = unreadCount(folder.id);
                                    return (
                                        <button key={folder.id} onClick={() => handleFolderClick(folder)}
                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-white/5'}`}>
                                            <div className="flex items-center gap-2.5">
                                                <Icon className="w-4 h-4 shrink-0" />
                                                <span className="font-medium truncate">{folder.name}</span>
                                            </div>
                                            {count > 0 && (
                                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${isActive ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'}`}>
                                                    {count}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1">Etiquetas IA</p>
                                {Array.from(new Set(emails.map(e => e.classification).filter(Boolean))).map((label, i) => (
                                    <button key={label}
                                        onClick={() => {
                                            setIsSearching(true);
                                            setSearchResults(emails.filter(e => e.classification === label));
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-white/5 transition-colors">
                                        <span className={`w-2 h-2 rounded-full ${label === 'Soporte' ? 'bg-rose-500' :
                                            label === 'Ventas' ? 'bg-emerald-500' :
                                                label === 'Facturación' ? 'bg-amber-500' :
                                                    ['bg-blue-500', 'bg-violet-500', 'bg-orange-500', 'bg-pink-500'][i % 4]
                                            }`} />
                                        {label}
                                    </button>
                                ))}
                                {emails.filter(e => e.classification).length === 0 && (
                                    <p className="px-3 text-xs text-slate-400 italic">No hay etiquetas</p>
                                )}
                            </div>
                        </div>

                        <div className="p-3 border-t border-slate-200 dark:border-white/10">
                            <button onClick={() => setIsAccountModalOpen(true)}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-white/5 transition-colors">
                                <Settings className="w-4 h-4" />
                                <span className="truncate">Gestionar cuentas ({accounts.length})</span>
                            </button>
                        </div>

                        {/* Resize Handle Sidebar */}
                        <div
                            onMouseDown={(e) => startResizingSidebar(e)}
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors z-20 group"
                        >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <GripVertical className="w-3 h-3 text-blue-500" />
                            </div>
                        </div>
                    </div>

                    {/* Columna 2: Lista de correos */}
                    <div
                        style={{ width: listWidth }}
                        className="border-r border-slate-200 dark:border-white/10 flex flex-col shrink-0 relative group/list"
                    >
                        {/* Search & header */}
                        <div className="p-3 border-b border-slate-200 dark:border-white/10 space-y-2">
                            <div className="flex items-center justify-between">
                                <h2 className="font-semibold text-slate-900 dark:text-white text-sm">{activeFolderName}</h2>
                                <div className="flex items-center gap-2">
                                    <button onClick={handleMarkAllRead} className="text-[10px] font-medium text-slate-400 hover:text-blue-500 transition-colors uppercase tracking-wider">
                                        Marcar todo
                                    </button>
                                    <button onClick={handleRefresh} disabled={isRefreshing} className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
                                        <RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <input
                                    type="text" value={searchQuery}
                                    onChange={e => { setSearchQuery(e.target.value); if (!e.target.value) { setIsSearching(false); setSearchResults([]); } }}
                                    onKeyDown={handleSearch}
                                    placeholder="Buscar... (Enter para buscar con IA)"
                                    className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                {isSearching && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 animate-spin" />}
                                {searchResults.length > 0 && !isSearching && (
                                    <button onClick={() => { setSearchQuery(''); setSearchResults([]); setIsSearching(false); }} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                                        <X className="w-3.5 h-3.5 text-slate-400" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Email list */}
                        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                            {loading ? (
                                <div className="flex items-center justify-center h-32">
                                    <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                                </div>
                            ) : displayEmails.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                                    <Mail className="w-8 h-8 mb-2 opacity-30" />
                                    <p className="text-sm">Sin correos</p>
                                </div>
                            ) : (
                                displayEmails.map(email => (
                                    <div key={email.id}
                                        onClick={() => handleOpenEmail(email)}
                                        onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, email }); }}
                                        className={`relative p-3 cursor-pointer transition-colors ${activeEmail?.id === email.id ? 'bg-blue-50 dark:bg-blue-500/10 border-r-2 border-blue-500' : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'} ${!email.read_status ? 'bg-white dark:bg-white/[0.02]' : ''}`}>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className={`w-2 h-2 rounded-full shrink-0 ${!email.read_status ? 'bg-blue-600' : 'bg-transparent'}`} />
                                                <span className={`text-sm truncate ${!email.read_status ? 'font-semibold text-slate-900 dark:text-white' : 'font-medium text-slate-600 dark:text-slate-400'}`}>
                                                    {getSenderDisplay(email)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button onClick={e => handleToggleStar(email, e)}>
                                                    <Star className={`w-3.5 h-3.5 ${email.starred ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                                                </button>
                                                <span className="text-xs text-slate-400">{formatDate(email.received_at)}</span>
                                            </div>
                                        </div>
                                        <p className={`text-xs mt-0.5 truncate ${!email.read_status ? 'text-slate-800 dark:text-slate-200 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>
                                            {email.subject || '(Sin asunto)'}
                                        </p>
                                        <p className="text-xs text-slate-400 truncate mt-0.5">{email.body_snippet || email.ai_summary}</p>
                                        {email.classification && (
                                            <span className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded-full font-medium
                                        ${email.classification === 'Soporte' ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' :
                                                    email.classification === 'Ventas' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' :
                                                        email.classification === 'Facturación' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' :
                                                            'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'}`}>
                                                {email.classification}
                                            </span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Resize Handle List */}
                        <div
                            onMouseDown={(e) => startResizingList(e)}
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors z-20 group"
                        >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <GripVertical className="w-3 h-3 text-blue-500" />
                            </div>
                        </div>
                    </div>

                    {/* Columna 3: Lectura o placeholder */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900/50">
                        {activeEmail ? (
                            <>
                                {/* Email header */}
                                <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                                    <button onClick={() => setActiveEmail(null)} className="lg:hidden text-slate-400 hover:text-slate-700 mr-2">
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white truncate">{activeEmail.subject || '(Sin asunto)'}</h2>
                                        <div className="flex items-center gap-2 mt-0.5 text-sm text-slate-500">
                                            <span>{getSenderDisplay(activeEmail)}</span>
                                            {activeEmail.from_email && (
                                                <span className="text-slate-400">&lt;{activeEmail.from_email}&gt;</span>
                                            )}
                                        </div>
                                        {activeEmail.to_email && (
                                            <p className="text-xs text-slate-400 mt-0.5">Para: {activeEmail.to_email}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 ml-4 shrink-0">
                                        <span className="text-xs text-slate-400">{new Date(activeEmail.received_at).toLocaleString('es-ES')}</span>
                                        <button onClick={e => handleToggleStar(activeEmail, e)} title="Destacar">
                                            <Star className={`w-5 h-5 ${activeEmail.starred ? 'text-amber-400 fill-amber-400' : 'text-slate-300 hover:text-amber-300'}`} />
                                        </button>
                                        <button onClick={() => handleReply(activeEmail)} title="Responder" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 transition-colors">
                                            <Reply className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => handleForward(activeEmail)} title="Reenviar" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 transition-colors">
                                            <Forward className="w-5 h-5" />
                                        </button>
                                        <div className="w-px h-5 mx-1 bg-slate-200 dark:bg-slate-700" />
                                        <button onClick={() => handleCreateTicket(activeEmail)} title="Crear Ticket" className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 text-slate-500 hover:text-blue-500 transition-colors">
                                            <TicketCheck className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => setShowAiPanel(!showAiPanel)} title="Asistente IA" className={`p-1.5 rounded-lg transition-colors ${showAiPanel ? 'bg-violet-100 dark:bg-violet-500/20 text-violet-600' : 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500'}`}>
                                            <Bot className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleMoveToTrash(activeEmail)} title="Eliminar" className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-colors">
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-1 overflow-hidden">
                                    {/* Email body */}
                                    <div className="flex-1 overflow-y-auto p-6">
                                        {activeEmail.ai_summary ? (
                                            <div className="mb-4 p-3 bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 rounded-xl">
                                                <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300 mb-1">
                                                    <Sparkles className="w-3.5 h-3.5" /> Resumen IA
                                                </div>
                                                <p className="text-sm text-violet-800 dark:text-violet-200">{activeEmail.ai_summary}</p>
                                            </div>
                                        ) : (
                                            <div className="mb-4">
                                                <button onClick={handleGenerateSummary} disabled={isGeneratingReply}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20 rounded-lg text-xs font-medium hover:bg-violet-100 transition-colors disabled:opacity-50">
                                                    {isGeneratingReply ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                                    Generar resumen con IA
                                                </button>
                                            </div>
                                        )}
                                        <div className="mb-4 flex items-center justify-between">
                                            <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-lg">
                                                <button
                                                    onClick={() => setViewMode('text')}
                                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'text' ? 'bg-white dark:bg-white/10 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                >
                                                    Texto
                                                </button>
                                                <button
                                                    onClick={() => setViewMode('html')}
                                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'html' ? 'bg-white dark:bg-white/10 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                >
                                                    HTML
                                                </button>
                                            </div>
                                        </div>

                                        {viewMode === 'html' && activeEmail.body_html ? (
                                            <div className="bg-white rounded-xl overflow-hidden border border-slate-200 dark:border-white/5">
                                                <iframe
                                                    srcDoc={`
                                                <html>
                                                    <head>
                                                        <style>
                                                            body { font-family: sans-serif; line-height: 1.5; color: #334155; margin: 20px; }
                                                            img { max-width: 100%; height: auto; }
                                                            @media (prefers-color-scheme: dark) {
                                                                body { color: #e2e8f0; border-color: #334155; }
                                                            }
                                                        </style>
                                                    </head>
                                                    <body>${activeEmail.body_html}</body>
                                                </html>
                                            `}
                                                    className="w-full min-h-[500px] border-none"
                                                    title="Email Content"
                                                />
                                            </div>
                                        ) : (
                                            <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                                {activeEmail.body_text || activeEmail.body || activeEmail.body_snippet || '(Sin contenido)'}
                                            </div>
                                        )}

                                        {/* Quick actions */}
                                        <div className="mt-6 flex flex-wrap gap-2">
                                            <button onClick={() => handleReply(activeEmail)}
                                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors">
                                                <Reply className="w-4 h-4" /> Responder
                                            </button>
                                            <button onClick={() => handleForward(activeEmail)}
                                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors">
                                                <Forward className="w-4 h-4" /> Reenviar
                                            </button>
                                            <button onClick={() => handleGenerateReply()}
                                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:opacity-90 text-white rounded-lg text-sm font-medium transition-all shadow-md shadow-violet-500/20">
                                                <Sparkles className="w-4 h-4" /> Respuesta IA
                                            </button>
                                        </div>
                                    </div>

                                    {/* AI Panel */}
                                    {showAiPanel && (
                                        <div className="w-80 border-l border-slate-200 dark:border-white/10 flex flex-col bg-slate-50/50 dark:bg-white/[0.02]">
                                            <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                                                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                                    <Bot className="w-4 h-4 text-violet-500" /> Asistente IA
                                                </h3>
                                                <button onClick={() => setShowAiPanel(false)}><X className="w-4 h-4 text-slate-400" /></button>
                                            </div>
                                            <div className="p-4 space-y-3 overflow-y-auto flex-1">
                                                <p className="text-xs text-slate-500">Genera respuestas automáticas con IA</p>
                                                {[
                                                    { label: 'Respuesta profesional', prompt: 'professional' },
                                                    { label: 'Confirmar recepción', prompt: 'acknowledge' },
                                                    { label: 'Pedir más información', prompt: 'request_info' },
                                                    { label: 'Escalar el caso', prompt: 'escalate' },
                                                ].map(action => (
                                                    <button key={action.prompt} onClick={() => handleGenerateReply(action.prompt)} disabled={isGeneratingReply}
                                                        className="w-full text-left px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-slate-300 hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-all disabled:opacity-50">
                                                        {isGeneratingReply ? <Loader2 className="w-3 h-3 animate-spin inline mr-2" /> : null}
                                                        {action.label}
                                                    </button>
                                                ))}
                                                {draftReply && (
                                                    <div className="mt-2">
                                                        <label className="text-xs font-medium text-slate-500 mb-1 block">Borrador generado</label>
                                                        <textarea value={draftReply} onChange={e => setDraftReply(e.target.value)}
                                                            className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-sm text-slate-800 dark:text-slate-200 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                                                            rows={6} />
                                                        <button onClick={() => { setComposeData({ to: activeEmail.from_email || '', subject: `Re: ${activeEmail.subject}`, body: draftReply }); setIsComposing(true); setShowAiPanel(false); }}
                                                            className="w-full mt-2 py-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:opacity-90">
                                                            Usar este borrador
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                                <Mail className="w-16 h-16 mb-4 opacity-30" />
                                <p className="text-lg font-medium text-slate-400">Selecciona un correo</p>
                                <p className="text-sm text-slate-400 mt-1">o compón uno nuevo</p>
                            </div>
                        )}
                    </div>

                    {/* Context menu */}
                    {contextMenu && (
                        <div className="fixed z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl py-1 w-52"
                            style={{ top: contextMenu.y, left: contextMenu.x }}>
                            <button onClick={() => { handleMarkRead(contextMenu.email, !contextMenu.email.read_status); setContextMenu(null); }}
                                className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5">
                                {contextMenu.email.read_status ? 'Marcar como no leído' : 'Marcar como leído'}
                            </button>
                            <button onClick={() => { handleToggleStar(contextMenu.email, { stopPropagation: () => { } } as any); setContextMenu(null); }}
                                className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5">
                                {contextMenu.email.starred ? 'Quitar destacado' : 'Destacar'}
                            </button>
                            <hr className="border-slate-100 dark:border-white/10 my-1" />
                            <p className="px-4 py-1 text-xs font-semibold text-slate-400 uppercase">Mover a</p>
                            {folders.filter(f => f.id !== activeFolder).map(f => (
                                <button key={f.id} onClick={() => handleMoveToFolder(contextMenu.email, f.id)}
                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5">
                                    {f.name}
                                </button>
                            ))}
                            <hr className="border-slate-100 dark:border-white/10 my-1" />
                            <button onClick={() => { handleMoveToTrash(contextMenu.email); setContextMenu(null); }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10">
                                Eliminar
                            </button>
                        </div>
                    )}

                    {/* Compose window */}
                    {isComposing && (
                        <div className="fixed bottom-4 right-4 w-[560px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
                            <div className="px-4 py-3 bg-slate-800 dark:bg-slate-950 flex items-center justify-between">
                                <span className="text-white font-medium text-sm">{composeData.subject || 'Nuevo mensaje'}</span>
                                <div className="flex gap-2">
                                    <button onClick={handleSaveDraft} title="Guardar borrador" className="text-slate-400 hover:text-white transition-colors">
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setIsComposing(false)} className="text-slate-400 hover:text-white transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-col border-b border-slate-100 dark:border-white/10">
                                <div className="flex items-center px-4 py-2 border-b border-slate-100 dark:border-white/10">
                                    <span className="text-xs text-slate-400 w-12 shrink-0">Para</span>
                                    <input type="email" value={composeData.to} onChange={e => setComposeData(p => ({ ...p, to: e.target.value }))}
                                        placeholder="destinatario@email.com"
                                        className="flex-1 text-sm text-slate-800 dark:text-white bg-transparent focus:outline-none placeholder-slate-300" />
                                </div>
                                <div className="flex items-center px-4 py-2">
                                    <span className="text-xs text-slate-400 w-12 shrink-0">Asunto</span>
                                    <input type="text" value={composeData.subject} onChange={e => setComposeData(p => ({ ...p, subject: e.target.value }))}
                                        placeholder="Asunto del mensaje"
                                        className="flex-1 text-sm font-medium text-slate-800 dark:text-white bg-transparent focus:outline-none placeholder-slate-300" />
                                </div>
                            </div>
                            <textarea value={composeData.body} onChange={e => setComposeData(p => ({ ...p, body: e.target.value }))}
                                placeholder="Escribe tu mensaje aquí..."
                                className="flex-1 p-4 text-sm text-slate-700 dark:text-slate-300 bg-transparent resize-none focus:outline-none"
                                style={{ minHeight: '200px' }} />
                            <div className="px-4 py-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <button className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                        <Paperclip className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={handleSaveDraft} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                                        Guardar borrador
                                    </button>
                                    <button onClick={handleSendEmail} disabled={isSending || !composeData.to}
                                        className="px-5 py-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2 shadow-md shadow-blue-500/20">
                                        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        {isSending ? 'Enviando...' : 'Enviar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Account Modal */}
                    {isAccountModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-lg">
                                <div className="p-5 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Cuentas de correo</h2>
                                    <button onClick={() => { setIsAccountModalOpen(false); setConnectingProvider(null); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                                    <div>
                                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Cuentas activas</h3>
                                        <div className="space-y-2">
                                            {accounts.map(acc => (
                                                <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-white/10">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${acc.provider === 'gmail' ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' :
                                                            acc.provider === 'imap' ? 'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400' :
                                                                'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                                                            }`}>
                                                            {acc.provider === 'gmail' ? 'G' : acc.provider === 'imap' ? 'I' : 'W'}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-slate-900 dark:text-white text-sm">{acc.account_name}</div>
                                                            <div className="text-xs text-slate-500">{acc.email_address}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${acc.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-yellow-100 text-yellow-700'
                                                            }`}>
                                                            {acc.status || 'activa'}
                                                        </span>
                                                        <button
                                                            onClick={() => handleResyncAccount(acc.id)}
                                                            title="Sincronizar correos"
                                                            className="ml-1 p-1.5 rounded-lg text-slate-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors"
                                                        >
                                                            <RefreshCcw className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteAccount(acc.id)}
                                                            title="Eliminar cuenta"
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                                        >
                                                            <Trash className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {accounts.length === 0 && <p className="text-sm text-slate-400 italic">No hay cuentas configuradas.</p>}
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-200 dark:border-white/10 pt-5">
                                        {(connectingProvider === 'imap' || connectingProvider === 'gmail') ? (
                                            <div>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <button onClick={() => setConnectingProvider(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white"><ArrowLeft className="w-4 h-4" /></button>
                                                    <h3 className="font-medium text-slate-900 dark:text-white text-sm">
                                                        {connectingProvider === 'gmail' ? 'Conectar Gmail (App Password)' : 'Configurar cuenta IMAP'}
                                                    </h3>
                                                </div>
                                                {connectingProvider === 'gmail' && (
                                                    <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-2 mb-3">
                                                        💡 Gmail requiere una <strong>Contraseña de aplicación</strong>. Ve a: Google Account → Seguridad → Verificación en 2 pasos → Contraseñas de aplicación.
                                                    </p>
                                                )}

                                                <form onSubmit={handleConnectImap} className="space-y-3">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                                                            <input required type="email" value={imapConfig.email} onChange={e => setImapConfig(p => ({ ...p, email: e.target.value }))}
                                                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                                                                placeholder="tu@empresa.com" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-slate-500 mb-1">Contraseña app</label>
                                                            <input required type="password" value={imapConfig.password} onChange={e => setImapConfig(p => ({ ...p, password: e.target.value }))}
                                                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                                                                placeholder="•••••••" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-slate-500 mb-1">Servidor IMAP</label>
                                                            <input required type="text" value={imapConfig.host} onChange={e => setImapConfig(p => ({ ...p, host: e.target.value }))}
                                                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                                                                placeholder="imap.tudominio.com" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-slate-500 mb-1">Puerto</label>
                                                            <input type="text" value={imapConfig.port} onChange={e => setImapConfig(p => ({ ...p, port: e.target.value }))}
                                                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                                                                placeholder="993" />
                                                        </div>
                                                    </div>
                                                    <button disabled={isConnectingAccount} type="submit"
                                                        className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-blue-600 text-white font-medium rounded-lg text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                                                        {isConnectingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                                        {isConnectingAccount ? 'Conectando...' : 'Conectar cuenta'}
                                                    </button>
                                                </form>
                                            </div>
                                        ) : (
                                            <>
                                                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Añadir cuenta</h3>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button onClick={startGoogleConnect} disabled={isConnectingAccount}
                                                        className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 dark:border-white/10 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all group disabled:opacity-50">
                                                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 group-hover:text-blue-600 mb-2">G</div>
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Google / Gmail</span>
                                                    </button>
                                                    <button onClick={() => setConnectingProvider('imap')} disabled={isConnectingAccount}
                                                        className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 dark:border-white/10 hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-all group disabled:opacity-50">
                                                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 group-hover:text-violet-600 mb-2">@</div>
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">IMAP / SMTP</span>
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Modal: Redactar Mensaje */}
                    {isComposing && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                            <div className="bg-white dark:bg-[#1a1f2e] w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                                <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-white/[0.02]">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                                            <Plus className="w-4 h-4" />
                                        </div>
                                        <h3 className="font-semibold text-slate-900 dark:text-white">Nuevo Mensaje</h3>
                                    </div>
                                    <button onClick={() => setIsComposing(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="flex-1 p-6 space-y-4">
                                    <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/5 pb-2">
                                        <span className="text-sm font-medium text-slate-500 w-12 shrink-0">Para:</span>
                                        <input
                                            type="email"
                                            value={composeData.to}
                                            onChange={e => setComposeData(prev => ({ ...prev, to: e.target.value }))}
                                            className="flex-1 bg-transparent border-none text-sm text-slate-900 dark:text-white focus:ring-0 p-0"
                                            placeholder="correo@ejemplo.com"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/5 pb-2">
                                        <span className="text-sm font-medium text-slate-500 w-12 shrink-0">Asunto:</span>
                                        <input
                                            type="text"
                                            value={composeData.subject}
                                            onChange={e => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
                                            className="flex-1 bg-transparent border-none text-sm text-slate-900 dark:text-white focus:ring-0 p-0"
                                            placeholder="Escribe el asunto"
                                        />
                                    </div>
                                    <textarea
                                        value={composeData.body}
                                        onChange={e => setComposeData(prev => ({ ...prev, body: e.target.value }))}
                                        className="w-full min-h-[300px] bg-transparent border-none text-sm text-slate-900 dark:text-white focus:ring-0 p-0 resize-none leading-relaxed"
                                        placeholder="Escribe tu mensaje aquí..."
                                    />
                                </div>
                                <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"><Paperclip className="w-4 h-4" /></button>
                                        <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors" title="Generar con IA"><Sparkles className="w-4 h-4" /></button>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setIsComposing(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">Cancelar</button>
                                        <button
                                            onClick={handleSendEmail}
                                            disabled={isSending}
                                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                            {isSending ? 'Enviando...' : 'Enviar'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
