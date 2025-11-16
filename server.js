const dgram = require('dgram');
const fs = require('fs');
const path = require('path');

const PORT = 4000;
const HOST = '0.0.0.0';
const MAX_CLIENTS = 4;
const TIMEOUT_MS = 300_000;
const BASE_DIR = path.join(__dirname, 'server_files');
const STATS_FILE = path.join(BASE_DIR, 'server_stats.txt');
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
setInterval(() => {
  const now = Date.now();
  for (const [key, c] of clients.entries()) {
    if (now - c.lastSeen > TIMEOUT_MS) {
      console.log(`Client ${key} timed out. Removing from active list.`);
      clients.delete(key);
    }
  }
}, 5_000);

process.stdin.setEncoding('utf8');
process.stdin.on('data', (data) => {
  const cmd = data.toString().trim().toUpperCase();
  if (cmd === 'STATS') {
    logStats();
  }
 
});

async function handleCommand(client, raw) {} 
 
server.on('message', (msg, rinfo) => { 
  const message = msg.toString().trim(); 
 
 
  fs.appendFileSync( 
    MSG_LOG, 
    `[${new Date().toISOString()}] ${rinfo.address}:${rinfo.port} -> ${message}\n` 
  ); 
 
  totalBytesIn += msg.length; 
  totalMessages++; 
 
  if (message.startsWith('HELLO')) { 
    const parts = message.split(/\s+/); 
    const role = parts[1] === 'admin' ? 'admin' : 'read'; 
 
    const client = registerClient(rinfo.address, rinfo.port, role); 
    if (!client) { 
      const buf = Buffer.from('ERROR SERVER_BUSY'); 
      server.send(buf, rinfo.port, rinfo.address); 
      totalBytesOut += buf.length; 
      return; 
    } 

    client.msgCount++; 
    client.bytesIn += msg.length; 
 
    sendToClient( 
      client, 
      `WELCOME role=${client.role}. Use commands like /list, /read <file>, /upload, /download, ...` 
    ); 
    return; 
  } 
 
  const key = `${rinfo.address}:${rinfo.port}`; 
  const client = clients.get(key); 
 
  if (!client) { 
    const buf = Buffer.from('ERROR Please send "HELLO admin" or "HELLO read" first.'); 
    server.send(buf, rinfo.port, rinfo.address); 
    totalBytesOut += buf.length; 
    return; 
  } 

           
  client.lastSeen = Date.now(); 
  client.msgCount++; 
  client.bytesIn += msg.length; 
 
  if (!message.startsWith('/')) { 
    console.log(`Msg from ${key}: ${message}`); 
    const respond = () => sendToClient(client, `ECHO: ${message}`); 
    if (client.role === 'admin') { 
      respond(); 
    } else { 
      setTimeout(respond, 500); 
    } 
    return; 
  } 
 
  handleCommand(client, message); 
}); 
 
server.on('listening', () => { 
  const addr = server.address(); 
  console.log(`UDP server listening on ${addr.address}:${addr.port}`); 
}); 
 
server.on('error', (err) => { 
  console.error('Server error:', err); 
  server.close(); 
}); 
 
server.bind(PORT, HOST); 

async function handleCommand(client, raw) {
const line = raw.slice(1).trim();

const [cmd, ...rest] = line.split(' ');
const argLine = rest.join(' ').trim();
const isAdmin = client.role === 'admin';
const reply = (text) => {
const respond = () => sendToClient(client, text);
if (isAdmin) respond();
else setTimeout(respond, 500);
};
try {
switch (cmd.toLowerCase()) {

case 'list': {
if (!isAdmin) {
reply('ERROR Permission denied: /list admin only.');
return;
}
if (!fs.existsSync(BASE_DIR)) {
fs.mkdirSync(BASE_DIR, { recursive: true });
}
const files = fs.readdirSync(BASE_DIR);
reply('FILES:\n' + (files.length ? files.join('\n') : '(empty)'));
break;
}
  case 'read': {
    if (!argLine) {
      reply('ERROR Usage: /read <filename>');
      return;
    }
    const filePath = safePath(argLine);
        if (!fs.existsSync(filePath)) {
          reply('ERROR File not found');
          return;
        }
        const content = fs.readFileSync(filePath, 'utf8');
        reply(`CONTENT ${argLine}:\n${content}`);
        break;
      }
  case 'download': {
    if (!argLine) {
      reply('ERROR Usage: /download <filename>');
      return;
    }
    const filePath = safePath(argLine);
    if (!fs.existsSync(filePath)) {
      reply('ERROR File not found');
      return;

    }
    const content = fs.readFileSync(filePath, 'utf8');
    reply(`FILE ${argLine}|${content}`);
    break;
  }

case 'upload': {
if (!isAdmin) {
reply('ERROR Permission denied: /upload admin only.');
return;
}
const [filename, content] = argLine.split('|');
if (!filename || content === undefined) {
reply('ERROR Usage: /upload <filename>|<content>');
return;
}
if (!fs.existsSync(BASE_DIR)) {
fs.mkdirSync(BASE_DIR, { recursive: true });
}
const filePath = safePath(filename.trim());
fs.writeFileSync(filePath, content, 'utf8');
reply(`OK Uploaded ${filename.trim()}`);
break;
}

 case 'delete': {
if (!isAdmin) {
reply('ERROR Permission denied: /delete admin only.');

return;
}
if (!argLine) {
reply('ERROR Usage: /delete <filename>');
return;
}
const filePath = safePath(argLine);
if (!fs.existsSync(filePath)) {
reply('ERROR File not found');
return;
}
fs.unlinkSync(filePath);
reply(`OK Deleted ${argLine}`);
break;
}

 case 'search': {
if (!isAdmin) {
reply('ERROR Permission denied: /search admin only.');
return;
}
if (!argLine) {
reply('ERROR Usage: /search <keyword>');
return;
}
if (!fs.existsSync(BASE_DIR)) {
fs.mkdirSync(BASE_DIR, { recursive: true });
}
const keyword = argLine.toLowerCase();
const files = fs.readdirSync(BASE_DIR);
const matches = files.filter((f) => f.toLowerCase().includes(keyword));
reply('SEARCH RESULTS:\n' + (matches.length ? matches.join('\n') : '(no matches)'));
break;
}
case 'info': {
if (!isAdmin) {
reply('ERROR Permission denied: /info admin only.');
return;
}
if (!argLine) {
reply('ERROR Usage: /info <filename>');
return;
}
const filePath = safePath(argLine);
if (!fs.existsSync(filePath)) {
reply('ERROR File not found');
return;
}
const stats = fs.statSync(filePath);
reply(
`INFO ${argLine}:\n` +
`Size: ${stats.size} bytes\n` +
`Created: ${stats.birthtime}\n` +

`Modified: ${stats.mtime}`
);
break;
}
 
  default:
reply('ERROR Unknown command');
}
} catch (err) {
console.error('Command error:', err);
reply('ERROR ' + err.message);
}
}
