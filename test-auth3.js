const { createClient } = require('@insforge/sdk');
const client = createClient({ baseUrl: 'http://a', anonKey: 'a' });
console.log('getCurrentSession:', typeof client.auth.getCurrentSession);
console.log('getSession:', typeof client.auth.getSession);
console.log('getUser:', typeof client.auth.getUser);
