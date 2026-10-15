# Prüfprotokoll – Krypto-Vorsorgemappe, Version 1 (Stand 2026-10-15)

Geprüfte Datei: `dist/krypto-vorsorgemappe.html`, SHA-256 `0f5396e73bda0411eb0345753069814bae04beec5fe76e14ca7ed73305ba014f`
(gebaut mit `node build.js`). Vor jeder Auslieferung neu bauen, alle Prüfungen wiederholen und Hash hier eintragen.

| Nr. | Prüfung | Verfahren | Ergebnis |
|---|---|---|---|
| 1 | Seed-Sperre erkennt BIP39-Folgen, WIF, xprv/xpub, 64-Hex, Passwortmuster und lässt Normaltext durch | `node test/seedlock.test.js` | 21 von 21 Fällen ok (zuletzt 2026-10-15) |
| 2 | Content-Security-Policy sperrt Netzwerk: `default-src 'none'`, `connect-src 'none'`, `form-action 'none'`, `base-uri 'none'` | `node test/offline.test.js` | ok (zuletzt 2026-10-15) |
| 3 | Kein Netzwerk-Code und keine externen Ressourcen (fetch, XHR, WebSocket, sendBeacon, EventSource, Service Worker, iframe, link, externe src/href, CSS-url, keine http(s)-Adresse in der Datei) | `node test/offline.test.js` | ok, 0 Funde (zuletzt 2026-10-15) |
| 4 | Datei öffnet und rendert ohne Server (file://) | Microsoft Edge 154 headless, `--dump-dom` | ok, Abschnitt „Über Sie" gerendert |
| 5 | Netzwerk-Inspektion beim Öffnen | Edge headless mit `--log-net-log`, frisches Profil, 5 s | 0 Anfragen der Seite. Das Protokoll enthält nur Hintergrundverkehr des Browsers selbst (Update-Dienst, Zeitdienst, Konfiguration, bing.com-Vorabverbindung), der auch ohne die Datei entsteht. |
| 6 | Netzwerk-Inspektion beim Ausfüllen, Speichern, Laden, Drucken | `node test/browser.test.js`: Edge 154 headless, frisches Profil, Bedienung über DevTools-Protokoll; Netzwerk-Ereignisse des Seiten-Targets (ohne Hintergrundverkehr des Browsers) | ok (2026-10-10, wiederholt 2026-10-15): 2 lokale Ladevorgänge (file://), 0 Anfragen nach außen; Druck als PDF erzeugt |
| 7 | Entwurfsdatei und Druckansicht enthalten keine rot markierten Werte | `node test/browser.test.js`: 12-Wort-Seed im Feld „Sicherung", Entwurf speichern, neu laden, drucken | ok (2026-10-10, wiederholt 2026-10-15): Feld rot, Seed weder in der Datei noch in der Druckansicht, normale Werte erhalten, Laden ok |

Versionen: 2026-10-10 Hash `841b1f82…` (erste Fassung); 2026-10-14 Hash `0f5396e7…` (Kopf- und Fußzeile mit Firmenangaben entfernt, Funktion unverändert; Prüfungen 1–3, 6, 7 am 2026-10-15 wiederholt; Prüfungen 4–5 stammen von der ersten Fassung).

Grenzen: Prüfung 5 ist eine Stichprobe ohne Bedienung. Prüfung 6 bedient die Seite per Skript, nicht von Hand; ein echter Druckdialog wird durch `Page.printToPDF` ersetzt. Nicht geprüft: Firefox und Safari (die CSP ist Standard, das Verhalten sollte gleich sein). Die CSP verhindert Verbindungen auch dann, wenn ein Fehler im Code eine auslösen wollte; sie wirkt nur, solange die Datei unverändert ist (Hash vergleichen).
