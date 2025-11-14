const dgram = require('dgram');
const readline = require('readline');

const roleArg = process.argv[2] || 'read';
const SERVER_HOST = process.argv[3] || '127.0.0.1';
const SERVER_PORT = parseInt(process.argv[4], 10) || 4000;
const ROLE = roleArg === 'admin' ? 'admin' : 'read';
const client = dgram.createSocket('udp4');

function sendHello() {
const message = Buffer.from(`HELLO ${ROLE}`);
client.send(message, SERVER_PORT, SERVER_HOST);
}
function sendLine(line) {
const trimmed = line.trim();
if (!trimmed) return;
if (trimmed.toLowerCase() === 'exit') {
console.log('Closing client...');
client.close();
rl.close();
process.exit(0);
}
const buf = Buffer.from(trimmed);
client.send(buf, SERVER_PORT, SERVER_HOST);
}
client.on('message', (msg, rinfo) => {
    console.log(`\n[SERVER]: ${msg.toString()}`);
    rl.prompt();
});
setInterval(() => {
    const buf = Buffer.from('PING');
    client.send(buf, SERVER_PORT, SERVER_HOST);
}, 500_000);
client.on('error', (err) => {
    console.error('Client error:', err);
    client.close();
});
const rl = readline.createInterface({
input: process.stdin,
output: process.stdout,
});
console.log('Type commands or text. Use "exit" to quit.');
console.log(`Role: ${ROLE}, Server: ${SERVER_HOST}:${SERVER_PORT}`);
rl.setPrompt('> ');
rl.prompt();
rl.on('line', (line) => {
sendLine(line);
});

client.on('listening', () => {
console.log(`Client started as ROLE=${ROLE}, connecting to
${SERVER_HOST}:${SERVER_PORT}`);
sendHello();
});

client.bind();