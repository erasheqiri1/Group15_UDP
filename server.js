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