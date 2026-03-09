const { createClient } = require('@insforge/sdk');
const client = createClient({ baseUrl: 'http://a', anonKey: 'a' });
console.log(Object.keys(client.auth));
