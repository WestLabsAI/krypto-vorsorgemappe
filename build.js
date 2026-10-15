// Baut die Offline-Datei: node build.js → dist/krypto-vorsorgemappe.html
const fs = require('fs'), path = require('path');
const src = p => fs.readFileSync(path.join(__dirname, 'src', p), 'utf8');
const words = src('bip39-english.txt').trim().split(/\r?\n/);
if (words.length !== 2048) throw new Error('BIP39-Wortliste unvollständig');
const html = src('app.html')
  .replace('/*SEEDLOCK*/', () => src('seedlock.js'))
  .replace('/*WORDLIST*/', () => JSON.stringify(words));
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
const out = path.join(__dirname, 'dist', 'krypto-vorsorgemappe.html');
fs.writeFileSync(out, html);
console.log(out, Math.round(html.length / 1024) + ' KB');
