// Flare — verificación SOLO TEXTO (sin capturas) de la landing + Studio.
// Uso: 1) cd app && npm run preview -- --port 4292 --host 127.0.0.1
//      2) node ../textcheck.mjs  (desde react-rewrite/)
// No escribe ni lee imágenes: solo evalúa el DOM y lanza eventos CDP.
// Comprueba copy, scores 100/85/85, Safe 10/10, modal (foco/Escape/scroll
// lock), laboratorio (40 → 100), orden de capítulos, overflow responsive
// y consola limpia.

const CHROME =
  process.env.HOME + '/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome';
const CDP_PORT = 9331;
const PROFILE = '/tmp/flare-textcheck-profile-' + Date.now();
const PAGE_URL = 'http://127.0.0.1:4292/';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0;
let fail = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) {
    pass++;
    console.log('PASS ' + name + (detail !== undefined ? ' :: ' + JSON.stringify(detail) : ''));
  } else {
    fail++;
    failures.push(name);
    console.log('FAIL ' + name + ' :: ' + JSON.stringify(detail ?? null));
  }
}

const chrome = (await import('node:child_process')).spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--ignore-certificate-errors',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${PROFILE}`,
    '--window-size=1280,900',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

let target;
for (let i = 0; i < 50; i++) {
  await sleep(400);
  try {
    const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
    target = list.find((t) => t.type === 'page');
    if (target) break;
  } catch {
    /* retry */
  }
}
if (!target) {
  console.error('No se pudo conectar a Chrome/CDP');
  chrome.kill('SIGKILL');
  process.exit(1);
}

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = rej;
});
let id = 0;
const pending = new Map();
const consoleErrors = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m.result);
    pending.delete(m.id);
  }
  if (m.method === 'Runtime.exceptionThrown') {
    consoleErrors.push(m.params.exceptionDetails?.text || 'exception');
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    consoleErrors.push(m.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
  }
};
const send = (method, params = {}) =>
  new Promise((res) => {
    const mid = ++id;
    pending.set(mid, res);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
const evl = async (expr) =>
  (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }))
    .result?.value;

const key = async (type, keyName, code, windowsVirtualKeyCode) =>
  send('Input.dispatchKeyEvent', {
    type,
    key: keyName,
    code,
    windowsVirtualKeyCode,
    nativeVirtualKeyCode: windowsVirtualKeyCode,
  });

async function waitFor(expr, ms = 7000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await evl(expr)) return true;
    await sleep(220);
  }
  return false;
}

async function selectTemplate(slug) {
  return evl(`(() => {
    const sel = document.querySelector('#template-select');
    if (!sel) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    setter.call(sel, ${JSON.stringify(slug)});
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return sel.value;
  })()`);
}

