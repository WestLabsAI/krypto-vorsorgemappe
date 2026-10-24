// Statische Offline-Prüfung der gebauten Datei: node test/offline.test.js
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'dist', 'krypto-vorsorgemappe.html'), 'utf8');
const fail = [];
const csp = (html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
["default-src 'none'", "connect-src 'none'", "form-action 'none'", "base-uri 'none'"].forEach(d => { if (!csp.includes(d)) fail.push('CSP ohne ' + d); });
[/fetch\(/, /XMLHttpRequest/, /WebSocket/, /sendBeacon/, /EventSource/, /importScripts/, /serviceWorker/, /<iframe/i, /<link/i, /<img[^>]+src=/i, /src="?https?:/i, /href="?https?:/i, /url\(/].forEach(r => { if (r.test(html)) fail.push('Fund: ' + r); });
const urls = html.match(/https?:\/\/[^\s"'<)]+/g) || [];
if (urls.length) fail.push('URLs in der Datei: ' + urls.join(', '));
if (fail.length) { console.error(fail.join('\n')); process.exit(1); }
console.log('Offline-Prüfung ok (' + Math.round(html.length / 1024) + ' KB, CSP: ' + csp + ')');
