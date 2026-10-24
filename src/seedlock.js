// Seed-Sperre der Krypto-Vorsorgemappe.
// Prüft Freitext auf Dinge, die nicht in die Mappe gehören: Seed-Wörter (BIP39),
// private Schlüssel (WIF, xprv & Co., 64-stellige Hex-Schlüssel) und Passwörter.
// Läuft im Browser und in Node (Tests). Keine Abhängigkeiten, kein Netzwerk.
(function (root) {
  'use strict';

  var BASE58 = '[1-9A-HJ-NP-Za-km-z]';
  var RULES = [
    { id: 'xprv', re: new RegExp('\\b[xyztuvYZUV]prv' + BASE58 + '{90,}'),
      msg: 'Das sieht aus wie ein erweiterter privater Schlüssel (xprv). Er gehört nicht in die Mappe.' },
    { id: 'xpub', re: new RegExp('\\b[xyztuvYZUV]pub' + BASE58 + '{90,}'),
      msg: 'Das sieht aus wie ein erweiterter öffentlicher Schlüssel (xpub). Er gibt keinen Zugriff, verrät aber alle Adressen und Beträge. Bitte nur benennen, wo er liegt.' },
    { id: 'wif', re: new RegExp('(^|[^1-9A-HJ-NP-Za-km-z])[5KLc]' + BASE58 + '{50,51}(?![1-9A-HJ-NP-Za-km-z])'),
      msg: 'Das sieht aus wie ein privater Schlüssel im WIF-Format. Er gehört nicht in die Mappe.' },
    { id: 'hex', re: /(^|[^0-9a-fA-F])(0x)?[0-9a-fA-F]{64}(?![0-9a-fA-F])/,
      msg: 'Das sieht aus wie ein privater Schlüssel (64 Hex-Zeichen). Er gehört nicht in die Mappe.' },
    { id: 'pwlabel', re: /\b(passwort|kennwort|password|passwd|pw|pin|passphrase|seed|mnemonic|recovery[- ]?phrase|2fa[- ]?code|backup[- ]?code)\s*[:=]\s*\S+/i,
      msg: 'Hier scheint ein Passwort, eine PIN, eine Passphrase oder ein Seed zu stehen. In die Mappe gehört nur, WO das aufbewahrt wird, nicht der Wert selbst.' },
    { id: 'pwlike', re: /(^|\s)(?=\S{10,}(\s|$))(?=\S*[a-z])(?=\S*[A-Z])(?=\S*\d)(?=\S*[^\w\s.,;:()\-äöüÄÖÜß*"„“'/])\S+/,
      msg: 'Diese Zeichenfolge sieht aus wie ein Passwort. Bitte schreiben Sie nur, wo das Passwort aufbewahrt wird.' }
  ];

  var words = null;    // Set der 2048 BIP39-Wörter (Englisch)
  var prefixes = null; // Set der eindeutigen 4-Buchstaben-Präfixe

  function setWordlist(list) {
    words = new Set(list);
    prefixes = new Set(list.map(function (w) { return w.slice(0, 4); }));
  }

  // Zerlegt in Wörter; Nummerierungen wie "1." oder "12)" fallen weg.
  function tokens(text) {
    return text.toLowerCase().split(/[^a-zäöüß0-9]+/).filter(function (t) {
      return t && !/^\d+$/.test(t);
    });
  }

  // Längste Folge direkt aufeinanderfolgender Treffer.
  function longestRun(toks, hit) {
    var best = 0, cur = 0;
    for (var i = 0; i < toks.length; i++) {
      if (hit(toks[i])) { cur++; if (cur > best) best = cur; } else cur = 0;
    }
    return best;
  }

  function checkWords(text) {
    if (!words) return null;
    var toks = tokens(text);
    var full = longestRun(toks, function (t) { return words.has(t); });
    // Seeds haben 12–24 Wörter; ab 5 BIP39-Wörtern am Stück ist normaler deutscher Text sehr unwahrscheinlich.
    if (full >= 5) return 'Das sieht aus wie Seed-Wörter (Wiederherstellungsphrase). Sie gehören nie in die Mappe. Schreiben Sie stattdessen, wo die Sicherung liegt.';
    // Abgekürzte Seeds: BIP39-Wörter sind an den ersten 4 Buchstaben eindeutig.
    var abbr = longestRun(toks, function (t) { return t.length === 4 && prefixes.has(t) || words.has(t); });
    if (abbr >= 8) return 'Das sieht aus wie abgekürzte Seed-Wörter. Sie gehören nie in die Mappe.';
    var hits = toks.filter(function (t) { return words.has(t); }).length;
    if (hits >= 8 && hits / toks.length >= 0.6) return 'Das enthält viele Seed-Wörter. Bitte prüfen Sie, ob hier eine Wiederherstellungsphrase steht. Sie gehört nie in die Mappe.';
    return null;
  }

  // Liefert null (in Ordnung) oder {id, msg}.
  function check(text) {
    if (!text || !String(text).trim()) return null;
    text = String(text);
    // Mail-Adressen und Links sind erlaubt und sollen nicht wie Passwörter wirken.
    var plain = text.replace(/\S+@\S+\.\S+/g, ' ').replace(/(https?:\/\/|www\.)\S+/gi, ' ');
    for (var i = 0; i < RULES.length; i++) {
      if (RULES[i].re.test(RULES[i].id === 'pwlike' ? plain : text)) return { id: RULES[i].id, msg: RULES[i].msg };
    }
    var w = checkWords(text);
    return w ? { id: 'bip39', msg: w } : null;
  }

  var api = { setWordlist: setWordlist, check: check };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SeedLock = api;
})(this);
