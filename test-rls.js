require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@insforge/sdk');

const insforge = createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_BASE_URL,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY
});

async function main() {
    console.log('Logging in...');
    const { data: authData, error: authErr } = await insforge.auth.signInWithPassword({
        email: 'demo@emprexia.com',
        password: 'demo' // Let's try 
    });
    console.log(authData, authErr);
}
main();
