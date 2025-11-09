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