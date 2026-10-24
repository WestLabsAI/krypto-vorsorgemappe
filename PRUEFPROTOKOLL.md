# Prüfprotokoll – Krypto-Vorsorgemappe, Version 1.1 (Stand 2026-10-21)

Geprüfte Datei: `dist/krypto-vorsorgemappe.html`, SHA-256 `324075b377ffea02cd782836a1acbe8199fe275dc737de95550651e3fe4f8e11`
(gebaut mit `node build.js`). Vor jeder Auslieferung neu bauen, alle Prüfungen wiederholen und Hash hier eintragen.
Änderungen gegenüber Version 1: `AENDERUNGEN.md`.

| Nr. | Prüfung | Verfahren | Ergebnis |
|---|---|---|---|
| 1 | Seed-Sperre erkennt BIP39-Folgen, WIF, xprv/xpub, 64-Hex, Passwortmuster und lässt Normaltext durch | `node test/seedlock.test.js` | 21 von 21 Fällen ok (2026-10-21) |
| 2 | Content-Security-Policy sperrt Netzwerk: `default-src 'none'`, `connect-src 'none'`, `form-action 'none'`, `base-uri 'none'` | `node test/offline.test.js` | ok (2026-10-21) |
| 3 | Kein Netzwerk-Code und keine externen Ressourcen (fetch, XHR, WebSocket, sendBeacon, EventSource, Service Worker, iframe, link, externe src/href, CSS-url, keine http(s)-Adresse in der Datei) | `node test/offline.test.js` | ok, 0 Funde (2026-10-21) |
| 4 | Datei öffnet und rendert ohne Server (file://) | Edge headless, alle Browser-Tests laden über file:// | ok (2026-10-21) |
| 5 | Netzwerk-Inspektion beim Öffnen | Edge headless mit `--log-net-log` | Stand Version 1 (2026-10-10), nicht wiederholt; ersetzt durch die Netzwerk-Ereignisse in Nr. 6 und 8, die das Öffnen einschließen |
| 6 | Netzwerk-Inspektion beim Ausfüllen, Speichern, Laden, Drucken | `node test/browser.test.js` (Edge headless, frisches Profil, DevTools-Protokoll, Netzwerk-Ereignisse des Seiten-Targets) | ok (2026-10-21): 4 lokale Ladevorgänge, 0 Anfragen nach außen; PDF erzeugt |
| 7 | Entwurfsdatei und Druckansicht enthalten keine rot markierten Werte | `node test/browser.test.js` | ok (2026-10-21) |
| 8 | Nutzbarkeit 1.1 (Punkte 1–8 aus `AENDERUNGEN.md`) | `node test/nutzbarkeit.test.js`, Druck im Druckmodus des Browsers gelesen (Emulation `media=print`) | 53 von 53 Prüfungen ok (2026-10-21), darunter: alle 35 Felder angezeigt = gedruckt; unberührte Auswahl druckt nichts; Deckblatt, „Auf einen Blick", Status, Prüfliste, Vorschau, Angehörigen-Test, .ics; 0 Anfragen nach außen (18 lokale Ladevorgänge) |
| 9 | Seed-Sperre über die neuen Felder | `node test/nutzbarkeit.test.js` | ok (2026-10-21): Seed in 10 neuen bzw. aufs Deckblatt übernommenen Feldern rot; kein Seed in Ausdruck, Auswahllisten der Zuordnungen und Entwurfsdatei. Manipulierter Entwurf mit Seeds in Zuordnungen, Status, IDs, Abschnittsangaben, Auswahl- und Testfeldern: kein Seed in Ausdruck, Prüfliste, Vorschau und Auswahllisten |
| 10 | Ausdruck mit Beispieldaten Seite für Seite, Bildschirm mobil und Desktop | `node test/abnahme.js` (PDF und Aufnahmen, angesehen) | ok nach zwei Korrekturen (Tabellenzeilen mit Status, Überlauf 390 px) |

Versionen: 2026-10-10 Hash `841b1f82…` (erste Fassung); 2026-10-14 Hash `0f5396e7…` (Version 1, Kopf- und Fußzeile mit Firmenangaben entfernt; gesichert in `versionen/1.0/`); 2026-10-21 Hash `324075b3…` (Version 1.1).

Grenzen: Die Browser-Tests bedienen die Seite per Skript, nicht von Hand; ein echter Druckdialog wird durch `Page.printToPDF` bzw. den Druckmodus ersetzt. Nicht geprüft: Firefox und Safari (CSP ist Standard, Datumsfeld sieht dort anders aus). Kein Test mit echten Angehörigen. Die Seed-Sperre ist eine Hilfe gegen Versehen, keine Garantie. Die CSP wirkt nur, solange die Datei unverändert ist (Hash vergleichen).
