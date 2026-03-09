"use client";

import React, { useState, useEffect } from 'react';
import { Folder, File, ArrowLeft, Download, Trash2, Edit2, Loader2, UploadCloud, FileText } from 'lucide-react';

interface FileManagerProps {
    serverId: string;
    domainName: string;
    wwwRoot?: string;
    onClose: () => void;
}

interface PleskFile {
    name: string;
    type: 'file' | 'dir';
    size: number;
    modification_date: string;
    permissions: string;
}

export default function FileManager({ serverId, domainName, wwwRoot, onClose }: FileManagerProps) {
    // El docroot típico en Plesk es /var/www/vhosts/dominio.com/httpdocs o similares.
    // Usaremos un path base y permitiremos navegación.
    const initialPath = wwwRoot || `/var/www/vhosts/${domainName}`;
    const [currentPath, setCurrentPath] = useState(initialPath);
    const [files, setFiles] = useState<PleskFile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const fetchFiles = async (path: string) => {
        setIsLoading(true);
        setErrorMsg('');
        try {
            const res = await fetch('/api/plesk/proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serverId,
                    endpoint: `/api/v2/fs?file=${encodeURIComponent(path)}&detail=true`
                })
            });
            const result = await res.json();

            if (result.success && result.data && Array.isArray(result.data)) {
                // Mapear resultado asumiendo estándar Plesk FS API
                setFiles(result.data.map((f: any) => ({
                    name: f.name || f.basename || 'Unnamed',
                    type: f.is_directory ? 'dir' : 'file',
                    size: f.size || 0,
                    modification_date: f.modification_date || new Date().toISOString(),
                    permissions: f.permissions || '0644'
                })));
                setCurrentPath(path);
            } else {
                setErrorMsg('Directorio no encontrado o acceso denegado.');
                setFiles([]);
            }
        } catch (e: any) {
            setErrorMsg('Error de red al conectar con el servidor Plesk.');
            setFiles([]);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchFiles(initialPath);
    }, [serverId, initialPath]);

    const handleNavigateUp = () => {
        const parts = currentPath.split('/').filter(Boolean);
        if (parts.length > 0) {
            parts.pop();
            const newPath = '/' + parts.join('/');
            fetchFiles(newPath || '/');
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#0a0f1c] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                            <Folder className="w-5 h-5 mr-2 text-blue-500" />
                            Gestor de Archivos - {domainName}
                        </h2>
                        <p className="text-sm font-mono text-slate-500 mt-1">{currentPath}</p>
                    </div>
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors">
                        Cerrar
                    </button>
                </div>

                {/* Toolbar */}
                <div className="p-3 border-b border-slate-200 dark:border-white/10 flex items-center space-x-2">
                    <button
                        onClick={handleNavigateUp}
                        disabled={currentPath === '/'}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-600 dark:text-slate-400 disabled:opacity-50 transition-colors"
                        title="Subir un nivel"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="h-4 w-px bg-slate-300 dark:bg-white/20 mx-2"></div>
                    <button className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-lg text-sm font-medium transition-colors">
                        <UploadCloud className="w-4 h-4 mr-2" />
                        Subir Archivo
                    </button>
                    <button className="flex items-center px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors">
                        <Folder className="w-4 h-4 mr-2" />
                        Nueva Carpeta
                    </button>
                </div>

                {/* File List */}
                <div className="flex-1 overflow-y-auto bg-white dark:bg-[#0a0f1c] p-4 relative">
                    {isLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                            <p className="text-sm">Cargando directorio...</p>
                        </div>
                    ) : errorMsg ? (
                        <div className="text-center p-8 text-rose-500 bg-rose-50 dark:bg-rose-500/10 rounded-xl border border-rose-200 dark:border-rose-500/20">
                            <p className="font-semibold">{errorMsg}</p>
                            <p className="text-sm mt-2">Asegúrate de que la ruta o el dominio existan en el servidor e inténtalo de nuevo.</p>
                        </div>
                    ) : files.length === 0 ? (
                        <div className="text-center p-8 text-slate-500 flex flex-colItems-center justify-center h-full">
                            <Folder className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                            <p>Directorio vacío</p>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                            <table className="min-w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Nombre</th>
                                        <th className="px-4 py-3 font-medium w-24">Tamaño</th>
                                        <th className="px-4 py-3 font-medium w-32 hidden sm:table-cell">Modificado</th>
                                        <th className="px-4 py-3 font-medium w-24 hidden md:table-cell">Permisos</th>
                                        <th className="px-4 py-3 font-medium w-16 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {files.map((file, i) => (
                                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-4 py-2.5">
                                                <div
                                                    className={`flex items-center ${file.type === 'dir' ? 'cursor-pointer hover:underline text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}
                                                    onClick={() => file.type === 'dir' && fetchFiles(`${currentPath}/${file.name}`)}
                                                >
                                                    {file.type === 'dir'
                                                        ? <Folder className="w-4 h-4 mr-3 text-blue-400 fill-current opacity-70" />
                                                        : file.name.endsWith('.php') || file.name.endsWith('.html') || file.name.endsWith('.js')
                                                            ? <FileText className="w-4 h-4 mr-3 text-emerald-400" />
                                                            : <File className="w-4 h-4 mr-3 text-slate-400" />
                                                    }
                                                    <span className="truncate">{file.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                                                {file.type === 'dir' ? '--' : formatSize(file.size)}
                                            </td>
                                            <td className="px-4 py-2.5 text-slate-500 hidden sm:table-cell whitespace-nowrap">
                                                {new Date(file.modification_date).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-2.5 text-slate-500 font-mono text-xs hidden md:table-cell">
                                                {file.permissions}
                                            </td>
                                            <td className="px-4 py-2.5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="flex items-center justify-end space-x-1">
                                                    {file.type === 'file' && (
                                                        <button className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors" title="Descargar">
                                                            <Download className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button className="p-1.5 text-slate-400 hover:text-indigo-500 transition-colors" title="Renombrar">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors" title="Eliminar">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
