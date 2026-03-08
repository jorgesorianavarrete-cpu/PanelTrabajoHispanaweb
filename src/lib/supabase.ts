import { createClient } from '@insforge/sdk';

const insforgeUrl = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL || '';
const insforgeAnonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || '';

export const supabase = createClient({
    baseUrl: insforgeUrl,
    anonKey: insforgeAnonKey,
});
