// Tests der Nutzbarkeits-Funktionen ab Version 1.1: node test/nutzbarkeit.test.js
// Je Funktion mindestens ein Fall (Punkte 1–8 des Prüfauftrags vom 20.10.2026); Ergebnis in PRUEFPROTOKOLL.md.
// Was „gedruckt" wird, liest der Test im Druckmodus des Browsers (Emulation media=print), also mit dem Druck-CSS.
const fs = require('fs'), path = require('path');
const { open, report } = require('./cdp');
const { check, fail } = report();
const SEED = 'abandon ability able about above absent absorb abstract absurd abuse access accident';

(async () => {
  const b = await open();
  const { js, type, step, go, setFile, load, sleep, dl, cdp } = b;
  const printText = async (sel = '#out') => {
    await js(`window.dispatchEvent(new Event('beforeprint'))`);
    await cdp('Emulation.setEmulatedMedia', { media: 'print' });
    const t = await js(`document.querySelector(${JSON.stringify(sel)}).innerText`);
    await cdp('Emulation.setEmulatedMedia', { media: '' });
    return t;
  };
  const screenText = sel => js(`document.querySelector(${JSON.stringify(sel)}).innerText`);
  const pick = (sel, i) => js(`(()=>{const s=document.querySelector(${JSON.stringify(sel)});s.selectedIndex=${i};s.dispatchEvent(new Event('change',{bubbles:true}));return s.options[s.selectedIndex].text})()`);
  const tick = sel => js(`(()=>{const c=document.querySelector(${JSON.stringify(sel)});c.click();return c.checked})()`);
  const newest = async (ext, re) => { for (let i = 0; i < 20; i++) { await sleep(250); const f = fs.readdirSync(dl).filter(f => f.endsWith(ext)).map(f => path.join(dl, f)).sort((a, c) => fs.statSync(c).mtimeMs - fs.statSync(a).mtimeMs).find(f => !re || re.test(fs.readFileSync(f, 'utf8'))); if (f) return f; } };

  // ---- Punkt 3: „nein" und „weiß nicht" getrennt; angezeigter Wert = gedruckter Wert ----
  await step('Wallets');
  const opts = await js(`[...document.querySelector('#f_wallets_0_passphrase').options].map(o=>o.value)`);
  check(opts.includes('nein') && opts.includes('weiß nicht') && !opts.some(o => /weiß nicht \/ nein/.test(o)), 'P3 Passphrase: „nein" und „weiß nicht" sind getrennte Antworten');
  check(opts[0] === '', 'P3 Auswahlfelder beginnen mit leerer Option „– bitte wählen –" (nicht still vorbelegt)');

  const filled = [];
  const nSteps = await js(`document.querySelectorAll('#steps [data-go]').length`);
  for (let i = 0; i < nSteps; i++) {
    await go(i);
    const els = await js(`[...document.querySelectorAll('#form [data-p]')].map(e=>({id:e.id,p:e.dataset.p,tag:e.tagName,type:e.type,n:e.options?e.options.length:0}))`);
    for (const e of els) {
      if (e.tag === 'SELECT') { if (e.n < 2) continue; await pick('#' + e.id, 1); }
      else if (e.type === 'date') await type('#' + e.id, '2027-10-21');
      else await type('#' + e.id, 'Wert ' + e.p.replace(/\./g, ' '));
      const shown = await js(`(()=>{const s=document.getElementById(${JSON.stringify(e.id)});return s.tagName==='SELECT'?s.options[s.selectedIndex].text:s.value})()`);
      filled.push({ id: e.id, shown, type: e.type });
    }
  }
  const out = await printText();
  const missing = filled.filter(f => f.type === 'date' ? !out.includes('21.10.2027') : !out.includes(f.shown));
  check(filled.length > 30 && missing.length === 0, `P3 Alle ${filled.length} ausgefüllten Felder (Text, Auswahl, Datum, Zuordnung) stehen mit dem angezeigten Wert im Ausdruck` + (missing.length ? ' – fehlen: ' + missing.map(m => m.id + '=' + m.shown).join(', ') : ''));

  await load();
  await step('Wallets'); await type('#f_wallets_0_bez', 'Handy-App');
  const shownArt = await js(`(()=>{const s=document.getElementById('f_wallets_0_art');return s.options[s.selectedIndex].text})()`);
  const out2 = await printText();
  check(shownArt === '– bitte wählen –' && !out2.includes('Hardware-Wallet') && !/Passphrase[^\n]*\t(nein|ja)/.test(out2), 'P3 Unberührte Auswahl zeigt „– bitte wählen –" und druckt keinen Standardwert');

  // ---- Punkt 7: Schutz vor Arbeitsverlust ----
  const unload = () => js(`(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented})()`);
  check(await unload(), 'P7 Ungespeicherte Änderungen: Schließen löst Warnung aus (beforeunload)');
  check(/ungespeicherte Änderungen/.test(await js(`document.getElementById('savestate').textContent`)), 'P7 Hinweis „ungespeicherte Änderungen" sichtbar');
  await js(`document.getElementById('save').click()`);
  const file = await newest('.json', /Handy-App/);
  check(!!file && /vorsorgemappe-entwurf-\d{4}-\d\d-\d\d\.json$/.test(file), 'P7 Entwurf gespeichert, Datum im Dateinamen');
  check(/^Zuletzt gespeichert: \d\d\.\d\d\.\d{4}, \d\d:\d\d Uhr\.$/.test(await js(`document.getElementById('savestate').textContent`)), 'P7 Letzter Speicherzeitpunkt wird angezeigt');
  check(!(await unload()), 'P7 Nach dem Speichern keine Warnung beim Schließen');
  check(/nicht verschlüsselt/.test(await js(`document.body.innerText`)), 'P7 Hinweis: Entwurfsdatei unverschlüsselt und vertraulich');
  await step('Wallets'); await type('#f_wallets_0_bez', 'Neue Eingabe');
  await js('window.__confirmAnswer=false'); await setFile('#load', file); await step('Wallets');
  check((await js(`window.__confirms.length`)) > 0 && (await js(`document.getElementById('f_wallets_0_bez').value`)) === 'Neue Eingabe', 'P7 Laden über vorhandene Eingaben fragt nach; bei Abbruch bleibt alles');
  await js('window.__confirmAnswer=true'); await setFile('#load', file); await step('Wallets');
  check((await js(`document.getElementById('f_wallets_0_bez').value`)) === 'Handy-App', 'P7 Laden nach Bestätigung ersetzt die Eingaben');

  const v1 = path.join(b.tmp, 'v1.json');
  fs.writeFileSync(v1, JSON.stringify({ app: 'krypto-vorsorgemappe', v: 1, data: { person: { name: 'Erika' }, wallets: [{ bez: 'Alt', passphrase: 'weiß nicht / nein' }], boersen: [{}], orte: [{}], personen: [{}], steuer: {}, hinweise: {} } }));
  await load(); await setFile('#load', v1); await step('Wallets');
  const legacy = await js(`(()=>{const s=document.getElementById('f_wallets_0_passphrase');return s.options[s.selectedIndex].text})()`);
  await step('Prüfen');
  check(/weiß nicht \/ nein.*frühere Angabe/.test(legacy) && /bitte neu wählen/.test(await screenText('#check')), 'P3 Entwurf aus Version 1: alte Angabe „weiß nicht / nein" bleibt sichtbar und wird zur Neuwahl gemeldet');

  // ---- Punkt 1: Notfall-Deckblatt ----
  await load();
  await step('Über Sie');
  await type('#f_person_name', 'Erika Muster'); await type('#f_person_stand', '2026-10-21'); await type('#f_person_naechste', '2027-10-21');
  await type('#f_person_mappeort', 'Ordner Vorsorge im Arbeitszimmer');
  await step('Vertrauenspersonen'); await type('#f_personen_0_name', 'Anna Muster'); await type('#f_personen_0_kontakt', '0170 1234567');
  await printText();
  const firstIsCover = await js(`document.getElementById('out').firstElementChild.classList.contains('cover')`);
  const cov = await printText('#out > .cover');
  check(firstIsCover && /gehört: Erika Muster/.test(cov) && /Letzte Aktualisierung: 21\.10\.2026/.test(cov) && /Nächste Prüfung: 21\.10\.2027/.test(cov), 'P1 Deckblatt als erste Seite: Besitzerin, letzte Aktualisierung, Prüfdatum');
  check(/Erste Ansprechperson\s+Anna Muster, 0170 1234567/.test(cov) && /Ordner Vorsorge im Arbeitszimmer/.test(cov), 'P1 Deckblatt: erste Kontaktperson (Person 1) und Aufbewahrungsort');
  check((await js(`document.querySelectorAll('#out > .cover ol li').length`)) === 3 && /Anna Muster \(0170 1234567\) anrufen/.test(cov), 'P1 Deckblatt: drei erste Schritte, mit Name der Ansprechperson');
  check(/\.cover\{break-after:page;?\}/.test(await js(`[...document.styleSheets].map(s=>[...s.cssRules].map(r=>r.cssText).join(' ')).join(' ').replace(/\\s/g,'')`)), 'P1 Deckblatt endet mit Seitenumbruch');

  // ---- Punkt 8: Aktualisierung ----
  await step('Über Sie');
  check(!(await js(`document.getElementById('ics').disabled`)), 'P8 Kalender-Knopf aktiv, sobald ein Prüfdatum gesetzt ist');
  await js(`document.getElementById('ics').click()`);
  const icsf = await newest('.ics');
  const ics = icsf ? fs.readFileSync(icsf, 'utf8') : '';
  check(/DTSTART;VALUE=DATE:20271021\r\n/.test(ics) && /DTEND;VALUE=DATE:20271022/.test(ics) && /BEGIN:VEVENT/.test(ics) && /Entwurf laden\\, Angaben/.test(ics) && !/Erika|Anna|Ordner/.test(ics), 'P8 Kalenderdatei (.ics) lokal erzeugt, mit Datum, ohne persönliche Angaben');
  await type('#f_person_aenderungen', '21.10.2026: Handy-Wallet ergänzt');
  check(/Änderungen\s+21\.10\.2026: Handy-Wallet ergänzt/.test(await printText()), 'P8 Änderungsliste erscheint in der Mappe');
  await js(`document.getElementById('save').click()`);
  const draft = await newest('.json', /Handy-Wallet ergänzt/);
  await load(); await setFile('#load', draft);
  check(/Willkommen zurück/.test(await screenText('#form')) && (await js(`document.querySelectorAll('#reopenbox [data-jump]').length`)) === 4, 'P8 Beim erneuten Öffnen: gezielte Fragen (Gerät/Wallet, Börse, Kontaktperson, Aufbewahrungsort)');
  await js(`document.querySelector('#reopenbox [data-jump="personen"]').click()`);
  check(/Vertrauenspersonen/.test(await js(`document.querySelector('#form h2').textContent`)), 'P8 Frage „andere Kontaktperson" führt zum Abschnitt Vertrauenspersonen');
  await step('Über Sie'); await js(`document.querySelector('[data-today="person.stand"]').click()`);
  const t0 = new Date(), iso = t0.getFullYear() + '-' + String(t0.getMonth() + 1).padStart(2, '0') + '-' + String(t0.getDate()).padStart(2, '0');
  check((await js(`document.getElementById('f_person_stand').value`)) === iso, 'P8 Knopf „heute" setzt den Stand auf das heutige Datum');

  // ---- Punkt 4: Wallet → Sicherung an Ort → Person ----
  await load();
  await step('Vertrauenspersonen'); await type('#f_personen_0_name', 'Anna'); await type('#f_personen_0_kontakt', '0170 1');
  await step('Geräte und Orte'); await type('#f_orte_0_ort', 'Bankschließfach'); await type('#f_orte_0_zugang', 'Schlüssel im Schreibtisch');
  await step('Wallets'); await type('#f_wallets_0_bez', 'Ledger'); await type('#f_wallets_0_geraet', 'Tresor'); await type('#f_wallets_0_sicherung', 'Metallplatte');
  const refO = await pick('#f_wallets_0_sicherungort', 1), refP = await pick('#f_wallets_0_helfer', 1);
  check(refO === 'Ort 1: Bankschließfach' && refP === 'Person 1: Anna', 'P4 Zuordnung wählt aus den eingetragenen Orten und Personen');
  await step('Börsen'); await type('#f_boersen_0_anbieter', 'Börse X'); await pick('#f_boersen_0_helfer', 1);
  const glance = await printText('#out .glance');
  check(/Wallet 1: Ledger\s+Tresor\s+Metallplatte\s+→ Ort 1: Bankschließfach\s+Person 1: Anna/.test(glance), 'P4 „Auf einen Blick": Wallet → Gerät → Sicherung (Ort) → helfende Person in einer Zeile');
  check(/Konto 1: Börse X[\s\S]*Person 1: Anna/.test(glance), 'P4 „Auf einen Blick": Konto → helfende Person');
  await step('Geräte und Orte'); await js(`document.querySelector('[data-del]')||document.getElementById('add').click()`);
  await js(`document.getElementById('add').click()`); await type('#f_orte_1_ort', 'Tresor zu Hause');
  await js(`document.querySelector('[data-del="0"]').click()`);
  const g2 = await printText('#out .glance');
  check(!/Bankschließfach/.test(g2) && /Metallplatte/.test(g2), 'P4 Gelöschter Ort verschwindet aus der Zuordnung (kein toter Verweis)');
  await step('Wallets');
  check((await js(`document.getElementById('f_wallets_0_sicherungort').value`)) === '', 'P4 Zuordnung auf gelöschten Ort zeigt wieder „– bitte wählen –"');

  // ---- Punkt 2: Vollständigkeitsprüfung, nicht vorhanden / unbekannt / noch nicht ausgefüllt ----
  await load();
  await step('Prüfen');
  check(/Sie haben noch keine Vertrauensperson eingetragen/.test(await screenText('#check .chk-fehlt')), 'P2 Hinweis „noch keine Vertrauensperson eingetragen"');
  await step('Wallets'); await type('#f_wallets_0_bez', 'Ledger'); await tick('[data-st="wallets.0.geraet"][value="unbekannt"]');
  await tick('[data-st="wallets.0.sicherung"][value="keine"]');
  await js(`document.getElementById('add').click()`); await type('#f_wallets_1_bez', 'Handy');
  await pick('#f_wallets_1_passphrase', 2);
  await step('Börsen'); await js(`document.querySelector('[data-has="boersen"][value="keine"]').click()`);
  await step('Prüfen');
  const fehlt = await screenText('#check .chk-fehlt'), unbek = await screenText('#check .chk-unbekannt');
  check(/Wallet 2 \(„Handy“\): Ort der Sicherung fehlt/.test(fehlt) && /Wallet 2 \(„Handy“\): Passphrase „ja“, aber der Ort des Hinweises fehlt/.test(fehlt), 'P2 Hinweis je Wallet: „Für Wallet 2 fehlt der Ort der Sicherung", Passphrase ohne Hinweisort');
  check(/Wallet 1 \(„Ledger“\): Ort des Geräts – als unbekannt angegeben/.test(unbek) && /Wallet 1 \(„Ledger“\): Ort der Sicherung – gibt es nicht/.test(unbek), 'P2 „unbekannt" und „gibt es nicht" werden getrennt von „fehlt" aufgeführt');
  check(!/Börsen und Konten/.test(fehlt), 'P2 Abschnitt bewusst „nein, keine" → kein Fehlt-Hinweis');
  const p2 = await printText();
  check(/Wo liegt das Gerät oder die App\?\s+unbekannt/.test(p2) && /Wo liegt die Sicherung \(Seed\)\?\s+gibt es nicht/.test(p2) && /Börsen und Konten[\s\S]{0,40}Keine \(so angegeben\)/.test(p2), 'P2 Ausdruck: „unbekannt", „gibt es nicht" und „Keine (so angegeben)" stehen in der Mappe');
  check(!/noch nicht ausgefüllt/.test(p2), 'P2 „noch nicht ausgefüllt" erscheint nur in der Vorschau, nicht im Ausdruck');
  await step('Vertrauenspersonen'); await js(`document.querySelector('[data-has="personen"][value="keine"]').click()`);
  await step('Prüfen');
  check(/keine Vertrauensperson gibt/.test(await screenText('#check .chk-unbekannt')), 'P2 „keine Vertrauensperson" bewusst angegeben → eigener Hinweis');

  // ---- Punkt 5: Vorschau vor dem Drucken ----
  check(await js(`getComputedStyle(document.getElementById('out')).display==='block'`), 'P5 Vorschau der fertigen Mappe direkt im Abschnitt „Prüfen und drucken"');
  const nEdit = await js(`document.querySelectorAll('#out button.edit').length`);
  check(nEdit >= 8, `P5 „Angabe bearbeiten" an jedem Abschnitt der Vorschau (${nEdit} Knöpfe)`);
  check(/noch nicht ausgefüllt/.test(await screenText('#out')), 'P5 Fehlende Angaben in der Vorschau gelb gekennzeichnet');
  await js(`document.querySelector('#out h2 button.edit[data-go="${await js(`[...document.querySelectorAll('#steps [data-go]')].findIndex(b=>/Steuer/.test(b.textContent))`)}"]').click()`);
  check(/Steuerunterlagen/.test(await js(`document.querySelector('#form h2').textContent`)) && !(await js(`document.body.classList.contains('vorschau')`)), 'P5 „Angabe bearbeiten" springt zum Abschnitt');
  await step('Wallets'); await type('#f_wallets_0_notiz', SEED);
  await step('Prüfen');
  check(/nicht übernommen/.test(await screenText('#out')) && /Seed-Sperre/.test(await screenText('#check')), 'P5 Wegen Seed-Sperre ausgeschlossene Angabe in Prüfung und Vorschau gekennzeichnet');
  const before = await js(`window.__confirms.length`);
  await js('window.__confirmAnswer=false'); await js(`document.getElementById('print').click()`); await js('window.__confirmAnswer=true');
  check((await js(`window.__confirms.slice(${before}).join(' ')`)).includes('Trotzdem drucken'), 'P5/P2 Drucken mit fehlenden Angaben fragt nach');

  // ---- Punkt 6: Angehörigen-Test ----
  await step('Angehörigen-Test');
  const qs = await js(`[...document.querySelectorAll('#form label')].map(l=>l.textContent).filter(t=>/^\\d\\./.test(t))`);
  check(qs.length === 3 && /findet/i.test(qs[0]) && /Konten und Wallets/.test(qs[1]) && /wen sie fragen/.test(qs[2]) && /keine Sicherung/.test(await screenText('#form')), 'P6 Drei Fragen, Hinweis: keine Sicherung öffnen, keine Geheimnisse zeigen');
  await pick('#f_test_findet', 2);
  check(/wo die Mappe liegt/.test(await screenText('#testtips')), 'P6 Antwort „noch nicht" zeigt, wie man die Lücke schließt');
  await pick('#f_test_findet', 1); await pick('#f_test_versteht', 1); await pick('#f_test_wen', 1);
  await type('#f_test_mit', 'Anna'); await js(`document.querySelector('[data-today="test.datum"]').click()`);
  check(/Alle drei Fragen mit „ja“ beantwortet/.test(await screenText('#form')), 'P6 Alle drei „ja": Bestätigung');
  check(/Angehörigen-Test[\s\S]*Findet Ihre Vertrauensperson die Mappe\?\s+ja[\s\S]*Mit wem[^\n]*\s+Anna[\s\S]*Datum des Tests\s+\d\d\.\d\d\.\d{4}/.test(await printText()), 'P6 Testergebnis mit Datum in der Mappe vermerkt');

  // ---- Seed-Sperre über die neuen Felder ----
  await load();
  const targets = [['Über Sie', '#f_person_mappeort'], ['Über Sie', '#f_person_aenderungen'], ['Über Sie', '#f_person_name'], ['Vertrauenspersonen', '#f_personen_0_name'], ['Vertrauenspersonen', '#f_personen_0_kontakt'], ['Geräte und Orte', '#f_orte_0_ort'], ['Wallets', '#f_wallets_0_passhinweis'], ['Wallets', '#f_wallets_0_sicherung'], ['Börsen', '#f_boersen_0_zweifaktor'], ['Angehörigen-Test', '#f_test_mit']];
  const red = [];
  for (const [st, sel] of targets) { await step(st); if (await type(sel, SEED)) red.push(sel); }
  await step('Wallets'); await type('#f_wallets_0_bez', 'Ledger'); await pick('#f_wallets_0_sicherungort', 0);
  const refOpts = await js(`[...document.querySelectorAll('#f_wallets_0_sicherungort option, #f_wallets_0_helfer option')].map(o=>o.text).join(' ')`);
  const pAll = await printText(), sAll = await screenText('body');
  check(red.length === targets.length, `Seed-Sperre: Seed in ${targets.length} neuen Feldern (Deckblatt, Zuordnungsquellen, Änderungsliste, Test) rot markiert` + (red.length < targets.length ? ' – nicht markiert: ' + targets.map(t => t[1]).filter(s => !red.includes(s)).join(', ') : ''));
  check(!pAll.includes('abandon'), 'Seed-Sperre: kein Seed im Ausdruck (Deckblatt, Übersicht, Zuordnungen, Test)');
  check(!refOpts.includes('abandon'), 'Seed-Sperre: kein Seed in den Auswahllisten der Zuordnungen');
  await js(`document.getElementById('save').click()`);
  const sd = await newest('.json', /Ledger/);
  check(!!sd && !fs.readFileSync(sd, 'utf8').includes('abandon'), 'Seed-Sperre: kein Seed in der Entwurfsdatei');

  // Manipulierter Entwurf: Seeds in Zuordnungen, Status, IDs, Abschnittsangaben, Auswahl- und Testfeldern
  const evil = path.join(b.tmp, 'evil.json');
  fs.writeFileSync(evil, JSON.stringify({ app: 'krypto-vorsorgemappe', v: 2, data: {
    meta: { has: { wallets: SEED, personen: 'ja' } },
    person: { name: 'Erika', stand: SEED, mappeort_st: SEED, testament: SEED },
    personen: [{ _id: SEED, name: SEED, kontakt: 'x' }, { _id: 'abc123', name: 'Anna' }],
    orte: [{ _id: 'ort111', ort: SEED, zugang_st: 'keine' }],
    wallets: [{ _id: 'w1', bez: 'Ledger', art: SEED, passphrase: SEED, sicherungort: SEED, helfer: SEED, geraet_st: SEED }],
    boersen: [{ anbieter: 'X', helfer: 'ort111' }], steuer: { belege_st: SEED }, hinweise: {}, test: { findet: SEED, mit: SEED, datum: SEED } } }));
  await load(); await setFile('#load', evil);
  const pe = await printText();
  await step('Prüfen');
  const se = await screenText('body');
  check(!pe.includes('abandon') && pe.includes('Ledger') && pe.includes('Erika'), 'Seed-Sperre: manipulierter Entwurf – kein Seed im Ausdruck, normale Werte bleiben');
  check(!se.includes('abandon'), 'Seed-Sperre: manipulierter Entwurf – kein Seed in Prüfliste und Vorschau');
  await step('Wallets');
  check(!(await js(`[...document.querySelectorAll('#form option')].map(o=>o.text).join(' ')`)).includes('abandon'), 'Seed-Sperre: manipulierter Entwurf – kein Seed in Auswahllisten');

  const remote = b.requests.filter(u => !/^(file|data|blob|about):/.test(u));
  check(remote.length === 0, `Netzwerk: 0 Anfragen nach außen (${b.requests.length} lokale Ladevorgänge)`);
  await b.close();
  if (fail.length) { console.log(fail.length + ' Fehler'); process.exit(1); }
  console.log('Nutzbarkeitstest ok');
})().catch(e => { console.error(e); process.exit(1); });
