const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const http = require('http');
const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

const PORT = 3001;
let sock = null;
let qrCodeValue = null;

// Initialize WhatsApp connection
async function connectToWhatsApp() {
  console.log('⚡ [WhatsApp Worker] Initializing Baileys session...');
  
  const authFolder = path.join(__dirname, '../.whatsapp-auth');
  const { state, saveCreds } = await useMultiFileAuthState(authFolder);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // We will print it manually with a helper
    logger: pino({ level: 'silent' }) // Suppress noisy logs
  });

  sock.ev.on('creds.update', saveCreds);

  const QRCode = require('qrcode');

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrCodeValue = qr;
      console.clear();
      console.log('\n--- GENERATING PAIRING QR CODE PNG ---');
      
      const qrPath = '/home/sanniinuoluwadunsimi/.gemini/antigravity/brain/b5cb1f7d-052e-4166-b5b6-f60399cdcd8d/qr.png';
      QRCode.toFile(qrPath, qr, {
        color: {
          dark: '#000000',
          light: '#ffffff'
        },
        width: 350
      }, function (err) {
        if (err) {
          console.error('❌ Error saving QR code PNG:', err);
        } else {
          console.log('✅ QR Code saved to artifact at qr.png! Ready to render.');
        }
      });
      console.log('---------------------------------------\n');
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('🔌 Connection closed due to ', lastDisconnect?.error, ', reconnecting: ', shouldReconnect);
      qrCodeValue = null;
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      console.clear();
      console.log('✅ [WhatsApp Worker] Connected to WhatsApp successfully!');
      qrCodeValue = null;
    }
  });
}

// Start HTTP server on port 3001 to handle OTP dispatches
const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check/QR status endpoint
  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: sock ? 'initialized' : 'offline',
      paired: sock?.user ? true : false,
      user: sock?.user || null,
      needsPairing: !!qrCodeValue
    }));
    return;
  }

  // Send message endpoint
  if (req.method === 'POST' && (req.url === '/send' || req.url === '/send-message')) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const { to, message } = payload;

        if (!to || !message) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing "to" or "message" parameter' }));
          return;
        }

        if (!sock || !sock.user) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'WhatsApp session is not paired or active' }));
          return;
        }

        // Format to correct JID suffix: @s.whatsapp.net
        const cleanPhone = to.replace(/\D/g, '');
        const jid = `${cleanPhone}@s.whatsapp.net`;

        console.log(`📤 Sending message to ${jid}...`);
        await sock.sendMessage(jid, { text: message });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        console.error('❌ Failed to send message:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 404 fallback
  res.writeHead(404);
  res.end();
});

// Start Server and WhatsApp Connect
server.listen(PORT, () => {
  console.log(`🚀 [WhatsApp Worker] Server running on port ${PORT}`);
  connectToWhatsApp();
});
