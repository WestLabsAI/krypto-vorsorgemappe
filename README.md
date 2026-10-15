# Krypto-Vorsorgemappe

Eine einzelne HTML-Datei, die offline im Browser läuft. Sie führt durch einen Fragebogen und erzeugt
eine druckbare Mappe für Angehörige: welche Wallets, Börsenkonten und Geräte es gibt, wo die
Sicherungen liegen, wer helfen darf und was im Notfall zu tun ist – **ohne** Seed-Wörter, private
Schlüssel oder Passwörter.

Website: https://v07.westlabsai.com

## Warum der Code offen ist

Das Versprechen der Datei ist: Sie sendet nichts. Das soll niemand glauben müssen, sondern prüfen
können. Deshalb liegt hier alles, woraus die Kaufdatei gebaut wird, samt Tests und Prüfprotokoll.

## Aufbau

- `src/app.html` – Fragebogen und Druckansicht (eine Datei, kein Framework)
- `src/seedlock.js` – Seed-Sperre: erkennt BIP39-Wortfolgen, WIF, xprv/xpub, 64-stellige
  Hex-Schlüssel und typische Passwortmuster und sperrt das Feld für Druck und Entwurf
- `src/bip39-english.txt` – BIP39-Wortliste (Herkunft siehe `NOTICE.md`)
- `build.js` – baut `dist/krypto-vorsorgemappe.html` (alles eingebettet)
- `test/` – Prüfungen, Ergebnisse in `PRUEFPROTOKOLL.md`

## Selbst bauen und prüfen

Voraussetzung: Node.js ab Version 18. Keine Abhängigkeiten.

```
node build.js
node test/seedlock.test.js
node test/offline.test.js
node test/browser.test.js   # braucht Microsoft Edge oder Chrome
```

Den SHA-256-Wert Ihrer gebauten Datei können Sie mit dem Wert im Prüfprotokoll und mit Ihrer
gekauften Datei vergleichen:

```
certutil -hashfile dist/krypto-vorsorgemappe.html SHA256   # Windows
shasum -a 256 dist/krypto-vorsorgemappe.html               # macOS, Linux
```

## Schutz vor Netzwerkzugriff

Die Datei setzt eine Content-Security-Policy mit `default-src 'none'`, `connect-src 'none'`,
`form-action 'none'` und `base-uri 'none'`. Der Browser blockiert damit jede Verbindung nach
außen, auch wenn ein Fehler im Code eine auslösen wollte. Das gilt, solange die Datei unverändert
ist.

## Grenzen

Die Seed-Sperre ist eine Hilfe gegen Versehen, keine Garantie. Sie kennt nur die englische
BIP39-Liste; Electrum-Altseeds, Monero-Seeds und andere Wortlisten erkennt sie nur über die
Passwort- und Mengenregeln. Die Mappe ist kein Testament und ersetzt keinen Rechts- oder
Steuerrat.

## Lizenz

MIT, siehe `LICENSE`. Die Marke „Krypto-Vorsorgemappe" und die Texte der Website sind nicht Teil
der Lizenz.

Fehler und Hinweise gern als Issue oder per Mail an Venture07@westlabsai.com.