await send('Page.enable');
await send('Runtime.enable');
await send('DOM.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1280,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
await send('Browser.grantPermissions', {
  origin: 'http://127.0.0.1:4292',
  permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
});
await send('Page.navigate', { url: PAGE_URL });
await sleep(3600); // preloader 2,35 s + fuentes

// ---------- A. Carga / hero ----------
const title = await evl('document.title');
check('A1 title', /Flare/.test(title || ''), title);
const h1 = await evl(`document.querySelector('.hero-title')?.innerText?.replace(/\\s+/g, ' ').trim()`);
check('A2 H1 completo', h1 === 'Tu producto, en modo cinemático.', h1);
const stats = await evl(`[...document.querySelectorAll('.hero dl dd')].map(e => e.textContent.trim())`);
check('A3 stats sin inconsistentcias', JSON.stringify(stats) === JSON.stringify(['score perfecto', 'proveedores BYO', 'agentes CLI', 'servidores']), stats);
const dots = await evl(`document.querySelectorAll('.hero [aria-label^="Ver escena"]').length`);
check('A4 hero: 6 escenas clicables', dots === 6, dots);
await evl(`document.querySelectorAll('.hero [aria-label^="Ver escena"]')[2].click()`);
await sleep(350);
const counter = await evl(`document.querySelector('.phone-wrap + div > span')?.textContent?.trim()`);
check('A5 click en escena actualiza contador', counter === '03/06', counter);
const overflow1280 = await evl(`document.documentElement.scrollWidth - window.innerWidth`);
check('A6 sin overflow 1280', overflow1280 <= 0, overflow1280);
const cinIsolation = await evl(`(() => {
  const studio = document.getElementById('studio');
  const root = document.querySelector('.cine-root');
  return { studio: !!studio, insideCine: !!root && root.contains(studio) };
})()`);
check('A7 Studio fuera de .cine-root (cursor nativo)', cinIsolation?.studio === true && cinIsolation?.insideCine === false, cinIsolation);

// ---------- B. Manifiesto: mismos scores del motor ----------
const rings = await evl(
  `[...document.querySelectorAll('#manifiesto svg text')].map(e => e.textContent.trim())`,
);
check('B1 manifiesto 100/85/85', JSON.stringify(rings) === JSON.stringify(['100', '85', '85']), rings);
const safeRows = await evl(
  `[...document.querySelectorAll('#manifiesto button')].map(b => b.textContent).filter(t => /Safe/.test(t))`,
);
check(
  'B2 manifiesto Safe 10/10 en los tres',
  safeRows.length === 3 && safeRows.every((t) => /Safe 10\/10/.test(t)),
  safeRows.map((t) => t.replace(/\\s+/g, ' ').trim().slice(0, 80)),
);

// ---------- C. Laboratorio de retención (motor en vivo) ----------
const score0 = await evl(`document.querySelector('.lab-score')?.textContent?.trim()`);
check('C1 score inicial roto (<75)', Number(score0) < 75, score0);
const ruleCount = await evl(`document.querySelectorAll('.lab-rule').length`);
check('C2 cinco reglas', ruleCount === 5, ruleCount);
const clickedFix = await evl(`(() => {
  const b = [...document.querySelectorAll('#motor button')].find(x => /Arreglar con el agente/.test(x.textContent));
  if (!b) return false;
  b.click();
  return true;
})()`);
check('C3 botón de arreglo presente', clickedFix === true, clickedFix);
await sleep(4300);
const score1 = await evl(`document.querySelector('.lab-score')?.textContent?.trim()`);
check('C4 el agente arregla y el score sube a 100', score1 === '100', score1);
const labSafe = await evl(
  `[...document.querySelectorAll('#motor .lab-rule')].map(r => r.textContent.replace(/\\s+/g, ' ').trim())`,
);
check(
  'C5 reglas al completo tras el fix',
  labSafe.length === 5 &&
    labSafe.every((r) => {
      const m = r.match(/(\d+)\/(\d+)/);
      return m && m[1] === m[2];
    }),
  labSafe,
);

// ---------- D. Orden de capítulos y Studio ----------
const order = await evl(`(() => {
  const agentes = document.getElementById('agentes');
  const studio = document.getElementById('studio');
  const accion = document.getElementById('accion');
  const pos = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
  return { a2s: pos(agentes, studio), s2a: pos(studio, accion), all: !!agentes && !!studio && !!accion };
})()`);
check('D1 DOM 05 agentes → 06 Studio → 07 acción', order?.all && order?.a2s && order?.s2a, order);

await evl(`document.getElementById('studio').scrollIntoView()`);
await sleep(2600);
const studioText = await evl(`document.getElementById('studio')?.innerText || ''`);
check('D2 Studio: score 100/100', /100\/100/.test(studioText), studioText.match(/100\/100/)?.[0]);
check('D3 Studio: Safe 10/10 medido', /Safe 10\/10/.test(studioText), studioText.match(/Safe \d+\/10/)?.[0]);
check('D4 Studio: auditoría en vivo terminada', /Medido en vivo/.test(studioText), null);
const studioOverflow = await evl(`document.getElementById('studio').scrollWidth - document.getElementById('studio').clientWidth`);
check('D5 Studio sin overflow interno', studioOverflow <= 1, studioOverflow);

// ---------- D2. Los tres ejemplos en el Studio (100/85/85) ----------
const pickedA = await selectTemplate('marca-personal');
const got85 = await waitFor(
  `document.getElementById('studio').innerText.includes('85/100') && document.getElementById('studio').innerText.includes('Safe 10/10')`,
);
check('D6 Studio · marca-personal 85/100 + Safe 10/10', pickedA === 'marca-personal' && got85, got85);
const pickedB = await selectTemplate('saas-presentacion');
const got85b = await waitFor(
  `document.getElementById('studio').innerText.includes('85/100') && document.getElementById('studio').innerText.includes('Safe 10/10')`,
);
check('D7 Studio · saas-presentacion 85/100 + Safe 10/10', pickedB === 'saas-presentacion' && got85b, got85b);
const pickedC = await selectTemplate('colchon-descanso-total');
const got100 = await waitFor(`document.getElementById('studio').innerText.includes('100/100')`);
check('D8 Studio · vuelve a 100/100', pickedC === 'colchon-descanso-total' && got100, got100);

// ---------- E. Modal del reel: foco, scroll lock, Escape ----------
await evl(`document.getElementById('reel').scrollIntoView()`);
await sleep(900);
const opened = await evl(`(() => {
  const b = [...document.querySelectorAll('#reel button')].find(x => /Ver escenas/.test(x.textContent));
  if (!b) return false;
  b.click();
  return true;
})()`);
await sleep(500);
const modal1 = await evl(`(() => {
  const d = document.querySelector('[role="dialog"][aria-label^="Escenas de"]');
  return {
    exists: !!d,
    overflow: document.body.style.overflow,
    stopped: document.documentElement.classList.contains('lenis-stopped'),
    focusInside: !!d && d.contains(document.activeElement),
  };
})()`);
check('E1 modal abre con foco dentro', opened === true && modal1?.exists && modal1?.focusInside, modal1);
check('E2 scroll bloqueado (body + lenis)', modal1?.overflow === 'hidden' && modal1?.stopped === true, modal1);
await key('keyDown', 'Escape', 'Escape', 27);
await key('keyUp', 'Escape', 'Escape', 27);
await sleep(400);
const modal2 = await evl(`(() => ({
  exists: !!document.querySelector('[role="dialog"][aria-label^="Escenas de"]'),
  overflow: document.body.style.overflow,
  stopped: document.documentElement.classList.contains('lenis-stopped'),
}))()`);
check('E3 Escape cierra y libera el scroll', modal2?.exists === false && modal2?.overflow === '' && modal2?.stopped === false, modal2);

// ---------- F. Móvil 390 px ----------
await send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true,
});
await sleep(1200);
const mobile = await evl(`(() => ({
  overflow: document.documentElement.scrollWidth - window.innerWidth,
  rail: getComputedStyle(document.querySelector('.chapter-rail')).display,
  grid: getComputedStyle(document.querySelector('.hero-grid')).display,
  menuBtn: !!document.querySelector('header button[aria-label="Abrir menú"]'),
}))()`);
check('F1 móvil sin overflow horizontal', mobile?.overflow <= 0, mobile?.overflow);
check('F2 móvil: rail oculto y grid visible', mobile?.rail === 'none' && mobile?.grid !== 'none', mobile);
check('F3 móvil: botón de menú presente', mobile?.menuBtn === true, mobile?.menuBtn);

