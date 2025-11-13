const dgram = require('dgram');
const readline = require('readline');

const roleArg = process.argv[2] || 'read';
const SERVER_HOST = process.argv[3] || '127.0.0.1';
const SERVER_PORT = parseInt(process.argv[4], 10) || 4000;
const ROLE = roleArg === 'admin' ? 'admin' : 'read';
const client = dgram.createSocket('udp4');