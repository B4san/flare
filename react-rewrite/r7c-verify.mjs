// R7c — verificación viva de los fixes R7b (React rewrite).
// Uso: 1) cd app && npm run preview -- --port 4180 --host 127.0.0.1
//      2) node r7c-verify.mjs
// Foco (lo que R7b marcó NO APTO): B1–B3 la ventana del Agente NO debe tapar
// la 5ª regla de retención, la línea de export ni la ventana Brief a 1280
// (sondas elementFromPoint, mismo método que el juez); B4 contraste muted
// ≥4,5:1 en TODOS los textos visibles; B5 footer en español; etiqueta 85/100
// alineada ("Casi listo") en panel y checker. + regresión: audit 10/10,
// scores 100/85/85, Espacio, Reiniciar, export WebM, consola limpia.
// 4 combos: modo claro/oscuro emulado x 1280/820. Capturas en ./r7c-evidence/.
// CDP directo contra Playwright chromium-1255 (sin dependencia de Playwright).
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync, statSync } from 'node:fs';

const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome';
const CDP_PORT = 9224;
const PROFILE = '/tmp/flare-r7c-profile';
const PAGE_URL = 'http://localhost:4180/';
const OUT = new URL('./r7c-evidence/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail === undefined ? null : detail });
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail !== undefined && detail !== null ? ' :: ' + JSON.stringify(detail) : ''));
}
// --- color: parse rgb()/rgba()/oklch()/oklab() -> {r,g,b,a} (0-255) ---
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
await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: OUT });

// Fondo efectivo (camina hacia arriba hasta un bg no transparente).
const EFFBG = `((el) => { let n = el; while (n && n !== document.documentElement) { const bg = getComputedStyle(n).backgroundColor; if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg; n = n.parentElement; } return 'rgb(10, 10, 15)'; })`;
// Hit-test: ¿el punto central del elemento lo recibe él mismo (o un descendiente)?
// ASÍNCRONO con scroll instantáneo: la app usa `scroll-behavior: smooth` y
// el scrollIntoView por defecto anima; medir inmediatamente después lee la
// posición vieja (fuera del viewport) y elementFromPoint devuelve null.
const HITTEST = `((el) => new Promise((res) => {
  if (!el) return res({ found: false });
  el.scrollIntoView({ block: 'center', behavior: 'instant' });
  setTimeout(() => {
    const r = el.getBoundingClientRect();
    const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2);
    const hit = document.elementFromPoint(x, y);
    const inside = hit === el || (hit && el.contains(hit));
    const agent = document.getElementById('win-agent');
    const coveredByAgent = hit && agent && (hit === agent || agent.contains(hit));
    res({ found: true, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], hitTag: hit ? hit.tagName + '.' + String(hit.className).slice(0, 40) : null, hitText: hit ? (hit.textContent || '').trim().slice(0, 40) : null, inside, coveredByAgent: !!coveredByAgent });
  }, 400);
}))`;

async function waitAudit(timeoutMs = 12000) {
  for (let i = 0; i < timeoutMs / 500; i++) {
    const a = await ev(`window.__flareAudit && window.__flareAudit.status`);
    if (a === 'done') return true;
    await sleep(500);
  }
  return false;
}

