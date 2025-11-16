const dgram = require('dgram');
const fs = require('fs');
const path = require('path');

const PORT = 4000;
const HOST = '0.0.0.0';
const MAX_CLIENTS = 4;
const TIMEOUT_MS = 60_000;
const BASE_DIR = path.join(__dirname, 'server_files');
const STATS_FILE = path.join(BASE_DIR, 'server_stats.txt');
const MSG_LOG = path.join(BASE_DIR, 'messages.log');

const READ_DELAY = 30_000;
const ADMIN_DELAY = 0;

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
  if (!full.startsWith(BASE_DIR)) throw new Error('Invalid path');
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
    if (clients.size >= MAX_CLIENTS) return null;

    client = {
      address,
      port,
      role: 'read',
      active: true,
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
    client.active = true;
    client.lastSeen = Date.now();
  }
  return client;
}

function sendToClient(client, message) {
  const buf = Buffer.from(message);

  server.send(buf, client.port, client.address);

  client.bytesOut += buf.length;
  totalBytesOut += buf.length;

  fs.appendFileSync(
    MSG_LOG,
    `[${new Date().toISOString()}] SERVER ->
${client.address}:${client.port} : ${message}\n`
  );
}

function logStats() {
  let activeCount = 0;
  const now = Date.now();
  let lines = [];

  for (const c of clients.values()) {
    const isActive = c.active && (now - c.lastSeen <= TIMEOUT_MS);
    if (isActive) activeCount++;
  }

  lines.push('=== SERVER STATS ===');
  lines.push(`Active connections: ${activeCount}`);
  lines.push(`Total messages: ${totalMessages}`);
  lines.push(`Total bytes in : ${totalBytesIn}`);
  lines.push(`Total bytes out: ${totalBytesOut}`);

  for (const [key, c] of clients.entries()) {
    const isActive = c.active && (now - c.lastSeen <= TIMEOUT_MS);
    lines.push(
      `Client ${key} [role=${c.role}, active=${isActive}] -
msgs=${c.msgCount}, bytesIn=${c.bytesIn}, bytesOut=${c.bytesOut}`
    );
  }

  const output = lines.join('\n') + '\n';
  console.log(output);
  fs.appendFileSync(STATS_FILE, output + '\n');
}

setInterval(() => {
  const now = Date.now();
  for (const [key, c] of clients.entries()) {
    if (c.active && (now - c.lastSeen > TIMEOUT_MS)) {
      console.log(`Client ${key} timed out. Marking as inactive.`);

      c.active = false;

      const txt =
        `You have been deactivated due to inactivity.\n` +
        `Type "HELLO" to reactivate with your previous role (${c.role}).`;
      server.send(Buffer.from(txt), c.port, c.address);
    }
  }
}, 5000);

process.stdin.setEncoding('utf8');
process.stdin.on('data', (data) => {
  if (data.toString().trim().toUpperCase() === 'STATS') logStats();
});

