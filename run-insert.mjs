import { createClient } from '@insforge/sdk';
import 'dotenv/config.js';

const insforge = createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_BASE_URL,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY
});

async function main() {
    const { data: authData, error: authErr } = await insforge.auth.signInWithPassword({
        email: 'demo@emprexia.com',
        password: 'demo'
    });
    if (authErr) { console.error("Login err:", authErr); return; }
    
    console.log("Logged in as:", authData.user.id);
    
    const clientData = {
        first_name: "Test",
        last_name: "Testing",
        email: "test@testing.com",
        phone: "123",
        city: "City",
        type: "CLIENT",
        status: "active",
        organization_id: "00000000-0000-0000-0000-000000000000",
        user_id: authData.user.id,
    };
    
    console.log("Inserting:", clientData);
    
    const { data, error } = await insforge.database.from('crm_clients').insert([clientData]);
    
    if (error) {
        console.error("Insert error:", error);
    } else {
        console.log("Success:", data);
    }
}
main();
