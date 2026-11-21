// R7b — verificación viva de los fixes R7 (React rewrite).
// Uso: 1) cd app && npm run preview -- --port 4180 --host 127.0.0.1
//      2) node r7b-verify.mjs
// 4 combos: modo claro/oscuro emulado x 1280/820. Capturas en ./r7b-evidence/.
// CDP directo contra Playwright chromium-1255 (sin dependencia de Playwright).
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome';
const CDP_PORT = 9223;
const PROFILE = '/tmp/flare-r7b-profile';
const PAGE_URL = 'http://localhost:4180/';
const OUT = new URL('./r7b-evidence/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail === undefined ? null : detail });
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail !== undefined && detail !== null ? ' :: ' + JSON.stringify(detail) : ''));
}
// --- color: parse rgb()/rgba()/oklch()/oklab() -> {r,g,b,a} (0-255) ---
// Tailwind v4 serializa los colores computados como oklch/oklab, no rgb.
function numsOf(str) {
  const out = []; let cur = '';
  for (const ch of str) {
    if ((ch >= '0' && ch <= '9') || ch === '.' || ch === '-') cur += ch;
    else if (cur !== '') { out.push(parseFloat(cur)); cur = ''; }
  }
  if (cur !== '') out.push(parseFloat(cur));
  return out;
}
function oklchToRgb(L, C, H) {
  const rad = (H * Math.PI) / 180;
  const a = C * Math.cos(rad), b = C * Math.sin(rad);
  return oklabToRgb(L, a, b);
}
function oklabToRgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  const enc = (c) => { c = Math.max(0, Math.min(1, c)); return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; };
  return { r: Math.round(enc(r) * 255), g: Math.round(enc(g) * 255), b: Math.round(enc(bl) * 255) };
}
function parseRgb(str) {
  if (!str) return null;
  if (str.indexOf('oklch(') === 0) {
    const n = numsOf(str);
    if (n.length < 1) return null;
    const c = oklchToRgb(n[0], n.length > 1 ? n[1] : 0, n.length > 2 ? n[2] : 0);
    c.a = n.length > 3 ? n[3] : 1;
    return c;
  }
  if (str.indexOf('oklab(') === 0) {
    const n = numsOf(str);
    if (n.length < 1) return null;
    const c = oklabToRgb(n[0], n.length > 1 ? n[1] : 0, n.length > 2 ? n[2] : 0);
    c.a = n.length > 3 ? n[3] : 1;
    return c;
  }
  const n = numsOf(str);
  if (n.length < 3) return null;
  return { r: n[0], g: n[1], b: n[2], a: n.length > 3 ? n[3] : 1 };
}
function lum(c) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}
function contrast(fg, bg) {
  const a = parseRgb(fg), b = parseRgb(bg);
  if (!a || !b) return null;
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
function blend(fg, bg) {
  const a = parseRgb(fg), b = parseRgb(bg);
  if (!a || !b) return fg;
  if (a.a >= 1) return fg;
  const r = Math.round(a.r * a.a + b.r * (1 - a.a));
  const g = Math.round(a.g * a.a + b.g * (1 - a.a));
  const bl = Math.round(a.b * a.a + b.b * (1 - a.a));
  return 'rgb(' + r + ', ' + g + ', ' + bl + ')';
}

// --- Chrome ---
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage', '--ignore-certificate-errors', `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${PROFILE}`, '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
let target = null;
for (let i = 0; i < 40; i++) {
  await sleep(500);
  try { const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`); const l = await r.json(); target = l.find((t) => t.type === 'page'); if (target) break; } catch {}
}
if (!target) { console.log('NO SE PUDO CONECTAR A CHROME'); process.exit(2); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pending = new Map();
const consoleErrors = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') consoleErrors.push('exception: ' + (m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || ''));
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') consoleErrors.push('console.error: ' + (m.params.args || []).map((a) => a.value ?? a.description ?? '').join(' '));
};
const send = (method, params = {}) => new Promise((res) => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })); });
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) return { __error: r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text || 'eval error' };
  return r.result?.result?.value;
};
const shot = async (name) => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  if (r.result?.data) writeFileSync(OUT + name, Buffer.from(r.result.data, 'base64'));
};
const key = async (type, code, k, vk) => send('Input.dispatchKeyEvent', { type, code, key: k, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
await send('Runtime.enable'); await send('Page.enable');

// Fondo efectivo (camina hacia arriba hasta un bg no transparente).
const EFFBG = `((el) => { let n = el; while (n && n !== document.documentElement) { const bg = getComputedStyle(n).backgroundColor; if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg; n = n.parentElement; } return 'rgb(10, 10, 15)'; })`;

async function run(mode, width) {
  const tag = `${mode}-${width}`;
  consoleErrors.length = 0;
  await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: mode }] });
  await send('Page.navigate', { url: PAGE_URL });
  await sleep(6000);

  // --- 1. Modo oscuro forzado por clase ---
  const darkClass = await ev(`document.documentElement.classList.contains('dark')`);
  check(`${tag} dark-class`, darkClass === true, darkClass);
  const scheme = await ev(`getComputedStyle(document.documentElement).colorScheme`);
  check(`${tag} color-scheme-dark`, typeof scheme === 'string' && scheme.includes('dark'), scheme);

  // --- 2. Hero ---
  const hero = await ev(`(() => {
    const h1 = document.querySelector('h1');
    const tagline = [...document.querySelectorAll('span')].find(s => s.textContent.includes('Atrapa la mirada'));
    const tickers = [...document.querySelectorAll('span')].filter(s => s.className.includes('tabular-nums') && /^\\d+$/.test(s.textContent.trim()));
    const navWrap = [...document.querySelectorAll('div')].find(d => { const cs = getComputedStyle(d); return cs.position === 'fixed' && d.getBoundingClientRect().top <= 8 && d.getBoundingClientRect().height < 120; });
    const nav = navWrap ? [navWrap, ...navWrap.querySelectorAll('*')].find(d => { const bg = getComputedStyle(d).backgroundColor; return bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent'; }) : null;
    const effBg = ${EFFBG};
    return {
      h1: h1 ? h1.textContent.trim() : null,
      h1Color: h1 ? getComputedStyle(h1).color : null,
      h1Bg: h1 ? effBg(h1) : null,
      taglineBg: tagline ? getComputedStyle(tagline).backgroundImage : null,
      tickers: tickers.map(t => ({ txt: t.textContent.trim(), color: getComputedStyle(t).color, bg: effBg(t) })),
      navBg: nav ? getComputedStyle(nav).backgroundColor : null,
      hasLogin: document.body.innerText.includes('Login'),
      no18: !document.body.innerText.includes('17,5 s, no 18 s'),
    };
  })()`);
  if (hero.__error) { check(`${tag} hero-ev`, false, hero.__error); return; }
  check(`${tag} hero-h1`, hero.h1 && hero.h1.includes('El comercial que tu agente puede dirigir.'), hero.h1);
  check(`${tag} tge-legible`, hero.h1Color && contrast(hero.h1Color, hero.h1Bg) >= 4.5, { color: hero.h1Color, bg: hero.h1Bg, ratio: hero.h1Color ? contrast(hero.h1Color, hero.h1Bg) : null });
  check(`${tag} tagline-es-gradiente`, hero.taglineBg && hero.taglineBg.includes('linear-gradient') && hero.taglineBg.includes('255, 176, 32'), hero.taglineBg);
  const tickBad = hero.tickers.filter((t) => contrast(t.color, t.bg) < 4.5);
  check(`${tag} ticker-legible`, hero.tickers.length >= 4 && tickBad.length === 0, { n: hero.tickers.length, bad: tickBad, ratios: hero.tickers.map((t) => contrast(t.color, t.bg)) });
  const navEff = hero.navBg ? blend(hero.navBg, 'rgb(10, 10, 15)') : null;
  const navRgb = navEff ? parseRgb(navEff) : null;
  check(`${tag} nav-pill-oscuro`, !!navRgb && navRgb.r <= 60 && navRgb.g <= 60 && navRgb.b <= 60, hero.navBg);
  check(`${tag} sin-login`, hero.hasLogin === false, hero.hasLogin);
  check(`${tag} sin-18s`, hero.no18 === true, hero.no18);
  await shot(`${tag}-landing.png`);

  // --- 3. Bento h3 + timeline ---
  const landing2 = await ev(`(() => {
    const effBg = ${EFFBG};
    const h3s = [...document.querySelectorAll('h3')].filter(h => h.offsetParent !== null).map(h => ({ txt: h.textContent.trim().slice(0, 40), color: getComputedStyle(h).color, bg: effBg(h) }));
    const sec = [...document.querySelectorAll('section')].find(s => s.textContent.includes('El flujo, paso a paso'));
    const h2 = sec ? [...sec.querySelectorAll('h2')].map(h => h.textContent.trim()) : [];
    const beam = sec ? [...sec.querySelectorAll('div')].find(d => { const bi = getComputedStyle(d).backgroundImage; return bi.includes('gradient') && (bi.includes('255, 176, 32') || bi.includes('255, 90, 60') || bi.includes('139, 92, 246')); }) : null;
    return { h3s, tlBg: sec ? effBg(sec) : null, h2, beam: beam ? getComputedStyle(beam).backgroundImage : null };
  })()`);
  if (landing2.__error) { check(`${tag} landing2-ev`, false, landing2.__error); }
  else {
    const h3Bad = landing2.h3s.filter((h) => contrast(h.color, h.bg) < 4.5);
    check(`${tag} bento-h3-legibles`, landing2.h3s.length > 0 && h3Bad.length === 0, { n: landing2.h3s.length, bad: h3Bad });
    const tlRgb = parseRgb(landing2.tlBg);
    check(`${tag} timeline-bg-oscuro`, !!tlRgb && tlRgb.r <= 40 && tlRgb.g <= 40 && tlRgb.b <= 40, landing2.tlBg);
    check(`${tag} timeline-header-flare`, landing2.h2.includes('El flujo, paso a paso'), landing2.h2);
    check(`${tag} timeline-beam-flare`, !!landing2.beam, landing2.beam);
  }

  // --- 4. Diálogo (MorphingDialog "Ver escenas") ---
  const dlg = await ev(`(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Ver escenas');
    if (!btn) return { found: false };
    btn.scrollIntoView({ block: 'center' });
    btn.click();
    return { found: true };
  })()`);
  await sleep(1500);
  const veil = await ev(`(() => {
    const v = [...document.querySelectorAll('div')].find(d => { const cs = getComputedStyle(d); return cs.position === 'fixed' && typeof d.className === 'string' && d.className.includes('bg-black/60'); });
    return v ? getComputedStyle(v).backgroundColor : null;
  })()`);
  const veilC = parseRgb(veil);
  check(`${tag} dialog-veil-oscuro`, dlg.found === true && !!veilC && veilC.r <= 10 && veilC.g <= 10 && veilC.b <= 10 && Math.abs((veilC.a === undefined ? 1 : veilC.a) - 0.6) < 0.05, { found: dlg.found, veil });
  await key('keyDown', 'Escape', 'Escape', 27); await key('keyUp', 'Escape', 'Escape', 27);
  await sleep(800);

  // --- 5. Footer + chat placeholder ---
  const foot = await ev(`(() => {
    const f = document.querySelector('footer');
    const ta = document.querySelector('#studio textarea');
    return { footer: f ? f.innerText : null, chatPh: ta ? ta.getAttribute('placeholder') : null };
  })()`);
  check(`${tag} footer-es`, foot.footer && foot.footer.includes('Atrapa la mirada. Retén el scroll. Gana el click.'), foot.footer);
  check(`${tag} chat-placeholder-es`, foot.chatPh === 'Escribe un mensaje al agente…', foot.chatPh);

  // --- 6. Studio ---
  await ev(`document.getElementById('studio')?.scrollIntoView()`);
  await sleep(1000);
  // esperar auditoría
  for (let i = 0; i < 16; i++) { const a = await ev(`window.__flareAudit && window.__flareAudit.status`); if (a === 'done') break; await sleep(500); }
  const studio = await ev(`(() => {
    const overflow = [...document.querySelectorAll('#studio div.relative')].map(d => ({ sw: d.scrollWidth, cw: d.clientWidth })).filter(o => o.sw > o.cw + 1);
    const audit = window.__flareAudit || null;
    const ib = document.querySelector('#studio .bg-an-input-background');
    const ibBg = ib ? getComputedStyle(ib).backgroundColor : null;
    const big = [...document.querySelectorAll('#studio p')].find(p => { const t = p.textContent.trim(); return /^\\d+\\/100$/.test(t); });
    const tc = [...document.querySelectorAll('#studio span')].find(s => s.textContent.includes('/ 17.5 s'));
    const cont = [...document.querySelectorAll('#studio div.relative')].find(d => d.style.height === '1240px') || document.querySelector('#studio div.relative');
    const tlWin = document.getElementById('win-timeline');
    const winRight = tlWin && cont ? Math.round(tlWin.getBoundingClientRect().right - cont.getBoundingClientRect().right) : null;
    const pageOverflowX = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    return { overflowDivs: overflow, audit: audit ? { status: audit.status, safePoints: audit.safePoints } : null, retText: document.getElementById('win-retention') ? document.getElementById('win-retention').innerText : null, ibBg, bigScore: big ? big.textContent.trim() : null, time: tc ? tc.textContent.trim() : null, winRight, pageOverflowX };
  })()`);
  if (studio.__error) { check(`${tag} studio-ev`, false, studio.__error); }
  else {
    check(`${tag} studio-sin-overflow`, studio.overflowDivs.length === 0, studio.overflowDivs);
    check(`${tag} studio-audit-100`, studio.audit && studio.audit.status === 'done' && studio.audit.safePoints === 10, studio.audit);
    check(`${tag} studio-sin-fallback`, studio.retText !== null && !studio.retText.includes('sin verificar') && studio.retText.includes('10/10'), studio.retText ? studio.retText.slice(0, 120) : null);
    check(`${tag} chat-input-oscuro`, studio.ibBg && studio.ibBg !== 'rgb(255, 255, 255)', studio.ibBg);
    check(`${tag} studio-score-visible`, studio.bigScore === '100/100', studio.bigScore);
    check(`${tag} studio-tiempo-inicial`, studio.time === '0.0 s / 17.5 s', studio.time);
    check(`${tag} pagina-sin-overflow-x`, studio.pageOverflowX === false, studio.pageOverflowX);
    if (width >= 1100) check(`${tag} timeline-ventana-dentro-contenedor`, studio.winRight !== null && studio.winRight <= 0, studio.winRight);
  }
  await shot(`${tag}-studio.png`);

  // --- 7. Espacio play/pausa ---
  await ev(`document.body.focus()`);
  const t0 = await ev(`(() => { const tc=[...document.querySelectorAll('#studio span')].find(s=>s.textContent.includes('/ 17.5 s')); return tc?tc.textContent:null; })()`);
  await key('keyDown', 'Space', ' ', 32); await key('keyUp', 'Space', ' ', 32);
  await sleep(2500);
  const t1 = await ev(`(() => { const tc=[...document.querySelectorAll('#studio span')].find(s=>s.textContent.includes('/ 17.5 s')); return tc?tc.textContent:null; })()`);
  const num = (t) => { if (!t) return null; let s2 = ''; for (const ch of t) { if ((ch >= '0' && ch <= '9') || ch === '.') s2 += ch; else break; } return s2 ? parseFloat(s2) : null; };
  check(`${tag} espacio-reproduce`, num(t1) !== null && num(t0) !== null && num(t1) > num(t0), { antes: t0, despues: t1 });
  await key('keyDown', 'Space', ' ', 32); await key('keyUp', 'Space', ' ', 32);
  await sleep(1200);
  const t2 = await ev(`(() => { const tc=[...document.querySelectorAll('#studio span')].find(s=>s.textContent.includes('/ 17.5 s')); return tc?tc.textContent:null; })()`);
  check(`${tag} espacio-pausa`, num(t2) !== null && num(t2) === num(t1), { pausaEn: t1, luego: t2 });

  // --- 8. Ir al final y Reiniciar ---
  const goEnd = await ev(`(() => {
    const tl = document.getElementById('win-timeline');
    if (!tl) return { ok: false, why: 'no win-timeline' };
    const lanes = [...tl.querySelectorAll('.flex.gap-1')];
    const capLane = lanes[0];
    if (!capLane || capLane.children.length < 6) return { ok: false, why: 'sin 6 chips', n: capLane ? capLane.children.length : 0 };
    capLane.children[5].click();
    return { ok: true };
  })()`);
  await sleep(500);
  await key('keyDown', 'Space', ' ', 32); await key('keyUp', 'Space', ' ', 32);
  await sleep(4500);
  const tEnd = await ev(`(() => { const tc=[...document.querySelectorAll('#studio span')].find(s=>s.textContent.includes('/ 17.5 s')); return tc?tc.textContent:null; })()`);
  check(`${tag} llega-al-final`, tEnd === '17.5 s / 17.5 s', { goEnd, tEnd });
  const restart = await ev(`(() => {
    const b = [...document.querySelectorAll('#studio button')].find(b => b.getAttribute('aria-label') === 'Reiniciar' || b.textContent.includes('Reiniciar'));
    if (!b) return { found: false };
    b.click();
    return { found: true };
  })()`);
  await sleep(600);
  const tReset = await ev(`(() => { const tc=[...document.querySelectorAll('#studio span')].find(s=>s.textContent.includes('/ 17.5 s')); return tc?tc.textContent:null; })()`);
  check(`${tag} reiniciar-vuelve-a-cero`, restart.found === true && tReset === '0.0 s / 17.5 s', { restart, tReset });

  // --- 9. Consola limpia ---
  check(`${tag} sin-errores-consola`, consoleErrors.length === 0, consoleErrors.slice(0, 3));
}

for (const [mode, width] of [['light', 1280], ['dark', 1280], ['light', 820], ['dark', 820]]) {
  console.log('\n===== ' + mode + ' ' + width + ' =====');
  await run(mode, width);
}

ws.close(); chrome.kill('SIGKILL');
const fails = results.filter((r) => !r.ok);
console.log('\n===== RESUMEN R7b =====');
console.log(`Total: ${results.length} checks, ${results.length - fails.length} PASS, ${fails.length} FAIL`);
for (const f of fails) console.log('  FAIL: ' + f.name + ' :: ' + JSON.stringify(f.detail));
process.exit(fails.length ? 1 : 0);