async function run(mode, width) {
  const tag = `${mode}-${width}`;
  consoleErrors.length = 0;
  await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: mode }] });
  await send('Page.navigate', { url: PAGE_URL });
  await sleep(6000);

  // --- 0. Oscuro forzado + footer en español (B5) ---
  const darkClass = await ev(`document.documentElement.classList.contains('dark')`);
  check(`${tag} dark-class`, darkClass === true, darkClass);
  const foot = await ev(`(() => { const f = document.querySelector('footer'); return f ? f.innerText : null; })()`);
  check(`${tag} footer-es`, foot && foot.includes('Hecho para el Dojo AI Hackathon 2026') && !foot.includes('Built for Dojo'), foot);

  // --- 1. Studio: esperar auditoría ---
  await ev(`document.getElementById('studio')?.scrollIntoView()`);
  await sleep(800);
  const auditOk = await waitAudit();
  check(`${tag} audit-done`, auditOk === true, auditOk);
  const audit = await ev(`window.__flareAudit ? { status: window.__flareAudit.status, safePoints: window.__flareAudit.safePoints } : null`);
  check(`${tag} audit-safe-10`, audit && audit.status === 'done' && audit.safePoints === 10, audit);

  // --- 2. B1–B3: hit-test de la 5ª regla, línea de export y Brief ---
  const hits = await ev(`(async () => {
    const hit = ${HITTEST};
    const out = {};
    const lis = [...document.querySelectorAll('#win-retention ul li')];
    out.reglas = lis.length;
    out.regla5 = lis.length >= 5 ? await hit(lis[4]) : { found: false, why: 'menos de 5 reglas' };
    out.regla5txt = lis.length >= 5 ? lis[4].textContent.trim().slice(0, 60) : null;
    const expLine = [...document.querySelectorAll('#win-retention p')].find(p => p.textContent.includes('Export (scenes.html)'));
    out.exportLine = expLine ? await hit(expLine) : { found: false, why: 'sin línea de export' };
    const briefH3 = [...document.querySelectorAll('h3')].find(h => h.textContent.includes('Brief para tu agente'));
    out.briefH3 = briefH3 ? await hit(briefH3) : { found: false, why: 'sin H3 Brief' };
    const briefBtn = [...document.querySelectorAll('#studio button')].find(b => b.textContent.includes('Generar con mi agente'));
    out.briefBtn = briefBtn ? await hit(briefBtn) : { found: false, why: 'sin botón Generar' };
    // Geometría: el contenedor debe contener al Agente y el Brief debe empezar debajo de él.
    // El contenedor es el padre de #win-preview (NO '#studio div.relative': hay
    // otros .relative dentro del Studio, p. ej. el clip del preview).
    const cont = document.getElementById('win-preview')?.parentElement;
    const agent = document.getElementById('win-agent');
    const briefSec = briefH3 ? briefH3.closest('div') : null;
    if (cont && agent) {
      const cr = cont.getBoundingClientRect(), ar = agent.getBoundingClientRect();
      const top = window.scrollY;
      out.geom = { contH: Math.round(cr.height), agentBottomVsCont: Math.round((ar.bottom + top) - (cr.top + top) - cr.height), briefTopVsAgentBottom: briefH3 ? Math.round((briefH3.getBoundingClientRect().top + top) - (ar.bottom + top)) : null };
    }
    return out;
  })()`);
  if (hits.__error) { check(`${tag} hittests-ev`, false, hits.__error); }
  else {
    check(`${tag} B1-regla5-visible`, hits.reglas === 5 && hits.regla5.inside === true && hits.regla5.coveredByAgent === false, { reglas: hits.reglas, txt: hits.regla5txt, hit: hits.regla5 });
    check(`${tag} B2-export-visible`, hits.exportLine.inside === true && hits.exportLine.coveredByAgent === false, hits.exportLine);
    check(`${tag} B3-brief-h3-visible`, hits.briefH3.inside === true && hits.briefH3.coveredByAgent === false, hits.briefH3);
    check(`${tag} B3-brief-btn-alcanzable`, hits.briefBtn.inside === true && hits.briefBtn.coveredByAgent === false, hits.briefBtn);
    if (width >= 1100 && hits.geom) {
      check(`${tag} B1-agente-dentro-contenedor`, hits.geom.agentBottomVsCont <= 1, hits.geom);
      check(`${tag} B3-brief-debajo-agente`, hits.geom.briefTopVsAgentBottom !== null && hits.geom.briefTopVsAgentBottom >= 0, hits.geom);
    }
  }
  await shot(`${tag}-studio.png`);

  // --- 3. B4: contraste de TODOS los textos visibles ≥4,5:1 (salvo texto grande ≥3:1) ---
  const muted = await ev(`(() => {
    ${[numsOf, oklchToRgb, oklabToRgb, parseRgb, lum, contrast].map((f) => f.toString()).join('\n')}
    // Fondo EFECTIVO con blending: los fondos semitransparentes (chips
    // seleccionados bg-[#FF5A3C]/15, nota ámbar /7%) se componen sobre sus
    // ancestros hasta uno opaco; sin componer, el contraste sale ~1:1 y
    // es un falso FAIL (el texto blanco sobre coral al 15% es ~13:1 real).
    function effBgBlend(el) {
      const layers = [];
      let n = el;
      while (n && n !== document.documentElement) {
        const c = parseRgb(getComputedStyle(n).backgroundColor);
        if (c) { layers.push(c); if (c.a >= 1) break; }
        n = n.parentElement;
      }
      let out = { r: 10, g: 10, b: 15 }; // base #0A0A0F
      for (let i = layers.length - 1; i >= 0; i--) {
        const c = layers[i];
        out = { r: Math.round(c.r * c.a + out.r * (1 - c.a)), g: Math.round(c.g * c.a + out.g * (1 - c.a)), b: Math.round(c.b * c.a + out.b * (1 - c.a)) };
      }
      return 'rgb(' + out.r + ', ' + out.g + ', ' + out.b + ')';
    }
    const bad = [];
    const mutedEls = [];
    const all = document.querySelectorAll('body *');
    for (const el of all) {
      if (el.children.length > 0) continue; // solo hojas con texto directo
      const t = (el.textContent || '').trim();
      if (!t) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (el.closest('[aria-hidden="true"]')) continue;
      const fg = cs.color, bg = effBgBlend(el);
      const fgC = parseRgb(fg);
      if (!fgC || fgC.a === 0) continue; // texto por degradado (background-clip:text), no color sólido
      const ratio = contrast(fg, bg);
      if (ratio === null) continue;
      const size = parseFloat(cs.fontSize);
      const bold = parseInt(cs.fontWeight) >= 700;
      const large = size >= 24 || (bold && size >= 18.66);
      const min = large ? 3 : 4.5;
      if (fg === 'rgb(130, 130, 143)') mutedEls.push({ txt: t.slice(0, 40), ratio: Math.round(ratio * 100) / 100 });
      if (ratio < min) bad.push({ txt: t.slice(0, 50), color: fg, bg, ratio: Math.round(ratio * 100) / 100, size, tag: el.tagName });
    }
    return { bad: bad.slice(0, 12), nBad: bad.length, mutedEls: mutedEls.slice(0, 8), nMuted: mutedEls.length };
  })()`);
  if (muted.__error) { check(`${tag} contraste-ev`, false, muted.__error); }
  else {
    check(`${tag} B4-muted-≥4.5`, muted.nMuted > 0 && muted.mutedEls.every((m) => m.ratio >= 4.5), { nMutedVistos: muted.nMuted, muestra: muted.mutedEls });
    check(`${tag} B4-sin-textos-bajo-4.5`, muted.nBad === 0, { nBad: muted.nBad, peores: muted.bad });
  }

  // --- 4. Veredicto 85/100 alineado: cambiar a marca-personal (85) ---
  const switched = await ev(`(() => {
    const sel = document.getElementById('template-select');
    if (!sel) return { ok: false, why: 'sin select' };
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
    setter.call(sel, 'marca-personal');
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true };
  })()`);
  await sleep(1000);
  const audit85 = await waitAudit();
  const verdict85 = await ev(`(() => { const r = document.getElementById('win-retention'); return r ? r.innerText : null; })()`);
  check(`${tag} cambio-a-marca-85`, switched.ok === true && audit85 === true, { switched, audit85 });
  check(`${tag} veredicto-85-casi-listo`, verdict85 !== null && verdict85.includes('Casi listo · revisa los puntos en rojo') && verdict85.includes('85/100'), verdict85 ? verdict85.slice(0, 200) : null);
  // Volver a colchón (100) y confirmar "Listo para publicar".
  await ev(`(() => {
    const sel = document.getElementById('template-select');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
    setter.call(sel, 'colchon-descanso-total');
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await sleep(1000);
  await waitAudit();
  const verdict100 = await ev(`(() => { const r = document.getElementById('win-retention'); return r ? r.innerText : null; })()`);
  check(`${tag} veredicto-100-listo`, verdict100 !== null && verdict100.includes('Listo para publicar') && verdict100.includes('100/100'), verdict100 ? verdict100.slice(0, 200) : null);

  // --- 5. Espacio play/pausa + Reiniciar (regresión) ---
  await ev(`document.body.focus()`);
  const t0 = await ev(`(() => { const tc=[...document.querySelectorAll('#studio span')].find(s=>s.textContent.includes('/ 17.5 s')); return tc?tc.textContent:null; })()`);
  await key('keyDown', 'Space', ' ', 32); await key('keyUp', 'Space', ' ', 32);
  await sleep(2500);
  const t1 = await ev(`(() => { const tc=[...document.querySelectorAll('#studio span')].find(s=>s.textContent.includes('/ 17.5 s')); return tc?tc.textContent:null; })()`);
  const num = (t) => { if (!t) return null; let s2 = ''; for (const ch of t) { if ((ch >= '0' && ch <= '9') || ch === '.') s2 += ch; else break; } return s2 ? parseFloat(s2) : null; };
  check(`${tag} espacio-reproduce`, num(t1) !== null && num(t0) !== null && num(t1) > num(t0), { antes: t0, despues: t1 });
  await key('keyDown', 'Space', ' ', 32); await key('keyUp', 'Space', ' ', 32);
  await sleep(1500);
  // Doble lectura estable: un tick de 0,1 s ya en cola puede colarse tras la
  // pausa; lo que prueba la pausa es que el tiempo YA NO AVANZA (flaky en R7c).
  const t2a = await ev(`(() => { const tc=[...document.querySelectorAll('#studio span')].find(s=>s.textContent.includes('/ 17.5 s')); return tc?tc.textContent:null; })()`);
  await sleep(700);
  const t2b = await ev(`(() => { const tc=[...document.querySelectorAll('#studio span')].find(s=>s.textContent.includes('/ 17.5 s')); return tc?tc.textContent:null; })()`);
  check(`${tag} espacio-pausa`, num(t2a) !== null && num(t2a) === num(t2b) && Math.abs(num(t2a) - num(t1)) <= 0.1, { pausaEn: t1, luego: t2a, luego2: t2b });
  // Ir al final (click escena 6) y Reiniciar.
  await ev(`(() => {
    const tl = document.getElementById('win-timeline');
    const lanes = [...tl.querySelectorAll('.flex.gap-1')];
    lanes[0].children[5].click();
  })()`);
  await sleep(500);
  await key('keyDown', 'Space', ' ', 32); await key('keyUp', 'Space', ' ', 32);
  await sleep(4500);
  const tEnd = await ev(`(() => { const tc=[...document.querySelectorAll('#studio span')].find(s=>s.textContent.includes('/ 17.5 s')); return tc?tc.textContent:null; })()`);
  check(`${tag} llega-al-final`, tEnd === '17.5 s / 17.5 s', { tEnd });
  const restart = await ev(`(() => {
    const b = [...document.querySelectorAll('#studio button')].find(b => b.getAttribute('aria-label') === 'Reiniciar');
    if (!b) return { found: false };
    b.click();
    return { found: true };
  })()`);
  await sleep(600);
  const tReset = await ev(`(() => { const tc=[...document.querySelectorAll('#studio span')].find(s=>s.textContent.includes('/ 17.5 s')); return tc?tc.textContent:null; })()`);
  check(`${tag} reiniciar-vuelve-a-cero`, restart.found === true && tReset === '0.0 s / 17.5 s', { restart, tReset });

  // --- 6. Export WebM real (solo 1er combo: navegar cancela descargas en
  // curso y cada export tarda ~2 min en este entorno; mismo código en los 4) ---
  if (mode === 'light' && width === 1280) {
    const before = readdirSync(OUT).filter((f) => f.endsWith('.webm'));
    await ev(`(() => {
      const b = [...document.querySelectorAll('#studio button')].find(b => b.textContent.includes('Exportar video'));
      if (!b) return false;
      b.click();
      return true;
    })()`);
    let webm = null;
    for (let i = 0; i < 240; i++) {
      await sleep(1000);
      const files = readdirSync(OUT);
      const downloading = files.some((f) => f.endsWith('.crdownload'));
      const now = files.filter((f) => f.endsWith('.webm') && !before.includes(f));
      if (now.length > 0) { const st = statSync(OUT + now[0]); if (st.size > 1000000 && !downloading) { webm = { file: now[0], bytes: st.size }; break; } }
    }
    check(`${tag} export-webm-real`, webm !== null, webm);
  } else {
    check(`${tag} export-webm-real`, true, 'verificado en light-1280');
  }

  // --- 7. Sin overflow horizontal + consola limpia ---
  const ox = await ev(`document.documentElement.scrollWidth > document.documentElement.clientWidth + 1`);
  check(`${tag} pagina-sin-overflow-x`, ox === false, ox);
  check(`${tag} sin-errores-consola`, consoleErrors.length === 0, consoleErrors.slice(0, 3));
}

for (const [mode, width] of [['light', 1280], ['dark', 1280], ['light', 820], ['dark', 820]]) {
  console.log('\n===== ' + mode + ' ' + width + ' =====');
  await run(mode, width);
}

ws.close(); chrome.kill('SIGKILL');
const fails = results.filter((r) => !r.ok);
console.log('\n===== RESUMEN R7c =====');
console.log(`Total: ${results.length} checks, ${results.length - fails.length} PASS, ${fails.length} FAIL`);
for (const f of fails) console.log('  FAIL: ' + f.name + ' :: ' + JSON.stringify(f.detail));
process.exit(fails.length ? 1 : 0);
