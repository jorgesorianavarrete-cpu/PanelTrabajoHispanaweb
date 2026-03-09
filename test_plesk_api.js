import fetch from 'node-fetch';
import https from 'https';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

async function test() {
  const apiKey = 'YOUR_API_KEY'; // Need to get this from DB or ask user to put it, or use the one I could retrieve? I don't have it.
  
  // Actually, I can query the DB to get the saved server's api_key and api_url.
}
