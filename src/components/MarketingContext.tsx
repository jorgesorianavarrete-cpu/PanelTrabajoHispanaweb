"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { insforge } from '@/lib/insforge';

export interface Client {
    id: number;
    name: string;
    sector: string;
    color: string;
}

export interface MarketingAsset {
    id: string | number;
    client_id: number | null;
    type: 'image' | 'video' | 'audio' | 'song';
    url: string;
    title: string;
    model: string;
    metadata: any;
    created_at: string;
}


interface MarketingContextType {
    clients: Client[];
    activeClient: Client | null;
    setActiveClientId: (id: number | null) => void;
    assets: MarketingAsset[];
    refreshAssets: () => Promise<void>;
    loading: boolean;
}


const MarketingContext = createContext<MarketingContextType>({
    clients: [],
    activeClient: null,
    setActiveClientId: () => { },
    assets: [],
    refreshAssets: async () => { },
    loading: true
});


export const useMarketingContext = () => useContext(MarketingContext);

export function MarketingProvider({ children }: { children: React.ReactNode }) {
    const [clients, setClients] = useState<Client[]>([]);
    const [activeClientId, setActiveClientId] = useState<number | null>(null);
    const [assets, setAssets] = useState<MarketingAsset[]>([]);
    const [loading, setLoading] = useState(true);

    const refreshAssets = async () => {
        const { data } = await insforge.database
            .from('marketing_assets')
            .select('*')
            .order('created_at', { ascending: false });
        if (data) setAssets(data as MarketingAsset[]);
    };


    useEffect(() => {
        async function init() {
            setLoading(true);
            const { data } = await insforge.database
                .from('clients')
                .select('*')
                .order('id', { ascending: true });

            if (data && data.length > 0) {
                setClients(data as Client[]);
            }
            await refreshAssets();
            setLoading(false);
        }
        init();
    }, []);


    const activeClient = activeClientId === null ? null : (clients.find(c => c.id === activeClientId) || null);

    return (
        <MarketingContext.Provider value={{
            clients,
            activeClient,
            setActiveClientId,
            assets,
            refreshAssets,
            loading
        }}>

            {children}
        </MarketingContext.Provider>
    );
}