// ---------- F2. Tamaños intermedios (820 / 1024 / 1440) ----------
for (const width of [820, 1024, 1440]) {
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await sleep(700);
  const probe = await evl(`(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    reelDir: getComputedStyle(document.querySelector('.reel-track')).flexDirection,
    heroGrid: getComputedStyle(document.querySelector('.hero-grid')).display,
  }))()`);
  check(
    `F2.${width} sin overflow y reel ${width <= 900 ? 'apilado' : 'horizontal'}`,
    probe?.overflow <= 0 &&
      (width <= 900 ? probe?.reelDir === 'column' : probe?.reelDir === 'row'),
    probe,
  );
}

// ---------- H. Finale: nav fija + rail en 07 ----------
await evl(`document.getElementById('accion').scrollIntoView()`);
await sleep(1800);
const finaleState = await evl(`(() => {
  const nav = document.querySelector('.nav-shell');
  const r = nav?.getBoundingClientRect();
  const active = document.querySelector('.chapter-rail button.is-active span')?.textContent?.trim();
  return {
    navTop: r ? Math.round(r.top) : null,
    navVisible: !!nav && getComputedStyle(nav).visibility !== 'hidden',
    active,
    finaleExists: !!document.getElementById('accion'),
  };
})()`);
check(
  'H1 Finale alcanzable con nav fija y rail 07 activo',
  finaleState?.finaleExists &&
    finaleState?.navVisible &&
    finaleState?.navTop === 0 &&
    /Acción/.test(finaleState?.active || ''),
  finaleState,
);

// ---------- G. Consola limpia ----------
check('G1 sin errores de consola', consoleErrors.length === 0, consoleErrors.slice(0, 4));

console.log('\nRESULTADO: ' + (fail === 0 ? 'PASS' : 'FAIL') + ` (${pass} pass, ${fail} fail)`);
if (fail) console.log('Fallos: ' + failures.join(' · '));

ws.close();
chrome.kill('SIGKILL');
process.exit(fail === 0 ? 0 : 1);