server.on('message', (msg, rinfo) => {
  const message = msg.toString().trim();

  fs.appendFileSync(
    MSG_LOG,
    `[${new Date().toISOString()}] ${rinfo.address}:${rinfo.port} ->
${message}\n`
  );

  totalBytesIn += msg.length;
  totalMessages++;

  const key = `${rinfo.address}:${rinfo.port}`;
  let client = clients.get(key);

  if (message === 'HELLO') {
    if (!client) {
      server.send(
        Buffer.from('ERROR You must first connect with HELLO <admin|read>.'),
        rinfo.port,
        rinfo.address
      );
      return;
    }

    client.active = true;
    client.lastSeen = Date.now();

    sendToClient(client, `WELCOME BACK role=${client.role}`);
    return;
  }

  if (message.startsWith('HELLO ')) {
    const parts = message.split(/\s+/);
    const roleArg = parts[1];

    if (roleArg !== 'admin' && roleArg !== 'read') {
      server.send(
        Buffer.from('ERROR Usage: HELLO <admin|read>'),
        rinfo.port,
        rinfo.address
      );
      return;
    }

    if (client) {
      sendToClient(
        client,
        `You are already registered as role=${client.role}. Use plain
HELLO to reactivate if inactive.`
      );
      return;
    }

    client = registerClient(rinfo.address, rinfo.port, roleArg);
    if (!client) {
      server.send(Buffer.from('ERROR SERVER_BUSY'), rinfo.port, rinfo.address);
      return;
    }

    client.msgCount++;
    client.bytesIn += msg.length;

    sendToClient(
      client,
      `WELCOME role=${client.role}. Use /list /read /upload /download ...`
    );
    return;
  }

  if (!client) {
    const txt =
      `You are not connected.\n` +
      `Please send "HELLO admin" or "HELLO read" first.`;
    server.send(Buffer.from(txt), rinfo.port, rinfo.address);
    return;
  }

  if (!client.active) {
    const txt =
      `You are inactive.\n` +
      `Please send "HELLO" to reactivate with your previous role
(${client.role}).`;
    server.send(Buffer.from(txt), rinfo.port, rinfo.address);
    return;
  }

  client.lastSeen = Date.now();
  client.msgCount++;
  client.bytesIn += msg.length;

  if (!message.startsWith('/')) {
    const respond = () => sendToClient(client, `ECHO: ${message}`);
    const delay = client.role === 'admin' ? ADMIN_DELAY : READ_DELAY;

    if (delay === 0) respond();
    else setTimeout(respond, delay);

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
    const delay = isAdmin ? ADMIN_DELAY : READ_DELAY;

    if (delay === 0) respond();
    else setTimeout(respond, delay);
  };

  try {
    switch (cmd.toLowerCase()) {
      case 'list': {
        if (!isAdmin) return reply('ERROR Permission denied: /list is admin only.');
        const files = fs.readdirSync(BASE_DIR);
        reply('FILES:\n' + (files.length ? files.join('\n') : '(empty)'));
        break;
      }

      case 'read': {
        if (!argLine) return reply('ERROR Usage: /read <filename>');
        const filePath = safePath(argLine);
        if (!fs.existsSync(filePath)) return reply('ERROR File not found');
        const content = fs.readFileSync(filePath, 'utf8');
        reply(`CONTENT ${argLine}:\n${content}`);
        break;
      }

      case 'download': {
        if (!isAdmin) return reply('ERROR Permission denied.');
        if (!argLine) return reply('ERROR Usage: /download <filename>');
        const filePath = safePath(argLine);
        if (!fs.existsSync(filePath)) return reply('ERROR File not found');
        const content = fs.readFileSync(filePath, 'utf8');
        reply(`FILE ${argLine}|${content}`);
        break;
      }

      case 'upload': {
        if (!isAdmin) return reply('ERROR Permission denied.');
        const [filename, content] = argLine.split('|');
        if (!filename || content === undefined)
          return reply('ERROR Usage: /upload <filename>|<content>');
        const filePath = safePath(filename.trim());
        fs.writeFileSync(filePath, content, 'utf8');
        reply(`OK Uploaded ${filename.trim()}`);
        break;
      }

      case 'delete': {
        if (!isAdmin) return reply('ERROR Permission denied.');
        if (!argLine) return reply('ERROR Usage: /delete <filename>');
        const filePath = safePath(argLine);
        if (!fs.existsSync(filePath)) return reply('ERROR File not found');
        fs.unlinkSync(filePath);
        reply(`OK Deleted ${argLine}`);
        break;
      }

      case 'search': {
        if (!isAdmin) return reply('ERROR Permission denied.');
        if (!argLine) return reply('ERROR Usage: /search <keyword>');
        const keyword = argLine.toLowerCase();
        const files = fs.readdirSync(BASE_DIR);
        const matches = files.filter((f) => f.toLowerCase().includes(keyword));
        reply(
          'SEARCH RESULTS:\n' +
          (matches.length ? matches.join('\n') : '(no matches)')
        );
        break;
      }

      case 'info': {
        if (!isAdmin) return reply('ERROR Permission denied.');
        if (!argLine) return reply('ERROR Usage: /info <filename>');
        const filePath = safePath(argLine);
        if (!fs.existsSync(filePath)) return reply('ERROR File not found');
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
    reply('ERROR ' + err.message);
  }
}