// Bedienungstest im echten Browser (Prüfprotokoll Punkt 6 und 7): node test/browser.test.js
// Startet Edge headless mit frischem Profil, füllt Felder aus (darunter eine Seed-Folge), speichert
// den Entwurf, lädt ihn wieder, erzeugt die Druckansicht und ein PDF. Prüft: keine Netzwerk-Anfrage
// der Seite (CDP Network des Seiten-Targets, Browser-Hintergrundverkehr ist dort nicht enthalten),
// Seed weder in der Entwurfsdatei noch in der Druckansicht, normale Werte bleiben erhalten.
const fs = require('fs'), path = require('path'), os = require('os'), { spawn } = require('child_process');
const EDGE = process.env.EDGE || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const FILE = path.join(__dirname, '..', 'dist', 'krypto-vorsorgemappe.html');
const PORT = 9333;
const SEED = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
const NORMAL = 'Tresor im Arbeitszimmer';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kvm-'));
const dl = path.join(tmp, 'dl'); fs.mkdirSync(dl);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fail = [], ok = m => console.log('ok  ' + m), bad = m => { fail.push(m); console.log('FEHLER ' + m); };

(async () => {
  const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + path.join(tmp, 'profil'), 'about:blank'], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(250);
    try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find(t => t.type === 'page'); } catch (e) {}
  }
  if (!target) throw new Error('Edge nicht erreichbar');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const wait = {}, requests = [];
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && wait[m.id]) { wait[m.id](m); delete wait[m.id]; }
    if (m.method === 'Network.requestWillBeSent') requests.push(m.params.request.url);
  });
  const cdp = (method, params = {}) => new Promise(r => { const i = ++id; wait[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const js = async expr => {
    const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.text + ': ' + expr);
    return r.result.result.value;
  };
  const type = (sel, val) => js(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});e.value=${JSON.stringify(val)};e.dispatchEvent(new Event('input',{bubbles:true}));return e.classList.contains('bad')})()`);
  const go = n => js(`document.querySelector('[data-go="${n}"]').click()`);

  await cdp('Network.enable'); await cdp('Page.enable'); await cdp('DOM.enable');
  await cdp('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dl });
  await cdp('Page.navigate', { url: 'file:///' + FILE.replace(/\\/g, '/') });
  await sleep(1500);
  await js('window.confirm=()=>true;window.print=()=>{};window.alert=m=>{window.__alert=m}');

  // Ausfüllen: Name, Wallet mit Seed im Feld „Sicherung" und normalem Gerätestandort
  await go(0); await type('#f_person_name', 'Erika Muster');
  await go(1);
  const redSeed = await type('#f_wallets_0_sicherung', SEED);
  await type('#f_wallets_0_geraet', NORMAL);
  redSeed ? ok('Seed-Feld wird rot markiert') : bad('Seed-Feld nicht markiert');

  // Entwurf speichern
  await js(`document.getElementById('save').click()`);
  let file;
  for (let i = 0; i < 20 && !file; i++) { await sleep(250); file = fs.readdirSync(dl).find(f => f.endsWith('.json')); }
  if (!file) bad('Entwurfsdatei nicht gespeichert');
  else {
    const txt = fs.readFileSync(path.join(dl, file), 'utf8'), j = JSON.parse(txt);
    !txt.includes('abandon') ? ok('Entwurfsdatei enthält keinen Seed') : bad('Seed in der Entwurfsdatei');
    j.data.wallets[0].geraet === NORMAL && j.data.person.name === 'Erika Muster' ? ok('Normale Werte im Entwurf erhalten') : bad('Normale Werte fehlen im Entwurf');

    // Laden: Seite neu öffnen, Datei über das Dateifeld laden
    await cdp('Page.reload'); await sleep(1200);
    await js('window.confirm=()=>true;window.print=()=>{};window.alert=m=>{window.__alert=m}');
    const doc = await cdp('DOM.getDocument');
    const node = await cdp('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: '#load' });
    await cdp('DOM.setFileInputFiles', { nodeId: node.result.nodeId, files: [path.join(dl, file)] });
    await sleep(800);
    (await js(`document.getElementById('f_person_name').value`)) === 'Erika Muster' ? ok('Entwurf wieder geladen') : bad('Laden fehlgeschlagen ' + (await js('window.__alert||""')));
  }

  // Seed erneut eingeben, dann Druckansicht und PDF
  await go(1); await type('#f_wallets_0_sicherung', SEED);
  await go(7); await js(`document.getElementById('print').click()`);
  const out = await js(`document.getElementById('out').innerText`);
  !out.includes('abandon') && out.includes(NORMAL) ? ok('Druckansicht ohne Seed, mit normalen Werten') : bad('Druckansicht fehlerhaft');
  const pdf = await cdp('Page.printToPDF', {});
  pdf.result && pdf.result.data ? ok('PDF erzeugt (' + Math.round(pdf.result.data.length * 0.75 / 1024) + ' KB)') : bad('PDF nicht erzeugt');
  await sleep(500);

  const remote = requests.filter(u => !/^(file|data|blob|about):/.test(u));
  remote.length === 0 ? ok(`Netzwerk: ${requests.length} lokale Ladevorgänge, 0 Anfragen nach außen`) : bad('Netzwerk-Anfragen: ' + remote.join(', '));

  ws.close(); edge.kill();
  await sleep(500); try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
  if (fail.length) process.exit(1);
  console.log('Bedienungstest ok');
})().catch(e => { console.error(e); process.exit(1); });
