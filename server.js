import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
const PORT = Number(process.env.PORT || 8787);
const NTFY_BASE = (process.env.NTFY_BASE || 'https://ntfy.sh').replace(/\/$/, '');
const NTFY_TOPIC = process.env.NTFY_TOPIC || 'bosch_grup3_nfc_depo';
const NTFY_TOKEN = process.env.NTFY_TOKEN || '';
const NFC_SHARED_SECRET = process.env.NFC_SHARED_SECRET || '';
const MIRROR_ROOM = process.env.MIRROR_ROOM || 'bosch-wms-grup3';
const rooms = new Map();

app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

function safeString(value, fallback = '') {
  return String(value ?? fallback).trim().slice(0, 160);
}

function normalizeTopic(value, fallback = NTFY_TOPIC) {
  const topic = safeString(value, fallback);
  return /^[A-Za-z0-9_-]{1,100}$/.test(topic) ? topic : null;
}

async function publishToNtfy(payload, topic = NTFY_TOPIC) {
  const headers = { 'Content-Type': 'application/json' };
  if (NTFY_TOKEN) headers.Authorization = `Bearer ${NTFY_TOKEN}`;
  const response = await fetch(`${NTFY_BASE}/${encodeURIComponent(topic)}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`ntfy HTTP ${response.status}: ${body.slice(0, 180)}`);
  }
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'bosch-wms-bridge',
    ntfyConfigured: Boolean(NTFY_TOPIC),
    mirrorRoom: MIRROR_ROOM,
    nfcSecretConfigured: Boolean(NFC_SHARED_SECRET),
  });
});

app.get('/api/config', (_req, res) => {
  res.json({
    ntfyBase: NTFY_BASE,
    ntfyTopic: NTFY_TOPIC,
    mirrorRoom: MIRROR_ROOM,
    nfcSecretConfigured: Boolean(NFC_SHARED_SECRET),
  });
});

app.post('/api/nfc', async (req, res) => {
  try {
    if (!NFC_SHARED_SECRET || req.body?.token !== NFC_SHARED_SECRET) {
      return res.status(403).json({ ok: false, error: 'NFC anahtarı geçersiz.' });
    }
    const topic = normalizeTopic(req.body?.topic);
    if (!topic) return res.status(400).json({ ok: false, error: 'NTFY topic biçimi geçersiz.' });
    const payload = {
      event: 'NFC_SCAN',
      step: safeString(req.body?.step, 'auto'),
      uid: safeString(req.body?.uid, 'NFC-UNKNOWN'),
      source: safeString(req.body?.source, 'bridge-api'),
      device: safeString(req.body?.device, 'iPhone'),
      timestamp: new Date().toISOString(),
      nonce: safeString(req.body?.nonce, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    };
    await publishToNtfy(payload, topic);
    res.status(202).json({ ok: true, published: true, topic, payload });
  } catch (error) {
    console.error('[nfc publish]', error.message);
    res.status(502).json({ ok: false, error: 'ntfy mesajı yayınlanamadı.', detail: error.message });
  }
});

// NFC etiketine bu HTTPS URL'si yazılır. iPhone etiketi algıladığında URL'yi açar;
// sunucu GET isteğini ntfy olayına dönüştürür. Etikete POST yazmak mümkün olmadığından
// bu köprü NFC URL okuma + sunucu taraflı yayın modelini kullanır.
app.get('/nfc', async (req, res) => {
  try {
    const suppliedKey = safeString(req.query.key);
    if (!NFC_SHARED_SECRET || suppliedKey !== NFC_SHARED_SECRET) {
      return res.status(403).send(`<!doctype html><meta charset="utf-8"><title>Yetkisiz NFC</title><body style="font-family:system-ui;background:#0b1118;color:#fff;padding:32px"><h2>NFC anahtarı geçersiz</h2><p>Bu etiket kayıtlı değil veya anahtar eşleşmiyor.</p></body>`);
    }
    const topic = normalizeTopic(req.query.topic);
    if (!topic) return res.status(400).send('NTFY topic biçimi geçersiz.');
    const payload = {
      event: 'NFC_SCAN',
      step: safeString(req.query.step, 'auto'),
      uid: safeString(req.query.uid, 'IPHONE-NFC'),
      source: 'iphone-nfc-tag',
      device: 'iPhone',
      timestamp: new Date().toISOString(),
      nonce: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
    await publishToNtfy(payload, topic);
    res.redirect(303, '/?nfc=accepted');
  } catch (error) {
    console.error('[nfc url]', error.message);
    res.status(502).send(`<!doctype html><meta charset="utf-8"><title>NFC bağlantı hatası</title><body style="font-family:system-ui;background:#0b1118;color:#fff;padding:32px"><h2>NFC olayı gönderilemedi</h2><p>${safeString(error.message)}</p></body>`);
  }
});

function roomMembers(room) {
  if (!rooms.has(room)) rooms.set(room, new Set());
  return rooms.get(room);
}

wss.on('connection', (ws) => {
  ws.meta = { room: null, role: null };
  ws.on('message', (raw) => {
    let message;
    try { message = JSON.parse(raw.toString()); } catch { return; }

    if (message.type === 'join') {
      const room = safeString(message.room, MIRROR_ROOM);
      const role = message.role === 'sender' ? 'sender' : 'viewer';
      const members = roomMembers(room);
      const existing = [...members].filter((member) => member.readyState === 1);
      ws.meta = { room, role };
      members.add(ws);
      existing.forEach((member) => {
        if (member.readyState === 1) member.send(JSON.stringify({ type: 'peer-joined', role }));
        ws.send(JSON.stringify({ type: 'peer-joined', role: member.meta?.role || 'viewer' }));
      });
      ws.send(JSON.stringify({ type: 'joined', room, role }));
      return;
    }

    if (message.type === 'signal' && ws.meta.room) {
      const members = roomMembers(ws.meta.room);
      members.forEach((member) => {
        if (member !== ws && member.readyState === 1) {
          member.send(JSON.stringify({ type: 'signal', role: ws.meta.role, signal: message.signal }));
        }
      });
    }
  });

  ws.on('close', () => {
    const room = ws.meta?.room;
    if (!room || !rooms.has(room)) return;
    const members = rooms.get(room);
    members.delete(ws);
    members.forEach((member) => {
      if (member.readyState === 1) member.send(JSON.stringify({ type: 'peer-left', role: ws.meta?.role }));
    });
    if (members.size === 0) rooms.delete(room);
  });
});

server.on('upgrade', (request, socket, head) => {
  if (request.url?.split('?')[0] !== '/signal') {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request));
});

const distDir = path.join(__dirname, 'dist');
app.use(express.static(distDir, { index: false }));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'), (error) => {
    if (error) res.status(404).send('Uygulama derlenmemiş. Önce npm run build çalıştırın.');
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`BOSCH WMS bridge: http://localhost:${PORT}`);
  console.log(`ntfy topic: ${NTFY_TOPIC}`);
  console.log(`Mirror room: ${MIRROR_ROOM}`);
});
