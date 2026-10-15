// node test/seedlock.test.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const S = require('../src/seedlock.js');
S.setWordlist(fs.readFileSync(path.join(__dirname, '../src/bip39-english.txt'), 'utf8').trim().split(/\r?\n/));

const block = {
  seed12: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  seedNumbered: '1. legal 2. winner 3. thank 4. year 5. wave 6. sausage',
  seedLines: 'zoo\nzone\nzero\nyouth\nyellow',
  seedAbbr: 'aban abil able abou abov abse abso abst absu abus',
  seedInSentence: 'Meine Wörter: legal winner thank year wave sausage worth useful legal winner thank yellow',
  wif: '5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ',
  xprv: 'xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi',
  xpub: 'xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjqJoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8',
  hex: '0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318',
  pwLabel: 'Passwort: Sommer2024',
  pin: 'PIN = 4711',
  pwLike: 'Login mit K8#vx!Qz29pL'
};
const allow = {
  empty: '',
  wallet: 'Hardware-Wallet im Tresor im Arbeitszimmer, oberstes Fach',
  sicherung: 'Die Sicherung (Metallplatte) liegt im Bankschließfach der Sparkasse, Schlüssel im Schreibtisch.',
  boerse: 'Konto bei einer Börse, angelegt mit max.mustermann@example.com, 2FA per App auf dem alten Handy',
  person: 'Meine Schwester Anna kennt sich aus und kann technisch helfen, hat aber keinen Zugriff.',
  englisch: 'Ledger Nano X and a paper backup in the safe at home',
  address: 'Empfangsadresse bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
  datum: 'Stand 08.10.2026, nächste Prüfung Oktober 2027',
  hinweis: 'Das Passwort für den Rechner steht im Passwortmanager, den Zugang kennt meine Frau.'
};
let fail = 0;
for (const [k, v] of Object.entries(block)) { const r = S.check(v); if (!r) { fail++; console.log('NICHT GESPERRT:', k); } }
for (const [k, v] of Object.entries(allow)) { const r = S.check(v); if (r) { fail++; console.log('FALSCH GESPERRT:', k, r.id); } }
console.log(fail ? fail + ' Fehler' : 'alle ' + (Object.keys(block).length + Object.keys(allow).length) + ' Fälle ok');
process.exit(fail ? 1 : 0);
