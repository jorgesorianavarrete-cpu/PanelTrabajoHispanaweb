require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json()); // Essential for Twilio/Meta webhooks
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const PORT = process.env.PORT || 3001;

// Setup Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Map to store active WhatsApp-Web.js clients
const clients = new Map();

/**
 * Initialize a WhatsApp-Web.js client for a specific account
 */
async function initializeQRClient(accountId, accountName) {
    console.log(`Inicializando cliente QR para: ${accountName} (${accountId})`);

    const client = new Client({
        authStrategy: new LocalAuth({ clientId: accountId }),
        puppeteer: {
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    client.on('qr', (qr) => {
        console.log(`QR RECIBIDO para ${accountName}`, qr);
        io.emit(`whatsapp_qr_${accountId}`, qr);
        supabase.from('whatsapp_accounts').update({ status: 'qr_ready' }).eq('id', accountId);
    });

    client.on('ready', async () => {
        console.log(`CLIENTE WHATSAPP LISTO: ${accountName}`);
        io.emit(`whatsapp_ready_${accountId}`);
        supabase.from('whatsapp_accounts').update({ status: 'active' }).eq('id', accountId);

        // Sync initial chats
        try {
            const chats = await client.getChats();
            for (const chat of chats.slice(0, 30)) {
                const contact = await chat.getContact();
                const name = contact.name || contact.pushname || contact.number;
                let avatar = '/assets/avatar-default.png';
                try { avatar = await client.getProfilePicUrl(chat.id._serialized); } catch (e) { }

                await supabase.from('whatsapp_chats').upsert({
                    id: chat.id._serialized,
                    account_id: accountId,
                    name: name,
                    phone_number: contact.number,
                    avatar: avatar,
                    last_message: chat.lastMessage?.body || '',
                    unread_count: chat.unreadCount,
                    tag: chat.isGroup ? 'Group' : 'Nuevo Contacto',
                    online: true
                });
            }
        } catch (error) {
            console.error(`Error cargando chats para ${accountName}:`, error);
        }
    });

    client.on('message', async msg => {
        await processIncomingMessage(accountId, msg);
    });

    client.on('message_create', async msg => {
        if (msg.fromMe) await processIncomingMessage(accountId, msg);
    });

    client.on('disconnected', (reason) => {
        console.log(`CLIENTE DESCONECTADO: ${accountName}`, reason);
        io.emit(`whatsapp_disconnected_${accountId}`, reason);
        supabase.from('whatsapp_accounts').update({ status: 'disconnected' }).eq('id', accountId);
    });

    client.initialize();
    clients.set(accountId, client);
}

/**
 * Process incoming messages from any source (QR, Twilio, Meta)
 */
async function processIncomingMessage(accountId, msg) {
    try {
        const chat = await msg.getChat();
        const contact = await msg.getContact();

        let mediaType = null;
        let mediaData = null;
        if (msg.hasMedia) {
            try {
                const media = await msg.downloadMedia();
                if (media) {
                    mediaType = media.mimetype;
                    mediaData = media.data;
                }
            } catch (e) { }
        }

        const senderEnum = msg.fromMe ? 'me' : 'them';
        let statusEnum = 'received';
        if (msg.fromMe) {
            statusEnum = msg.ack === 3 ? 'read' : msg.ack === 2 ? 'delivered' : 'sent';
        }

        await supabase.from('whatsapp_messages').upsert({
            id: msg.id._serialized,
            account_id: accountId,
            chat_id: chat.id._serialized,
            text: msg.body,
            sender: senderEnum,
            status: statusEnum,
            media_type: mediaType,
            media_data: mediaData,
            created_at: new Date(msg.timestamp * 1000).toISOString()
        });

        await supabase.from('whatsapp_chats').upsert({
            id: chat.id._serialized,
            account_id: accountId,
            name: contact.name || contact.pushname || contact.number,
            phone_number: contact.number,
            last_message: msg.body || '[Media]',
            unread_count: msg.fromMe ? 0 : chat.unreadCount + 1,
            online: true,
            updated_at: new Date().toISOString()
        });
    } catch (err) {
        console.error('Error processIncomingMessage:', err);
    }
}

// REST Endpoints for external webhooks (Twilio / Meta)
app.post('/webhooks/twilio/:accountId', async (req, res) => {
    const { accountId } = req.params;
    console.log(`Webhook Twilio recibido para cuenta: ${accountId}`, req.body);
    // TODO: Map Twilio fields to our schema and insert into Supabase
    res.status(200).send('OK');
});

app.post('/webhooks/meta/:accountId', async (req, res) => {
    const { accountId } = req.params;
    console.log(`Webhook Meta recibido para cuenta: ${accountId}`, req.body);
    // Meta verification (hub.challenge)
    if (req.query['hub.challenge']) return res.send(req.query['hub.challenge']);
    // TODO: Map Meta fields to our schema
    res.status(200).send('OK');
});

// Load existing accounts and initialize QR ones
async function boot() {
    const { data: accounts } = await supabase.from('whatsapp_accounts').select('*');
    if (accounts) {
        for (const acc of accounts) {
            if (acc.type === 'qr') {
                await initializeQRClient(acc.id, acc.name);
            }
        }
    }
}

boot();

// Socket IO Logic
io.on('connection', (socket) => {
    console.log('Cliente frontend conectado via Socket');
});

// Listen for outgoing messages from outbox
supabase.channel('whatsapp-outbox')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' }, async (payload) => {
        const newMsg = payload.new;
        if (newMsg.sender === 'me' && !newMsg.id.includes('@')) {
            const client = clients.get(newMsg.account_id);
            if (client) {
                try {
                    const sentMsg = await client.sendMessage(newMsg.chat_id, newMsg.text);
                    await supabase.from('whatsapp_messages').update({
                        id: sentMsg.id._serialized,
                        status: 'sent'
                    }).eq('id', newMsg.id);
                } catch (e) {
                    console.error('Error sending msg:', e);
                }
            } else {
                // If not QR, might be Twilio/Meta -> Call their APIs
                console.log(`Message for account ${newMsg.account_id} requires API call (Twilio/Meta)`);
            }
        }
    })
    .subscribe();

server.listen(PORT, () => {
    console.log(`WhatsApp Multi-Account Server running on port ${PORT}`);
});
