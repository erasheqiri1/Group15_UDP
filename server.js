const dgram = require('dgram');
const fs = require('fs');
const path = require('path');

const PORT = 4000;
const HOST = '0.0.0.0';
const MAX_CLIENTS = 4;
const TIMEOUT_MS = 30_000;
const BASE_DIR = path.join(__dirname, 'server_files');
const STATS_FILE = path.join(__dirname, 'server_stats.txt');
const MSG_LOG = path.join(BASE_DIR, 'messages.log');

if (!fs.existsSync(BASE_DIR)) {
fs.mkdirSync(BASE_DIR, { recursive: true });
}

const server = dgram.createSocket('udp4');
const clients = new Map();
let totalBytesIn = 0;
let totalBytesOut = 0;
let totalMessages = 0;

function safePath(filename) {
const full = path.join(BASE_DIR, filename);
if (!full.startsWith(BASE_DIR)) {
throw new Error('Invalid path');
}
return full;
} 
function hasAdmin() { 
for (const c of clients.values()) { 
if (c.role === 'admin') return true; 
} 
return false; 
} 
 
function registerClient(address, port, maybeRole) { 
  const key = `${address}:${port}`; 
  let client = clients.get(key); 
 
  if (!client) { 
    if (clients.size >= MAX_CLIENTS) { 
      return null; 
    } 
    client = { 
      address, 
      port, 
      role: 'read', 
      lastSeen: Date.now(), 
      msgCount: 0, 
      bytesIn: 0, 
      bytesOut: 0, 
    }; 
    if (maybeRole === 'admin' && !hasAdmin()) { 
      client.role = 'admin'; 
    } 
    clients.set(key, client); 
  } else { 
    if (maybeRole === 'admin' && client.role !== 'admin' && !hasAdmin()) { 
      client.role = 'admin'; 
    } 
    client.lastSeen = Date.now(); 
  } 
 
  return client; 
} 
 
function sendToClient(client, message) { 
  const buf = Buffer.from(message); 
  server.send(buf, client.port, client.address); 
  client.bytesOut += buf.length; 
  totalBytesOut += buf.length; 
}

function logStats() {
  let activeCount = 0;
  const now = Date.now();
  let lines = [];

  for (const c of clients.values()) {
    const isActive = now - c.lastSeen <= TIMEOUT_MS;
    if (isActive) activeCount++;
  }

  lines.push('=== SERVER STATS ===');
  lines.push(`Active connections: ${activeCount}`);
  lines.push(`Total messages: ${totalMessages}`);
  lines.push(`Total bytes in : ${totalBytesIn}`);
  lines.push(`Total bytes out: ${totalBytesOut}`);

  for (const [key, c] of clients.entries()) {
    const isActive = now - c.lastSeen <= TIMEOUT_MS;
    lines.push(
      `Client ${key} [role=${c.role}, active=${isActive}] - msgs=${c.msgCount}, bytesIn=${c.bytesIn}, bytesOut=${c.bytesOut}`
    );
  }

  const output = lines.join('\n') + '\n';
  console.log(output);
  fs.appendFileSync(STATS_FILE, output + '\n');
}
