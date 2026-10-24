// Gemeinsamer Helfer für Browser-Tests: startet Edge headless mit frischem Profil und öffnet die gebaute Datei.
// Liefert js(), type(), go(), step(), cdp() und die Liste der Netzwerk-Anfragen des Seiten-Targets.
const fs = require('fs'), path = require('path'), os = require('os'), { spawn } = require('child_process');
const EDGE = process.env.EDGE || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const FILE = path.join(__dirname, '..', 'dist', 'krypto-vorsorgemappe.html');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function open(port = 9334) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kvm-'));
  const dl = path.join(tmp, 'dl'); fs.mkdirSync(dl);
  const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=' + port,
    '--user-data-dir=' + path.join(tmp, 'profil'), 'about:blank'], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(250);
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); } catch (e) {}
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
    if (r.result.exceptionDetails) throw new Error(((r.result.exceptionDetails.exception || {}).description || r.result.exceptionDetails.text) + '\n' + expr.slice(0, 200));
    return r.result.result.value;
  };
  const stub = () => js('window.__confirms=[];window.__confirmAnswer=true;window.confirm=m=>{window.__confirms.push(m);return window.__confirmAnswer};window.print=()=>{};window.alert=m=>{window.__alert=m}');
  const load = async () => { await cdp('Page.navigate', { url: 'file:///' + FILE.replace(/\\/g, '/') }); await sleep(1200); await stub(); };
  const type = (sel, val) => js(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)throw new Error('fehlt: '+${JSON.stringify(sel)});e.value=${JSON.stringify(val)};e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));return e.classList.contains('bad')})()`);
  const go = n => js(`document.querySelector('#steps [data-go="${n}"]').click()`);
  const step = title => js(`(()=>{const b=[...document.querySelectorAll('#steps [data-go]')].find(b=>b.textContent.includes(${JSON.stringify(title)}));if(!b)throw new Error('Abschnitt fehlt: '+${JSON.stringify(title)});b.click()})()`);
  const setFile = async (sel, file) => {
    const doc = await cdp('DOM.getDocument');
    const node = await cdp('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: sel });
    await cdp('DOM.setFileInputFiles', { nodeId: node.result.nodeId, files: [file] });
    await sleep(600);
  };
  const close = async () => { ws.close(); edge.kill(); await sleep(500); try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {} };
  await cdp('Network.enable'); await cdp('Page.enable'); await cdp('DOM.enable');
  await cdp('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dl });
  await load();
  return { cdp, js, type, go, step, setFile, load, stub, close, requests, dl, tmp, sleep };
}

function report() {
  const fail = [];
  return { fail, check: (c, m) => c ? console.log('ok  ' + m) : (fail.push(m), console.log('FEHLER ' + m)) };
}

module.exports = { open, report, sleep, FILE };
