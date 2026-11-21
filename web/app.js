/* Flare — app.js
   Studio agent-native sin backend. Vanilla JS + GSAP (CDN).
   Contrato de escenas: <div data-composition-id data-width data-height data-duration>,
   clips .clip[data-start][data-duration][data-track-index],
   captions .caption[data-start][data-duration], CTA final .cta.
   Expone window.__flareSeek(t) y window.__flareDuration
   (window.__hookframeSeek sigue disponible como alias). */
'use strict';

const $ = (s, c) => (c || document).querySelector(s);
const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
const hasGsap = typeof window.gsap !== 'undefined';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fmtT = (t) => t.toFixed(1) + ' s';

/* ================= DATOS: PLANTILLAS ================= */
/* Plantillas = los 3 ejemplos reales de examples/ (misma fuente que meta.json).
   EMBEDDED_TEMPLATES es el fallback si el fetch falla (p. ej. file://).
   DECISIÓN R3 (m-c / B1): el fallback embebido NO lleva HTML, así que la
   safe zone no se puede derivar de la posición real y NO se afirma
   (safe:false en todas las escenas = criterio conservador, igual que el
   renderer cuando no puede verificar: nunca regalar el 10). En file:// el
   score honesto es 75/100 hasta servir el proyecto por HTTP, donde
   loadRealTemplates sustituye estas plantillas por las reales (85/100).
   El fallback solo existe para que la página no quede vacía sin servidor. */
const EMBEDDED_TEMPLATES = {
  'colchon-descanso-total': {
    "id": "colchon-descanso-total",
    "name": "Descanso Total",
    "product": "Descanso Total",
    "productLine": "Descanso Total · colchón de descanso",
    "format": "9:16",
    "width": 1080,
    "height": 1920,
    "scenes": [
      {
        "name": "Hook: ¿Dormiste mal otra vez?",
        "start": 0,
        "duration": 2.5,
        "tone": "tone-dark",
        "motion": true,
        "safe": false,
        "kicker": "Descanso Total",
        "headline": "¿Dormiste mal otra vez?",
        "headlineHl": "otra vez?",
        "sub": "Otra noche en vela, otra mañana agotada.",
        "visualKind": "moon",
        "caption": "Dormir mal se paga todo el día.",
        "captionDuration": 2.5
      },
      {
        "name": "Dolor: levantarse cansado",
        "start": 2.5,
        "duration": 3,
        "tone": "tone-pink",
        "motion": true,
        "safe": false,
        "kicker": "El problema",
        "headline": "Te levantas cansado.",
        "headlineHl": "cansado.",
        "sub": "Con la espalda rota, todos los días.",
        "visualKind": "zzz",
        "caption": "El colchón viejo ya no te deja descansar.",
        "captionDuration": 3
      },
      {
        "name": "Producto: llegó Descanso Total",
        "start": 5.5,
        "duration": 3,
        "tone": "tone-violet",
        "motion": true,
        "safe": false,
        "kicker": "Descanso Total",
        "headline": "Llegó Descanso Total",
        "headlineHl": "Descanso Total",
        "sub": "La cama que por fin te deja dormir.",
        "visualKind": "bed",
        "caption": "Un descanso pensado para tu espalda.",
        "captionDuration": 3
      },
      {
        "name": "Beneficio: soporte y frescura",
        "start": 8.5,
        "duration": 3,
        "tone": "tone-cyan",
        "motion": true,
        "safe": false,
        "kicker": "Beneficio",
        "headline": "Soporte firme, frescura total.",
        "headlineHl": "frescura total.",
        "sub": "Firme donde hace falta, fresco toda la noche.",
        "visualKind": "breeze",
        "caption": "Duerme fresco, despierta entero.",
        "captionDuration": 3
      },
      {
        "name": "Resultado: despierta renovado",
        "start": 11.5,
        "duration": 3,
        "tone": "tone-violet",
        "motion": true,
        "safe": false,
        "kicker": "Resultado",
        "headline": "Despierta renovado.",
        "headlineHl": "renovado.",
        "sub": "Mañanas con energía, desde la primera noche.",
        "visualKind": "sun",
        "caption": "El amanecer se siente distinto.",
        "captionDuration": 3
      },
      {
        "name": "CTA: Descúbrelo hoy",
        "start": 14.5,
        "duration": 3,
        "tone": "tone-violet",
        "motion": true,
        "safe": false,
        "kicker": "Descanso Total",
        "headline": "Descúbrelo hoy",
        "headlineHl": "hoy",
        "sub": "Duerme mejor desde hoy.",
        "midline": "Soporte firme, frescura total.",
        "midChips": ["✓ Soporte firme", "✓ Frescura total", "✓ Despierta renovado"],
        "visualKind": "badge",
        "caption": "Tu mejor noche empieza hoy.",
        "captionDuration": 3,
        "isCTA": true,
        "ctaLabel": "Descúbrelo hoy"
      }
    ]
  },
  'marca-personal': {
    "id": "marca-personal",
    "name": "De cero a builder",
    "product": "Alex Rivera",
    "productLine": "Alex Rivera · builder que construye en público",
    "format": "1:1",
    "width": 1080,
    "height": 1080,
    "scenes": [
      {
        "name": "Hook: ¿Y si nadie ve tu trabajo?",
        "start": 0,
        "duration": 3,
        "tone": "tone-dark",
        "motion": true,
        "safe": false,
        "kicker": "Antes",
        "headline": "¿Y si nadie ve tu trabajo?",
        "headlineHl": "nadie ve",
        "sub": "Publicas y no pasa nada. Otra vez.",
        "visualKind": "search",
        "caption": "Tu trabajo merece ser visto.",
        "captionDuration": 3
      },
      {
        "name": "Antes: cero alcance",
        "start": 3,
        "duration": 3,
        "tone": "tone-pink",
        "motion": true,
        "safe": false,
        "kicker": "Antes",
        "headline": "Ideas buenas, cero alcance.",
        "headlineHl": "cero alcance.",
        "sub": "Publicar y que no pase nada.",
        "visualKind": "chart-down",
        "caption": "Buenas ideas, alcance en cero.",
        "captionDuration": 3
      },
      {
        "name": "Giro: construir en público",
        "start": 6,
        "duration": 3,
        "tone": "tone-violet",
        "motion": true,
        "safe": false,
        "kicker": "El giro",
        "headline": "El giro: construir en público",
        "headlineHl": "construir en público",
        "sub": "Un proyecto. Un post al día. Sin humo.",
        "visualKind": "layers",
        "caption": "Construir en público cambia el alcance.",
        "captionDuration": 3
      },
      {
        "name": "Después: otro sistema",
        "start": 9,
        "duration": 3,
        "tone": "tone-cyan",
        "motion": true,
        "safe": false,
        "kicker": "Después",
        "headline": "La misma persona. Otro sistema.",
        "headlineHl": "Otro sistema.",
        "sub": "El alcance sube sin cambiar quién eres.",
        "visualKind": "chart-up",
        "caption": "El mismo trabajo, con un sistema detrás.",
        "captionDuration": 3
      },
      {
        "name": "CTA: sígueme y construyamos",
        "start": 12,
        "duration": 3,
        "tone": "tone-violet",
        "motion": true,
        "safe": false,
        "kicker": "Alex Rivera · builder",
        "headline": "Sígueme y construyamos",
        "headlineHl": "construyamos",
        "sub": "Un proyecto a la vez.",
        "midline": "Un proyecto. Un post al día.",
        "midChips": ["Un proyecto", "Un post al día", "Sin humo"],
        "visualKind": "avatar",
        "caption": "Sigue el proyecto, paso a paso.",
        "captionDuration": 3,
        "isCTA": true,
        "ctaLabel": "Sígueme y construyamos"
      }
    ]
  },
  'saas-presentacion': {
    "id": "saas-presentacion",
    "name": "Gestión Simple",
    "product": "Gestión Simple",
    "productLine": "Gestión Simple · ventas, inventario y facturación en una pantalla",
    "format": "16:9",
    "width": 1920,
    "height": 1080,
    "scenes": [
      {
        "name": "Hook: ¿pierdes horas en papeleo?",
        "start": 0,
        "duration": 3,
        "tone": "tone-dark",
        "motion": true,
        "safe": false,
        "kicker": "Gestión Simple",
        "headline": "¿Tu pyme pierde horas en papeleo?",
        "headlineHl": "papeleo?",
        "sub": "Facturas, inventario y clientes… en mil hojas distintas.",
        "visualKind": "paper",
        "caption": "El papeleo se come tu semana.",
        "captionDuration": 3
      },
      {
        "name": "Dolor: 11 horas a la semana",
        "start": 3,
        "duration": 3,
        "tone": "tone-pink",
        "motion": true,
        "safe": false,
        "kicker": "El dolor",
        "headline": "11 horas a la semana.",
        "headlineHl": "11 horas",
        "sub": "Se van en tareas que una app hace sola.",
        "visualKind": "clock",
        "caption": "Once horas cada semana, en tareas repetidas.",
        "captionDuration": 3
      },
      {
        "name": "Producto: Gestión Simple",
        "start": 6,
        "duration": 3,
        "tone": "tone-violet",
        "motion": true,
        "safe": false,
        "kicker": "El producto",
        "headline": "Gestión Simple",
        "headlineHl": "Gestión Simple",
        "sub": "Todo tu negocio en una sola pantalla.",
        "visualKind": "screen",
        "caption": "Ventas, inventario y facturas en un solo lugar.",
        "captionDuration": 3
      },
      {
        "name": "Demo 1: panel de ventas",
        "start": 9,
        "duration": 3,
        "tone": "tone-cyan",
        "motion": true,
        "safe": false,
        "kicker": "Demo 1 · Ventas",
        "headline": "Ventas en tiempo real.",
        "headlineHl": "tiempo real.",
        "sub": "Tu panel de ventas, siempre al día.",
        "visualKind": "screen",
        "caption": "Tus ventas, sin hojas de cálculo.",
        "captionDuration": 3
      },
      {
        "name": "Demo 2: inventario al día",
        "start": 12,
        "duration": 3,
        "tone": "tone-violet",
        "motion": true,
        "safe": false,
        "kicker": "Demo 2 · Inventario",
        "headline": "Inventario al día.",
        "headlineHl": "al día.",
        "sub": "Alertas antes de quedarte sin producto.",
        "visualKind": "boxes",
        "caption": "Sin quiebres, sin sorpresas de stock.",
        "captionDuration": 3
      },
      {
        "name": "Demo 3: factura en 10 segundos",
        "start": 15,
        "duration": 3,
        "tone": "tone-cyan",
        "motion": true,
        "safe": false,
        "kicker": "Demo 3 · Facturación",
        "headline": "Factura en 10 segundos.",
        "headlineHl": "10 segundos.",
        "sub": "Cliente, productos, enviar. Y listo.",
        "visualKind": "receipt",
        "caption": "Factura electrónica, sin errores.",
        "captionDuration": 3
      },
      {
        "name": "Beneficio: menos papeleo, más ventas",
        "start": 18,
        "duration": 3,
        "tone": "tone-violet",
        "motion": true,
        "safe": false,
        "kicker": "Beneficio",
        "headline": "Menos papeleo. Más ventas.",
        "headlineHl": "Más ventas.",
        "sub": "El papeleo se hace solo; tú vendes.",
        "visualKind": "check",
        "caption": "Menos papeleo, más tiempo para vender.",
        "captionDuration": 3
      },
      {
        "name": "CTA: prueba gratis 14 días",
        "start": 21,
        "duration": 3,
        "tone": "tone-cyan",
        "motion": true,
        "safe": false,
        "kicker": "Gestión Simple",
        "headline": "Prueba gratis 14 días",
        "headlineHl": "14 días",
        "sub": "Sin tarjeta. Cancela cuando quieras.",
        "midline": "Todo en una sola pantalla.",
        "midChips": ["Ventas", "Inventario", "Facturación"],
        "visualKind": "badge",
        "caption": "Empieza hoy, en minutos.",
        "captionDuration": 3,
        "isCTA": true,
        "ctaLabel": "Prueba gratis 14 días"
      }
    ]
  }
};

const TEMPLATE_SLUGS = ['colchon-descanso-total', 'marca-personal', 'saas-presentacion'];
let TEMPLATES = EMBEDDED_TEMPLATES; // se sustituye por los meta.json reales cuando el fetch funciona
/* ================= SAFE ZONES POR POSICIÓN REAL (B1 R2) =================
   El scorer web NO puede confiar en el flag `meta.safe`: un meta con
   safe=true y un caption con bottom:0% en el HTML real puntuaba 10/10
   en web y 0/10 en renderer/skill. Replica del criterio de
   renderer/lib/score.js (parsePosition/assessElementSafe) y de
   skills/examples-check.mjs (cssRules): se lee la posición vertical
   declarada (top/bottom, en % o px) del estilo inline del elemento y,
   si no la declara, de su regla CSS .caption/.cta (inline manda, la
   última declaración gana). Un elemento está DENTRO si todos sus
   anclajes verticales declarados están a >= 10% del borde; está FUERA
   si algún anclaje está a < 10%; y si NO declara ningún anclaje
   vertical, su posición no se puede determinar y se cuenta como FUERA
   (criterio conservador: el scorer nunca regala el 10 por no poder
   verificarlo). */
const SAFE_MARGIN_PCT = 10;
function parsePosition(styleText) {
  const out = { top: null, bottom: null };
  for (const prop of ['top', 'bottom']) {
    const re = new RegExp('(?:^|;)\\s*' + prop + '\\s*:\\s*([\\d.]+)\\s*(%|px)?', 'gi');
    let m;
    while ((m = re.exec(styleText || '')) !== null) {
      out[prop] = { value: Number(m[1]), unit: m[2] || (Number(m[1]) === 0 ? '%' : 'px') };
    }
  }
  return out;
}
function assessElementSafe(styleText, height) {
  const pos = parsePosition(styleText);
  if (!pos.top && !pos.bottom) return 'unknown';
  for (const anchor of [pos.top, pos.bottom]) {
    if (!anchor) continue;
    const pct = anchor.unit === '%' ? anchor.value : (height ? (anchor.value / height) * 100 : null);
    if (pct === null) return 'unknown';
    if (pct < SAFE_MARGIN_PCT) return 'outside';
  }
  return 'inside';
}
function cssRulesFromHtml(html) {
  const rules = { caption: '', cta: '' };
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    for (const r of m[1].matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (/(^|[^\w-])\.caption([^\w-]|$)/.test(r[1])) rules.caption += r[2] + ';';
      if (/(^|[^\w-])\.cta([^\w-]|$)/.test(r[1])) rules.cta += r[2] + ';';
    }
  }
  return rules;
}
/* Devuelve, por índice de escena, si su caption y su CTA están dentro de
   la safe zone según el HTML real. null si el HTML no se pudo parsear
   (entonces se usa el flag como fallback). Cada entrada es
   { cap: true|false|null, cta: true|false|null }:
   - null = no hay elemento de ese tipo en el HTML para esa escena: NO es
     un elemento que puntuar (igual que renderer/lib/score.js, que solo
     puntúa los .caption/.cta presentes; un caption ausente ya penaliza
     en cobertura, no se vuelve a penalizar en safe).
   - El caption y el CTA son elementos INDEPENDIENTES: que falte el
     caption no condena al CTA (probe cap60: la escena CTA no tiene
     caption en el HTML —captionDuration 0— pero su .cta sí está dentro,
     así que el CTA cuenta como dentro y el safe es 10/10).
   Los .caption/.cta se buscan GLOBALMENTE en #stage y se asocian a la
   escena por data-start coincidente — formato válido del contrato
   (SKILL.md §3.1, §3.3: caption como elemento independiente) y el que
   recoge renderer/lib/parse.js (que los recoge globalmente, no dentro
   del clip). Solo como fallback se busca dentro del clip de la escena
   (formato de los 3 ejemplos honestos, donde el caption vive dentro del
   clip). */
function deriveSafeFromScenesHtml(html, meta) {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const clips = Array.from(doc.querySelectorAll('.clip'));
    if (!clips.length) return null;
    const rules = cssRulesFromHtml(html);
    const height = Number(meta.height) || null;
    // Índice global por data-start (primera ocurrencia gana): así un
    // caption hermano de los clips se asocia a su escena, no a otra.
    const indexByStart = (sel) => {
      const map = new Map();
      for (const el of doc.querySelectorAll(sel)) {
        const st = Number(el.getAttribute('data-start'));
        if (!Number.isNaN(st) && !map.has(st)) map.set(st, el);
      }
      return map;
    };
    const capsByStart = indexByStart('.caption');
    const ctasByStart = indexByStart('.cta');
    const findEl = (map, clip, sel, sceneStart) =>
      map.get(Number(sceneStart)) || (clip ? clip.querySelector(sel) : null) || null;
    const assess = (el, kind) => el
      ? assessElementSafe(rules[kind] + ';' + (el.getAttribute('style') || ''), height) === 'inside'
      : null;
    return (meta.scenes || []).map((s, i) => {
      const clip = clips[i] || null;
      return {
        cap: assess(findEl(capsByStart, clip, '.caption', s.start), 'caption'),
        cta: s.isCTA ? assess(findEl(ctasByStart, clip, '.cta', s.start), 'cta') : null,
      };
    });
  } catch (e) { return null; }
}
/* Safe del CTA de una escena: campo propio (ctaSafe) cuando se derivó del
   HTML; si no existe (fallback embebido, estado guardado antiguo), el
   flag general de la escena — el comportamiento anterior. */
function ctaSafeOf(s) {
  return (s && s.ctaSafe != null) ? s.ctaSafe : (s ? s.safe : null);
}
function templateFromMeta(meta, safeByScene) {
  return {
    id: meta.slug, name: meta.name || meta.title, product: meta.product || '',
    productLine: meta.productLine || meta.title,
    format: meta.format, width: meta.width, height: meta.height,
    scenes: (meta.scenes || []).map((s, i) => ({
      name: s.name, start: Number(s.start), duration: Number(s.duration),
      tone: s.tone || 'tone-violet', motion: s.motion !== false,
      // Posición real derivada de scenes.html cuando se pudo leer; si no,
      // el flag meta.safe como fallback (se anota en el log, ver abajo).
      // safeByScene[i] es { cap, cta } (null = sin elemento en el HTML);
      // el CTA tiene su propio campo para no condenarlo si falta el caption.
      safe: safeByScene ? safeByScene[i].cap : s.safe !== false,
      ctaSafe: safeByScene ? safeByScene[i].cta : s.safe !== false,
      kicker: s.kicker || '', headline: s.headline || '', headlineHl: s.headlineHl || '',
      sub: s.sub || '', visualKind: s.visualKind || '',
      midline: s.midline || '', // tagline de la zona media, solo en la escena CTA
      midChips: Array.isArray(s.midChips) ? s.midChips : [], // chips de la zona media (R4), solo en la escena CTA
      caption: s.caption || '', captionDuration: Number(s.captionDuration != null ? s.captionDuration : s.duration),
      isCTA: !!s.isCTA, ctaLabel: s.ctaLabel || ''
    }))
  };
}
async function loadRealTemplates() {
  try {
    const results = await Promise.all(TEMPLATE_SLUGS.map(async (slug) => {
      const res = await fetch('../examples/' + slug + '/meta.json', { cache: 'no-store' });
      if (!res.ok) return null;
      const meta = await res.json();
      // Safe zones por posición REAL: se lee también scenes.html y se
      // deriva el safe de cada escena desde ahí, no del flag.
      let safeByScene = null;
      try {
        const sres = await fetch('../examples/' + slug + '/scenes.html', { cache: 'no-store' });
        if (!sres.ok) throw new Error('HTTP ' + sres.status);
        safeByScene = deriveSafeFromScenesHtml(await sres.text(), meta);
        if (!safeByScene) throw new Error('sin clips parseables');
      } catch (e) {
        // Fallback al flag meta.safe, anotado en el log del agente.
        logLine('warn', 'No se pudo verificar la safe zone de «' + (meta.name || slug) + '» desde scenes.html (' + e.message + '): uso el flag meta.safe como fallback.', 'SAFE');
      }
      return templateFromMeta(meta, safeByScene);
    }));
    const loaded = {};
    let ok = false;
    results.forEach((t, i) => { if (t) { loaded[TEMPLATE_SLUGS[i]] = t; ok = true; } });
    if (ok) TEMPLATES = Object.assign({}, EMBEDDED_TEMPLATES, loaded);
  } catch (e) {
    // Sin servidor (file://): se usa el fallback embebido, cuya safe zone
    // NO está verificada (safe:false conservador, ver EMBEDDED_TEMPLATES):
    // el score baja a 75/100 hasta servir el proyecto por HTTP.
    logLine('warn', 'Sin servidor (file://): uso las plantillas embebidas sin verificar — la safe zone no se puede derivar del HTML y puntúa conservadoramente (Safe 0/10) hasta servir el proyecto por HTTP.', 'SAFE');
  }
}

/* ================= DATOS: AGENTES ================= */
const AGENTS = {
  'claude-code': { name: 'Claude Code', initial: 'C', color: '#8B5CF6',
    command: 'claude "/flare:build --brief brief.md"',
    sub: 'Skill flare · lista para construir' },
  'codex': { name: 'Codex', initial: 'X', color: '#10B981',
    command: 'codex exec --skill flare "Genera el anuncio desde brief.md"',
    sub: 'Skill flare · lista para construir' },
  'cursor': { name: 'Cursor', initial: 'Cu', color: '#FF5A3C',
    command: 'cursor --agent flare --brief brief.md',
    sub: 'Agente flare · abre Cursor y ejecuta' },
  'gemini-cli': { name: 'Gemini CLI', initial: 'G', color: '#60A5FA',
    command: 'gemini -p "Usa la skill flare para generar este anuncio desde brief.md"',
    sub: 'Skill flare · lista para construir' },
  'opencode': { name: 'OpenCode', initial: 'O', color: '#F59E0B',
    command: 'opencode run --skill flare "Genera el anuncio desde brief.md"',
    sub: 'Skill flare · lista para construir' },
  'qwen-code': { name: 'Qwen Code', initial: 'Q', color: '#FFB020',
    command: 'qwen "/flare:build --brief brief.md"',
    sub: 'Skill flare · lista para construir' }
};

const FORMATS = {
  '9:16': { label: '9:16', width: 1080, height: 1920, aspectClass: 'aspect-9-16' },
  '1:1': { label: '1:1', width: 1080, height: 1080, aspectClass: 'aspect-1-1' },
  '16:9': { label: '16:9', width: 1920, height: 1080, aspectClass: 'aspect-16-9' }
};

/* ================= ESTADO ================= */
const state = {
  templateId: 'colchon-descanso-total',
  format: '9:16',
  agent: 'claude-code',
  provider: 'openai',
  providerBaseUrl: 'https://api.openai.com/v1',
  providerModel: 'gpt-5',
  providerKey: '',
  scenes: [],
  product: '',
  productLine: '',
  selectedScene: 0,
  playing: false,
  currentTime: 0,
  simulating: false
};
let masterTl = null;      // timeline GSAP pausada del preview
let rafId = null;         // fallback de reproducción sin GSAP
let lastTick = 0;

const totalDuration = () => state.scenes.reduce((a, s) => a + s.duration, 0);
const sceneAt = (t) => {
  const total = totalDuration();
  if (t >= total) return state.scenes.length - 1;
  let idx = state.scenes.findIndex(s => t >= s.start && t < s.start + s.duration);
  return idx === -1 ? 0 : idx;
};

/* ================= HERO: CANVAS DE PARTÍCULAS / BEAM ================= */
(function heroCanvas() {
  const canvas = $('#hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const mouse = { x: -9999, y: -9999 };
  let W = 0, H = 0, parts = [];

  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    W = canvas.width = r.width;
    H = canvas.height = r.height;
  }
  function seed() {
    const n = Math.max(40, Math.floor(W * H / 26000));
    parts = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.8 + 0.6,
      hue: Math.random() < 0.5 ? '139,92,246' : (Math.random() < 0.5 ? '255,77,141' : '34,211,238')
    }));
  }
  function frame() {
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      const dx = p.x - mouse.x, dy = p.y - mouse.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 22000 && d2 > 0.01) { // el beam reacciona al mouse: empuja las partículas
        const d = Math.sqrt(d2), f = (150 - d) / 150 * 0.6;
        p.vx += (dx / d) * f * 0.12; p.vy += (dy / d) * f * 0.12;
      }
      p.vx *= 0.985; p.vy *= 0.985;
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + p.hue + ',0.75)';
      ctx.fill();
    }
    // líneas entre partículas cercanas: la red del beam
    for (let i = 0; i < parts.length; i++) {
      for (let j = i + 1; j < parts.length; j++) {
        const a = parts[i], b = parts[j];
        const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 < 11000) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = 'rgba(139,92,246,' + (0.14 * (1 - d2 / 11000)) + ')';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(frame);
  }
  window.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    const hero = $('.hero');
    if (hero) {
      hero.style.setProperty('--mx', ((mouse.x / W) * 100).toFixed(1) + '%');
      hero.style.setProperty('--my', ((mouse.y / H) * 100).toFixed(1) + '%');
    }
  });
  window.addEventListener('resize', () => { resize(); seed(); });
  resize(); seed(); frame();
})();

/* ================= HERO: INTRO GSAP + REVEALS ================= */
function heroIntro() {
  if (!hasGsap) return;
  gsap.from('.hero-title .w', { yPercent: 110, opacity: 0, duration: 0.9, stagger: 0.09, ease: 'power4.out', delay: 0.1 });
  gsap.from('.badge', { y: -14, opacity: 0, duration: 0.7, ease: 'power3.out' });
  gsap.from('.hero-sub, .hero-cta, .hero-meta', { y: 24, opacity: 0, duration: 0.8, stagger: 0.12, delay: 0.45, ease: 'power3.out' });
  gsap.from('.nav', { y: -30, opacity: 0, duration: 0.6, ease: 'power3.out' });
}
function scrollReveals() {
  const targets = $$('.section-head, .is-card, .not-card, .flow-strip, .template-card, .rule-card, .retention-demo, .studio-toolbar, .generate-panel');
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      if (hasGsap) gsap.fromTo(en.target, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' });
    });
  }, { threshold: 0.12 });
  targets.forEach(t => io.observe(t));
}

/* ================= VENTANAS FLOTANTES ================= */
let topZ = 40;
function bringToFront(win) {
  topZ += 1;
  win.style.zIndex = String(topZ);
  $$('.float-window').forEach(w => w.classList.toggle('active', w === win));
}
function flashWindow(id) {
  const win = document.getElementById(id);
  if (!win) return;
  bringToFront(win);
  win.classList.remove('flash');
  void win.offsetWidth; // reinicia la animación
  win.classList.add('flash');
}
function nudgeWindow(id) {
  const win = document.getElementById(id);
  if (!win || !hasGsap) return;
  gsap.fromTo(win, { x: 0 }, { x: 7, duration: 0.28, ease: 'power2.out', yoyo: true, repeat: 1 });
}
function initWindows() {
  const desk = $('#studio-desk');
  const desktop = window.matchMedia('(min-width: 1021px)').matches;
  $$('.float-window').forEach(win => {
    win.addEventListener('pointerdown', () => bringToFront(win));
    const minBtn = $('[data-minimize]', win);
    if (minBtn) minBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      win.classList.toggle('minimized');
      minBtn.textContent = win.classList.contains('minimized') ? '+' : '–';
    });
    const header = $('.win-header', win);
    if (header) header.addEventListener('dblclick', () => {
      // Si la ventana se acaba de restaurar con el clic simple que forma
      // parte de este doble clic (<250 ms: el doble clic del navegador
      // llega ~50–150 ms después del primer clic), no se vuelve a
      // minimizar. La ventana es corta a propósito: un doble clic hecho
      // como gesto aparte (≥250 ms después de restaurar) sí minimiza.
      if (Date.now() - (win._restoredAt || 0) < 250) return;
      win.classList.toggle('minimized');
      if (minBtn) minBtn.textContent = win.classList.contains('minimized') ? '+' : '–';
    });
    // Un solo clic en la cabecera restaura la ventana minimizada (J2 R3).
    // Se restaura en pointerdown (antes del click) y no se inicia el
    // arrastre en ese gesto; la marca temporal evita que el dblclick que
    // pueda seguir la vuelva a minimizar. El botón +/– queda excluido:
    // su propio click ya alterna el estado.
    if (header) header.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.win-btn')) return;
      if (!win.classList.contains('minimized')) return;
      win.classList.remove('minimized');
      win._restoredAt = Date.now();
      win._skipDragOnce = true; // el arrastre no arranca en este mismo gesto
      if (minBtn) minBtn.textContent = '–';
    });
    if (!desktop || !header) return;
    header.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.win-btn')) return;
      if (win.classList.contains('minimized')) return;
      // Este pointerdown acaba de restaurar la ventana (ver listener
      // anterior): no se inicia el arrastre en el mismo gesto.
      if (win._skipDragOnce) { win._skipDragOnce = false; return; }
      const deskRect = desk.getBoundingClientRect();
      const rect = win.getBoundingClientRect();
      const offX = e.clientX - rect.left, offY = e.clientY - rect.top;
      header.setPointerCapture(e.pointerId);
      const move = (ev) => {
        let x = ev.clientX - deskRect.left - offX;
        let y = ev.clientY - deskRect.top - offY;
        x = clamp(x, -rect.width + 120, deskRect.width - 120);
        y = clamp(y, 0, deskRect.height - 60);
        win.style.left = x + 'px';
        win.style.top = y + 'px';
      };
      const up = () => {
        header.removeEventListener('pointermove', move);
        header.removeEventListener('pointerup', up);
      };
      header.addEventListener('pointermove', move);
      header.addEventListener('pointerup', up);
    });
  });
}

/* ================= COMPOSICIÓN (contrato de escenas) ================= */
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function highlight(headline, hl) {
  if (!hl || !headline.includes(hl)) return esc(headline);
  return esc(headline).replace(esc(hl), '<span class="hl">' + esc(hl) + '</span>');
}
/* Visual de producto real hecho con CSS (B10): formas, gradientes y
   tipografía — nunca una caja gris con el texto "render del producto". */
function visualHTML(s) {
  switch (s.visualKind) {
    case 'moon': return '<div class="pv pv-moon" aria-hidden="true"></div>';
    case 'sun': return '<div class="pv pv-sun" aria-hidden="true"></div>';
    case 'zzz': return '<div class="pv pv-zzz" aria-hidden="true">Z z z</div>';
    case 'bed': return '<div class="pv pv-bed" aria-hidden="true"></div>';
    case 'breeze': return '<div class="pv pv-breeze" aria-hidden="true"><i></i><i></i><i></i></div>';
    case 'badge': return '<div class="pv pv-badge" aria-hidden="true">' + esc(s.kicker || s.product || '') + '</div>';
    case 'screen': return '<div class="pv pv-screen" aria-hidden="true"><i></i><i></i><i></i></div>';
    case 'boxes': return '<div class="pv pv-boxes" aria-hidden="true"><i></i><i></i><i></i></div>';
    case 'receipt': return '<div class="pv pv-receipt" aria-hidden="true">✓ Enviada<span>Factura electrónica</span></div>';
    case 'check': return '<div class="pv pv-check" aria-hidden="true">✓ ✓ ✓</div>';
    case 'chart-up': return '<div class="pv pv-bars" aria-hidden="true"><i style="height:30%"></i><i style="height:55%"></i><i style="height:80%"></i><i style="height:100%"></i></div>';
    case 'chart-down': return '<div class="pv pv-bars down" aria-hidden="true"><i style="height:100%"></i><i style="height:70%"></i><i style="height:45%"></i><i style="height:25%"></i></div>';
    case 'layers': return '<div class="pv pv-layers" aria-hidden="true"><i></i><i></i><i></i></div>';
    case 'search': return '<div class="pv pv-search" aria-hidden="true"></div>';
    case 'clock': return '<div class="pv pv-clock" aria-hidden="true"></div>';
    case 'paper': return '<div class="pv pv-paper" aria-hidden="true"></div>';
    case 'avatar': return '<div class="pv pv-avatar" aria-hidden="true"><span>AR</span></div>';
    default: return '';
  }
}
function renderComposition() {
  const comp = $('#composition');
  const f = FORMATS[state.format];
  comp.dataset.compositionId = 'flare-ad';
  comp.dataset.width = String(f.width);
  comp.dataset.height = String(f.height);
  comp.dataset.duration = String(totalDuration());
  comp.innerHTML = '';
  state.scenes.forEach((s, i) => {
    const clip = document.createElement('div');
    clip.className = 'clip ' + s.tone + (s.isCTA ? ' is-cta' : '');
    clip.dataset.start = String(s.start);
    clip.dataset.duration = String(s.duration);
    clip.dataset.trackIndex = '0';
    clip.innerHTML =
      '<span class="clip-kicker">' + esc(s.kicker) + '</span>' +
      '<h4>' + highlight(s.headline, s.headlineHl) + '</h4>' +
      '<p class="clip-sub">' + esc(s.sub) + '</p>' +
      '<div class="clip-visual">' + visualHTML(s) + '</div>' +
      (s.isCTA && s.midline ? '<div class="clip-mid"><p class="clip-mid-tag">' + esc(s.midline) + '</p>' +
        (s.midChips && s.midChips.length ? '<div class="clip-mid-chips">' + s.midChips.map(c => '<span class="clip-mid-chip">' + esc(c) + '</span>').join('') + '</div>' : '') + '</div>' : '') +
      (s.isCTA ? '<span class="cta">' + esc(s.ctaLabel) + '</span>' : '') +
      (s.caption ? '<p class="caption" data-start="' + s.start + '" data-duration="' + s.captionDuration + '">' + esc(s.caption) + '</p>' : '');
    comp.appendChild(clip);
  });
}

/* ================= TIMELINE MAESTRA GSAP (pausada) ================= */
function buildMasterTimeline() {
  if (masterTl) { masterTl.kill(); masterTl = null; }
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  const total = totalDuration();
  window.__flareDuration = total;
  window.__hookframeDuration = total; // alias de compatibilidad
  if (!hasGsap) { syncUI(state.currentTime); return; }
  const tl = gsap.timeline({
    paused: true,
    onUpdate: () => { state.currentTime = tl.time(); syncUI(tl.time()); },
    onComplete: () => { state.playing = false; updatePlayUI(); $('#preview-status').textContent = 'terminado'; }
  });
  $$('.clip', $('#composition')).forEach((clip, i) => {
    const s = state.scenes[i];
    const start = s.start, end = start + s.duration;
    // B2: el primer clip es visible a t=0 (en pausa se ve el primer frame,
    // no negro). Los demás empiezan ocultos hasta su inicio.
    if (i === 0) {
      tl.set(clip, { autoAlpha: 1 }, 0);
      // Sin fade-in para el clip 0: el `to` registraría opacity 0 como valor
      // inicial (el CSS de .clip es opacity:0) y lo dejaría invisible en t=0.
    } else {
      tl.set(clip, { autoAlpha: 0 }, 0);
      tl.to(clip, { autoAlpha: 1, duration: 0.35, ease: 'power2.out' }, start);
    }
    const head = clip.querySelector('h4, .split-wrap');
    // immediateRender:false solo en el clip 0: a t=0 su headline/sub/visual
    // ya están en su estado natural (visibles), no en el estado "from".
    if (head) tl.fromTo(head, { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', immediateRender: i !== 0 }, start + 0.05);
    const sub = clip.querySelector('.clip-sub');
    if (sub) tl.fromTo(sub, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out', immediateRender: i !== 0 }, start + 0.18);
    const vis = clip.querySelector('.clip-visual');
    if (vis) tl.fromTo(vis, { scale: 0.96, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'power3.out', immediateRender: i !== 0 }, start + 0.28);
    if (i < state.scenes.length - 1) tl.to(clip, { autoAlpha: 0, duration: 0.3, ease: 'power2.in' }, end - 0.3);
  });
  tl.to({}, { duration: 0.01 }, total); // extiende la timeline hasta la duración total
  masterTl = tl;
  tl.time(state.currentTime);
  // B2 (definitivo): una timeline pausada recién creada NO renderiza en t=0
  // — tl.time(0) es no-op si el playhead ya está en 0 — así que ningún `set`
  // había aplicado y el preview quedaba negro hasta mover el playhead.
  // Se fija el estado inicial directamente: el clip activo visible, los demás
  // ocultos. La timeline toma el control en cuanto se reproduce o se busca.
  $$('.clip', $('#composition')).forEach((clip, i) => {
    const s = state.scenes[i];
    gsap.set(clip, { autoAlpha: (state.currentTime >= s.start && state.currentTime < s.start + s.duration) ? 1 : 0 });
  });
}

function seekTo(t) {
  const total = totalDuration();
  t = clamp(t, 0, total);
  state.currentTime = t;
  if (masterTl) masterTl.time(t);
  else manualRender(t);
  // J2 menor 3: al hacer seek en pausa el frame quedaba casi negro — la
  // timeline pausada deja el clip destino a mitad de su fade-in
  // (opacidad ≈0,08 en start+0,01s) y sus hijos en su estado "from".
  // Se fuerza el frame destino a su estado final, igual que ya se hacía
  // en la carga inicial con gsap.set. Al pulsar Play la timeline retoma
  // el control y vuelve a animar desde ahí.
  if (!state.playing && masterTl && hasGsap) {
    const clips = $$('.clip', $('#composition'));
    const clip = clips[sceneAt(t)];
    if (clip) {
      gsap.set(clip, { autoAlpha: 1 });
      const head = clip.querySelector('h4, .split-wrap');
      if (head) gsap.set(head, { y: 0, opacity: 1 });
      const sub = clip.querySelector('.clip-sub');
      if (sub) gsap.set(sub, { y: 0, opacity: 1 });
      const vis = clip.querySelector('.clip-visual');
      if (vis) gsap.set(vis, { scale: 1, opacity: 1 });
    }
  }
  syncUI(t);
}
window.__flareSeek = seekTo;
window.__hookframeSeek = seekTo; // alias de compatibilidad

function manualRender(t) {
  $$('.clip', $('#composition')).forEach((clip, i) => {
    const s = state.scenes[i];
    clip.classList.toggle('active', t >= s.start && t < s.start + s.duration);
  });
}
function startFallback() {
  lastTick = performance.now();
  const step = (now) => {
    const dt = (now - lastTick) / 1000;
    lastTick = now;
    state.currentTime += dt;
    if (state.currentTime >= totalDuration()) {
      state.currentTime = totalDuration();
      manualRender(state.currentTime);
      syncUI(state.currentTime);
      state.playing = false;
      updatePlayUI();
      $('#preview-status').textContent = 'terminado';
      rafId = null;
      return;
    }
    manualRender(state.currentTime);
    syncUI(state.currentTime);
    rafId = requestAnimationFrame(step);
  };
  rafId = requestAnimationFrame(step);
}
function play() {
  if (state.playing) return;
  if (state.currentTime >= totalDuration()) seekTo(0);
  state.playing = true;
  updatePlayUI();
  $('#preview-status').textContent = 'reproduciendo';
  if (masterTl) masterTl.play();
  else startFallback();
}
function pause() {
  state.playing = false;
  updatePlayUI();
  $('#preview-status').textContent = 'pausado';
  if (masterTl) masterTl.pause();
  else if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
}
function updatePlayUI() {
  $('#btn-play').textContent = state.playing ? '❚❚ Pausa' : '▶ Play';
}
function syncUI(t) {
  const total = totalDuration();
  $('#timecode').textContent = fmtT(t) + ' / ' + fmtT(total);
  const ph = $('#playhead');
  if (ph) {
    // El playhead se alinea con los carriles (no con el borde de .timeline-tracks):
    // antes caía sobre la etiqueta VÍDEO/CAPTIONS y la tapaba en t=0 (B4).
    const lane = $('#lane-video');
    const tracks = $('.timeline-tracks');
    if (lane && tracks) {
      const lr = lane.getBoundingClientRect();
      const tr = tracks.getBoundingClientRect();
      ph.style.left = (lr.left - tr.left + (total ? (t / total) * lr.width : 0)) + 'px';
    } else {
      ph.style.left = (total ? (t / total) * 100 : 0) + '%';
    }
  }
  const idx = sceneAt(t);
  $$('.scene-clip').forEach((el, i) => el.classList.toggle('now', i === idx));
  const s = state.scenes[idx];
  if (s) $('#preview-caption').innerHTML = '<strong>' + esc(s.name) + ' · ' + fmtT(s.start) + '–' + fmtT(s.start + s.duration) + '</strong> — ' + esc(s.caption);
}

/* ================= TIMELINE (UI) ================= */
function renderTimeline() {
  const total = totalDuration();
  $('#timeline-product').textContent = state.product;
  $('#timeline-count').textContent = state.scenes.length + ' escenas · ' + fmtT(total);
  const ruler = $('#timeline-ruler');
  ruler.innerHTML = '';
  const step = total > 16 ? 2 : 1;
  for (let t = 0; t <= total; t += step) {
    const tick = document.createElement('span');
    tick.style.left = (t / total * 100) + '%';
    // el primer y el último tick no se cortan por el borde (B4)
    tick.style.transform = t === 0 ? 'translateX(0)' : (t === total ? 'translateX(-100%)' : 'translateX(-50%)');
    tick.textContent = t + 's';
    ruler.appendChild(tick);
  }
  const tracks = $('#timeline-tracks');
  tracks.innerHTML = '';
  const videoLane = document.createElement('div');
  videoLane.className = 'timeline-track';
  videoLane.innerHTML = '<span class="track-label">VÍDEO</span><div class="track-lane" id="lane-video"></div>';
  const capLane = document.createElement('div');
  capLane.className = 'timeline-track';
  capLane.innerHTML = '<span class="track-label">CAPTIONS</span><div class="track-lane" id="lane-captions"></div>';
  tracks.appendChild(videoLane);
  tracks.appendChild(capLane);
  const ph = document.createElement('div');
  ph.className = 'playhead';
  ph.id = 'playhead';
  tracks.appendChild(ph);
  const laneV = $('#lane-video');
  const laneC = $('#lane-captions');
  state.scenes.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'scene-clip' + (s.isCTA ? ' cta-clip' : '') + (i === state.selectedScene ? ' selected' : '');
    b.style.left = (s.start / total * 100) + '%';
    b.style.width = Math.max(s.duration / total * 100, 4) + '%';
    b.title = s.name + ' · ' + fmtT(s.start) + '–' + fmtT(s.start + s.duration) + ' — ' + s.caption;
    b.innerHTML = '<span class="sc-name">' + esc(s.name) + '</span><span class="sc-time">' + fmtT(s.start) + ' · ' + s.duration + 's</span>';
    b.addEventListener('click', () => selectScene(i, true));
    laneV.appendChild(b);
    if ((s.captionDuration || 0) > 0) {
      const cap = document.createElement('button');
      cap.className = 'scene-clip cap-bar' + (i === state.selectedScene ? ' selected' : '');
      cap.style.left = (s.start / total * 100) + '%';
      cap.style.width = Math.max(s.captionDuration / total * 100, 3) + '%';
      cap.title = 'Caption (' + s.captionDuration + ' s): ' + s.caption;
      cap.innerHTML = '<span class="sc-name">“' + esc(s.caption) + '”</span>';
      cap.addEventListener('click', () => selectScene(i, true));
      laneC.appendChild(cap);
    }
  });
  renderDetail();
  syncUI(state.currentTime);
}
function selectScene(i, seek) {
  state.selectedScene = i;
  renderTimelineSelection();
  renderDetail();
  if (seek) seekTo(state.scenes[i].start + 0.01);
}
function renderTimelineSelection() {
  $$('#lane-video .scene-clip').forEach((el, i) => el.classList.toggle('selected', i === state.selectedScene));
  $$('#lane-captions .scene-clip').forEach((el, i) => el.classList.toggle('selected', i === state.selectedScene));
}
function renderDetail() {
  const s = state.scenes[state.selectedScene];
  const box = $('#timeline-detail');
  if (!s) { box.textContent = 'Sin escenas.'; return; }
  box.innerHTML =
    '<strong>' + esc(s.name) + '</strong> · ' + fmtT(s.start) + '–' + fmtT(s.start + s.duration) +
    ' · ' + (s.isCTA ? 'escena CTA' : 'clip') + (s.safe === false ? ' · <span style="color:var(--danger)">texto fuera de la safe zone</span>' : '') +
    '<br>Caption actual: «' + esc(s.caption) + '» (' + s.captionDuration + ' s de ' + s.duration + ' s).' +
    '<input id="caption-edit" type="text" value="' + esc(s.caption).replace(/"/g, '&quot;') + '" aria-label="Editar caption">' +
    '<div class="detail-actions"><button class="btn btn-primary btn-sm" id="btn-apply-caption">Aplicar caption</button>' +
    '<span style="font-size:12px;color:var(--text-muted);align-self:center">Al aplicar, el caption cubre toda la escena. Vacía el campo para quitar el caption: la escena pierde cobertura y el score baja.</span></div>';
  $('#btn-apply-caption').addEventListener('click', () => {
    const v = $('#caption-edit').value.trim();
    // Un caption vacío QUITA la cobertura (antes era no-op por la guarda
    // `if (!v) return` y el score no podía bajar nunca): captionDuration 0.
    s.caption = v;
    s.captionDuration = v ? s.duration : 0;
    rebuildAfterEdit();
    logLine('edit', v
      ? 'Caption de «' + s.name + '» actualizado a: “' + v + '”'
      : 'Caption de «' + s.name + '» eliminado: la escena ya no tiene caption y la cobertura baja.', 'EDIT');
  });
  $('#caption-edit').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('#btn-apply-caption').click();
  });
}
function rebuildAfterEdit() {
  pause();
  renderComposition();
  buildMasterTimeline();
  renderTimeline();
  renderRetention();
  saveStudioState();
  seekTo(state.scenes[state.selectedScene].start + 0.01);
}

/* ================= RETENCIÓN (motor unificado, canónico) =================
   Reglas idénticas en los tres scorers (SKILL.md §5, retention-checklist.md):
   examples-check.mjs, renderer/lib/score.js y aquí (computeRetention).
   - Hook 30: 1ª escena en 0, con texto de hook (headline), ≤2,5 s y motion
     (GSAP o animación CSS) → 30. Hook presente pero >2,5 s o sin motion → 15.
     Sin hook (sin headline, o 1ª escena no empieza en 0) → 0.
   - Captions 25: cobertura = UNIÓN de intervalos / duración total;
     score = min(25, 25 × cobertura / 0,8), redondeado.
   - Cortes 20: 20 × (clips de 2–4 s / clips totales), redondeado.
   - CTA 15: visible ≥2 s en los últimos 3 s → 15; si menos, 15 × visible/2,
     redondeado; sin CTA → 0.
   - Safe 10: 10 × (captions + CTA dentro del margen 10% / elementos totales),
     redondeado. Vale en todos los formatos, no solo 9:16.
   - Etiquetas: ≥75 "Sólido · listo para publicar", 50–74 "Necesita trabajo",
     <50 "Débil". Los scores fraccionarios se redondean al entero más cercano. */
function unionCoverage(intervals, total) {
  const sorted = intervals.filter(([s, e]) => e > s).sort((a, b) => a[0] - b[0]);
  let covered = 0, cur = null;
  for (const [s, e] of sorted) {
    if (!cur) { cur = [s, e]; continue; }
    if (s <= cur[1]) cur[1] = Math.max(cur[1], e);
    else { covered += cur[1] - cur[0]; cur = [s, e]; }
  }
  if (cur) covered += cur[1] - cur[0];
  return total ? covered / total : 0;
}
function pageHasCssAnimation() {
  // Motion CSS: hay alguna regla @keyframes (o animation-name) en la página.
  try {
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch (e) { continue; }
      if (!rules) continue;
      for (const r of rules) {
        if (r.type === CSSRule.KEYFRAMES_RULE) return true;
        if (r.style && r.style.animationName && r.style.animationName !== 'none') return true;
      }
    }
  } catch (e) { /* sin acceso a las hojas: no hay motion CSS verificable */ }
  return false;
}
function retentionVerdict(total) {
  if (total >= 75) return 'Sólido · listo para publicar';
  if (total >= 50) return 'Necesita trabajo';
  return 'Débil';
}
function computeRetention(scenesArg, formatArg) {
  const scenes = scenesArg || state.scenes;
  const format = formatArg || state.format;
  const total = scenes.reduce((a, s) => a + s.duration, 0);
  const emptyItems = [
    { key: 'hook', label: 'Hook en los primeros 2 s', pts: 0, max: 30, pass: false, fix: 'Carga una plantilla para empezar.' },
    { key: 'captions', label: 'Captions ≥ 80% de la duración', pts: 0, max: 25, pass: false, fix: 'Carga una plantilla para empezar.' },
    { key: 'cuts', label: 'Ritmo de cortes (escenas de 2–4 s)', pts: 0, max: 20, pass: false, fix: 'Carga una plantilla para empezar.' },
    { key: 'cta', label: 'CTA en los últimos 3 s, visible ≥ 2 s', pts: 0, max: 15, pass: false, fix: 'Carga una plantilla para empezar.' },
    { key: 'safe', label: 'Safe zones (texto dentro del margen 10%)', pts: 0, max: 10, pass: false, fix: 'Carga una plantilla para empezar.' },
  ];
  if (!scenes.length || !total) {
    return { hook: 0, captions: 0, cuts: 0, cta: 0, safe: 0, coverage: 0, total: 0, items: emptyItems };
  }
  // 1. Hook (30)
  const first = scenes[0];
  const hasHookText = !!(first.headline && first.headline.trim());
  const hookPresent = hasHookText && first.start === 0;
  let hook = 0;
  if (hookPresent) {
    // Motion = GSAP o animación CSS (definición canónica; un "solo GSAP"
    // dejaría fuera piezas cuyo único motion es @keyframes).
    const motionOK = first.motion !== false && (hasGsap || pageHasCssAnimation());
    hook = (first.duration <= 2.5 && motionOK) ? 30 : 15;
  }
  // 2. Captions (25): unión de intervalos, los solapes no suman dos veces
  const intervals = scenes
    .filter(s => s.caption && (s.captionDuration || 0) > 0)
    .map(s => [s.start, s.start + Math.min(s.captionDuration, s.duration)]);
  const coverage = unionCoverage(intervals, total);
  const captions = Math.round(Math.min(25, 25 * coverage / 0.8));
  // 3. Cortes (20)
  const inRange = scenes.filter(s => s.duration >= 2 && s.duration <= 4).length;
  const cuts = Math.round(20 * inRange / scenes.length);
  // 4. CTA (15): solape del CTA con los últimos 3 s
  const ctaScene = scenes.find(s => s.isCTA);
  let cta = 0, ctaVisible = 0;
  if (ctaScene) {
    ctaVisible = Math.max(0, Math.min(ctaScene.start + ctaScene.duration, total) - Math.max(ctaScene.start, total - 3));
    cta = ctaVisible >= 2 ? 15 : Math.round(15 * ctaVisible / 2);
  }
  // 5. Safe zones (10): elementos = captions PRESENTES en el HTML con
  // cobertura (un caption sin elemento no cuenta ni dentro ni fuera,
  // igual que en renderer/lib/score.js) + CTA si su elemento está
  // presente. El caption y el CTA son independientes (probe cap60).
  const capElements = scenes.filter(s => s.caption && (s.captionDuration || 0) > 0 && s.safe != null);
  const safeTotal = capElements.length + (ctaScene && ctaSafeOf(ctaScene) != null ? 1 : 0);
  const safeInside = capElements.filter(s => s.safe === true).length + ((ctaScene && ctaSafeOf(ctaScene) === true) ? 1 : 0);
  const safe = safeTotal ? Math.round(10 * safeInside / safeTotal) : 10;
  const longScene = scenes.find(s => s.duration > 4 && !s.isCTA);
  const unsafeScene = scenes.find(s => s.safe === false) || (ctaScene && ctaSafeOf(ctaScene) === false ? ctaScene : undefined);
  return {
    hook, captions, cuts, cta, safe, coverage,
    total: hook + captions + cuts + cta + safe,
    items: [
      { key: 'hook', label: 'Hook en los primeros 2 s', pts: hook, max: 30,
        pass: hook === 30, fix: hookPresent
          ? (first.duration > 2.5 ? 'Acorta la primera escena de ' + first.duration + ' s a ≤ 2,5 s para el hook completo (30 pts).' : 'Añade motion a la primera escena (GSAP o animación CSS).')
          : 'Abre con una pregunta o un contraste en la primera escena (empieza en 0 s).' },
      { key: 'captions', label: 'Captions ≥ 80% de la duración', pts: captions, max: 25,
        pass: coverage >= 0.8, fix: 'Extiende los captions: ahora cubren el ' + Math.round(coverage * 100) + '%. Haz click en una escena y aplica un caption completo.' },
      { key: 'cuts', label: 'Ritmo de cortes (escenas de 2–4 s)', pts: cuts, max: 20,
        pass: cuts === 20, fix: longScene ? 'Recorta «' + longScene.name + '» de ' + longScene.duration + ' s a 4 s o menos.' : 'Ajusta las duraciones a 2–4 s por escena.' },
      { key: 'cta', label: 'CTA en los últimos 3 s, visible ≥ 2 s', pts: cta, max: 15,
        pass: cta === 15, fix: ctaScene ? 'El CTA solo es visible ' + ctaVisible.toFixed(1) + ' s en los últimos 3 s: alarga el último clip a 3 s.' : 'Añade una escena CTA final en los últimos 3 s.' },
      { key: 'safe', label: 'Safe zones (texto dentro del margen 10%)', pts: safe, max: 10,
        pass: safe === 10, fix: unsafeScene ? 'Mueve el texto de «' + unsafeScene.name + '» dentro de la safe zone del 10%.' : 'Revisa los márgenes del 10% en formato ' + format + '.' }
    ]
  };
}
function renderTemplateScores() {
  $$('[data-template-score]').forEach(el => {
    const t = TEMPLATES[el.dataset.templateScore];
    if (!t) return;
    el.textContent = computeRetention(t.scenes, t.format).total + ' / 100';
  });
  // Desglose del score en cada tarjeta (J1 M1): calculado por JS con el
  // mismo motor que el Studio, nunca hardcodeado, para que no se lea
  // como un número fijo.
  $$('[data-template-breakdown]').forEach(el => {
    const t = TEMPLATES[el.dataset.templateBreakdown];
    if (!t) return;
    const r = computeRetention(t.scenes, t.format);
    el.innerHTML = 'Hook <b>' + r.hook + '/30</b> · Captions <b>' + r.captions + '/25</b> · Cortes <b>' + r.cuts + '/20</b> · CTA <b>' + r.cta + '/15</b> · Safe <b>' + r.safe + '/10</b>';
  });
}
function renderRetention() {
  const r = computeRetention();
  $('#retention-score').textContent = String(r.total);
  const ring = $('#ring-fg');
  if (ring) ring.style.strokeDashoffset = String(326.7 * (1 - r.total / 100));
  $('#retention-verdict').textContent = retentionVerdict(r.total);
  const list = $('#retention-checklist');
  list.innerHTML = '';
  r.items.forEach(it => {
    const li = document.createElement('li');
    li.innerHTML =
      '<span class="rc-head"><span class="rc-dot ' + (it.pass ? 'pass' : 'fail') + '">' + (it.pass ? '✓' : '×') + '</span>' +
      esc(it.label) + '<span class="rc-pts">' + it.pts + '/' + it.max + '</span></span>' +
      (it.pass ? '' : '<span class="rc-fix"><b>Arreglo:</b> ' + esc(it.fix) + '</span>');
    list.appendChild(li);
  });
  const landing = $('#landing-score');
  if (landing) landing.textContent = String(r.total);
  const landingLabel = $('#landing-score-label');
  const t = TEMPLATES[state.templateId];
  if (landingLabel && t) landingLabel.textContent = '/ 100 · ' + t.name;
  return r;
}

/* ================= FORMATO ================= */
function setFormat(fmt, rebuild) {
  state.format = fmt;
  const f = FORMATS[fmt];
  const stage = $('#preview-stage');
  stage.className = 'preview-stage ' + f.aspectClass;
  $('#preview-format-label').textContent = f.label;
  $$('.format-switch button').forEach(b => b.classList.toggle('active', b.dataset.format === fmt));
  if (rebuild !== false) {
    renderComposition();
    buildMasterTimeline();
    renderRetention();
    saveStudioState();
    seekTo(0);
  }
}

/* ================= AGENTE ================= */
function setAgentState(text, busy) {
  $('#agent-state').textContent = text;
  $('#agent-pulse').classList.toggle('busy', !!busy);
  $('#agent-thinking').hidden = !busy;
}
function applyAgent(id) {
  state.agent = id;
  const a = AGENTS[id];
  $('#agent-avatar').textContent = a.initial;
  $('#agent-avatar').style.setProperty('--agent-color', a.color);
  $('#agent-name').textContent = a.name;
  $('#agent-sub').textContent = a.sub;
  $('#agent-command').textContent = a.command;
  $('#command-agent-label').textContent = a.name;
  updateCommandBox();
}
function logLine(kind, text, tag) {
  const log = $('#agent-log');
  const empty = $('.log-muted', log);
  if (empty) empty.remove();
  const now = new Date();
  const ts = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0');
  const p = document.createElement('p');
  p.className = 'log-line' + (kind ? ' log-' + kind : '');
  p.innerHTML = '<span class="log-time">' + ts + '</span>' + (tag ? '<span class="log-tag">' + esc(tag) + '</span>' : '') + esc(text);
  log.appendChild(p);
  log.scrollTop = log.scrollHeight;
}

/* ================= PROVEEDOR DE MODELO (BYO key, solo local) ================= */
const PROVIDERS = {
  'openai':     { name: 'OpenAI',          baseUrl: 'https://api.openai.com/v1',                          models: ['gpt-5', 'gpt-4o', 'gpt-4o-mini'], needsKey: true },
  'anthropic':  { name: 'Anthropic',       baseUrl: 'https://api.anthropic.com/v1',                       models: ['claude-sonnet-4-5', 'claude-opus-4-1', 'claude-haiku-4-5'], needsKey: true },
  'gemini':     { name: 'Google Gemini',   baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', models: ['gemini-2.5-pro', 'gemini-2.5-flash'], needsKey: true },
  'qwen':       { name: 'Qwen',            baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', models: ['qwen3-max', 'qwen3-coder-plus', 'qwen3-235b-a22b'], needsKey: true },
  'deepseek':   { name: 'DeepSeek',        baseUrl: 'https://api.deepseek.com/v1',                        models: ['deepseek-chat', 'deepseek-reasoner'], needsKey: true },
  'groq':       { name: 'Groq',            baseUrl: 'https://api.groq.com/openai/v1',                    models: ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b'], needsKey: true },
  'together':   { name: 'Together',        baseUrl: 'https://api.together.xyz/v1',                        models: ['meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8'], needsKey: true },
  'mistral':    { name: 'Mistral',         baseUrl: 'https://api.mistral.ai/v1',                          models: ['mistral-large-latest', 'mistral-medium-latest'], needsKey: true },
  'openrouter': { name: 'OpenRouter',      baseUrl: 'https://openrouter.ai/api/v1',                       models: ['anthropic/claude-sonnet-4.5', 'openai/gpt-5'], needsKey: true },
  'fireworks':  { name: 'Fireworks AI',    baseUrl: 'https://api.fireworks.ai/inference/v1',              models: ['accounts/fireworks/models/llama-v3p3-70b-instruct'], needsKey: true },
  'ollama':     { name: 'Ollama (local)',  baseUrl: 'http://localhost:11434/v1',                          models: ['qwen3', 'llama3.2', 'gemma3'], needsKey: false, local: true },
  'lmstudio':   { name: 'LM Studio (local)', baseUrl: 'http://localhost:1234/v1',                        models: ['local-model'], needsKey: false, local: true },
  'custom':     { name: 'Custom (OpenAI-compatible)', baseUrl: '',                                        models: [], needsKey: true, custom: true }
};
const LS_CONFIG = 'flare.provider.config';
const LS_KEY = 'flare.provider.key'; // legado (una sola key): se migra al mapa
const LS_KEYS = 'flare.provider.keys'; // mapa { proveedor: key } — la key se conserva por proveedor

function readKeyMap() {
  try { return JSON.parse(localStorage.getItem(LS_KEYS) || '{}') || {}; } catch (e) { return {}; }
}
function writeKeyMap(map) {
  try { localStorage.setItem(LS_KEYS, JSON.stringify(map)); } catch (e) { /* noop */ }
}
function stashProviderKey(providerId, value) {
  // Guarda la key tecleada del proveedor actual antes de cambiar de proveedor:
  // cambiar de proveedor ya no borra la key sin avisar (Menor 3).
  const map = readKeyMap();
  if (value) map[providerId] = value;
  else delete map[providerId];
  writeKeyMap(map);
}

function currentProvider() {
  return {
    id: state.provider || 'openai',
    def: PROVIDERS[state.provider] || PROVIDERS.openai,
    baseUrl: state.providerBaseUrl,
    model: state.providerModel,
    hasKey: !!state.providerKey
  };
}
function fillProviderFields(fromSaved) {
  const def = PROVIDERS[state.provider];
  const base = $('#provider-baseurl');
  const model = $('#provider-model');
  const key = $('#provider-key');
  if (!fromSaved) {
    state.providerBaseUrl = def.baseUrl;
    state.providerModel = def.models[0] || '';
  }
  base.value = state.providerBaseUrl;
  base.placeholder = def.custom ? 'https://tu-endpoint.com/v1' : def.baseUrl;
  model.value = state.providerModel;
  model.placeholder = def.custom ? 'nombre-del-modelo' : (def.models[0] || '');
  const dl = $('#provider-models');
  dl.innerHTML = '';
  def.models.forEach(m => {
    const o = document.createElement('option');
    o.value = m;
    dl.appendChild(o);
  });
  $('#provider-key-req').textContent = def.needsKey ? '(requerida)' : '(opcional en local)';
  key.placeholder = def.local ? 'Opcional en local — puede ir vacía' : 'sk-…';
  $('#provider-custom').hidden = !def.custom;
  $('#provider-local-note').hidden = !def.local;
  updateProviderSavedLabel();
}
function updateProviderSavedLabel() {
  const el = $('#provider-saved');
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(LS_CONFIG) || 'null'); } catch (e) { saved = null; }
  const keySaved = !!readKeyMap()[state.provider];
  if (saved && saved.provider === state.provider) {
    el.textContent = keySaved ? 'Guardado localmente · key guardada' : 'Guardado localmente · sin key';
    el.classList.add('saved');
  } else {
    el.textContent = 'No guardado';
    el.classList.remove('saved');
  }
}
function saveProvider() {
  state.providerBaseUrl = $('#provider-baseurl').value.trim();
  state.providerModel = $('#provider-model').value.trim();
  const key = $('#provider-key').value;
  try {
    localStorage.setItem(LS_CONFIG, JSON.stringify({ provider: state.provider, baseUrl: state.providerBaseUrl, model: state.providerModel }));
    stashProviderKey(state.provider, key);
    state.providerKey = key;
  } catch (e) { /* localStorage no disponible: la config solo vive en memoria */ }
  updateProviderSavedLabel();
  updateCommandBox();
  logLine('ok', 'Proveedor guardado en este navegador: ' + PROVIDERS[state.provider].name + ' · ' + (state.providerModel || 'sin modelo') + '. La key nunca sale de tu navegador.', 'PROVEEDOR');
  $('#copy-feedback').textContent = 'Proveedor guardado solo en tu navegador.';
  setTimeout(() => { $('#copy-feedback').textContent = ''; }, 3500);
}
function loadProviderSaved() {
  if (!state.provider) {
    state.provider = 'openai';
    state.providerBaseUrl = PROVIDERS.openai.baseUrl;
    state.providerModel = PROVIDERS.openai.models[0];
    state.providerKey = '';
  }
  try {
    const saved = JSON.parse(localStorage.getItem(LS_CONFIG) || 'null');
    if (saved && PROVIDERS[saved.provider]) {
      state.provider = saved.provider;
      state.providerBaseUrl = saved.baseUrl || PROVIDERS[saved.provider].baseUrl;
      state.providerModel = saved.model || (PROVIDERS[saved.provider].models[0] || '');
    }
    // Migración del formato antiguo (una sola key): pasa al mapa por proveedor.
    const legacy = localStorage.getItem(LS_KEY);
    if (legacy) {
      const map = readKeyMap();
      if (!map[state.provider]) map[state.provider] = legacy;
      writeKeyMap(map);
      localStorage.removeItem(LS_KEY);
    }
    state.providerKey = readKeyMap()[state.provider] || '';
  } catch (e) { /* sin acceso a localStorage */ }
  $('#provider-select').value = state.provider;
  if (state.providerKey) $('#provider-key').value = state.providerKey;
  fillProviderFields(true);
}

/* ================= SIMULACIÓN DEL AGENTE ================= */
/* La simulación solo arregla debilidades REALES medidas por
   computeRetention y lo dice en el log. En las 3 plantillas la única
   debilidad real es el hook (15/30: primera escena de 3 s, necesita
   <= 2,5 s): se acorta la primera escena a 2 s EN MEMORIA (solo el
   estado del Studio, nunca el archivo del ejemplo) y el score sube
   85 -> 100. Captions, cortes, CTA y safe zones ya están en su máximo
   y el log lo dice así, sin inventar debilidades. La safe zone NO se
   "arregla" con un flag: si falla, se informa y se deja para corregir
   la posición real en scenes.html. */
function applyAgentFixes() {
  const fixes = [];
  const notes = [];
  const r = computeRetention();
  const first = state.scenes[0];
  if (first && r.hook < 30 && first.duration > 2.5) {
    const old = first.duration;
    first.duration = 2;
    first.captionDuration = Math.min(first.captionDuration, first.duration);
    fixes.push('Acorté la primera escena de ' + old + ' s a 2 s para el hook completo (Hook 15 → 30). Solo en el Studio: el archivo del ejemplo no cambia.');
  }
  state.scenes.forEach(s => {
    if (s.caption && s.captionDuration < s.duration) {
      s.captionDuration = s.duration;
      fixes.push('Extendí el caption de «' + s.name + '» a ' + s.duration + ' s (cobertura completa).');
    }
  });
  state.scenes.forEach(s => {
    if (s.duration > 4 && !s.isCTA) {
      const old = s.duration;
      s.duration = Math.max(4, s.duration - 1);
      s.captionDuration = Math.min(s.captionDuration, s.duration);
      fixes.push('Acorté «' + s.name + '» de ' + old + ' s a ' + s.duration + ' s para mejorar el ritmo.');
    }
  });
  state.scenes.forEach(s => {
    if (!s.caption && s.captionDuration === 0) {
      notes.push('«' + s.name + '» no tiene caption: la cobertura baja. Escribe uno en la Timeline para recuperarla.');
    }
  });
  if (r.safe < 10) {
    const unsafe = state.scenes.filter(s => s.safe === false || (s.isCTA && ctaSafeOf(s) === false)).map(s => '«' + s.name + '»');
    notes.push('Safe zones en ' + r.safe + '/10 (' + unsafe.join(', ') + ' fuera del margen 10%): hay que mover el texto en scenes.html, no se arregla con un flag.');
  }
  let t = 0;
  state.scenes.forEach(s => { s.start = t; t += s.duration; });
  return { fixes, notes };
}
function simulateAgent() {
  if (state.simulating) return;
  state.simulating = true;
  const btn = $('#btn-simulate');
  btn.disabled = true;
  btn.textContent = 'Agente trabajando…';
  const before = computeRetention();
  const weak = before.items.filter(i => !i.pass);
  const weakText = weak.length
    ? 'Puntos débiles reales: ' + weak.map(i => i.label + ' ' + i.pts + '/' + i.max).join(' · ') + '.'
    : 'Sin puntos débiles: todo en su máximo.';
  const okText = before.items.filter(i => i.pass).map(i => i.label).join(', ');
  const steps = [
    { at: 300, state: 'pensando', log: ['info', 'Leyendo brief.md y la composición actual de «' + state.product + '»…', 'AGENTE'] },
    { at: 1500, state: 'analizando', log: ['info', 'Score de retención actual: ' + before.total + '/100. ' + weakText + (weak.length ? ' En su máximo: ' + okText + '.' : ''), 'ANÁLISIS'], flash: 'win-retention' },
    { at: 2800, state: 'editando', log: null, flash: 'win-timeline', nudge: 'win-timeline', action: 'fix' },
    { at: 4600, state: 'renderizando', log: ['info', 'Re-renderizando el preview con los cambios…', 'RENDER'], action: 'play' },
    { at: 6200, state: 'listo', log: null, action: 'done', before: before.total }
  ];
  steps.forEach(step => {
    setTimeout(() => {
      setAgentState(step.state, step.state !== 'listo');
      if (step.flash) flashWindow(step.flash);
      if (step.nudge) nudgeWindow(step.nudge);
      if (step.log) logLine(step.log[0], step.log[1], step.log[2]);
      if (step.action === 'fix') {
        const { fixes, notes } = applyAgentFixes();
        pause();
        renderComposition();
        buildMasterTimeline();
        renderTimeline();
        renderRetention();
        saveStudioState();
        seekTo(0);
        fixes.forEach(f => logLine('edit', f, 'EDIT'));
        notes.forEach(n => logLine('warn', n, 'NOTA'));
        if (!fixes.length && !notes.length) logLine('info', 'No había puntos débiles que corregir: la composición ya estaba en forma.', 'EDIT');
      }
      if (step.action === 'play') { seekTo(0); play(); }
      if (step.action === 'done') {
        const after = computeRetention().total;
        logLine('ok', 'Listo. Score de retención: ' + step.before + ' → ' + after + '/100' + (after > step.before ? ' (Hook 15 → 30: primera escena de 3 s a 2 s, solo en memoria).' : '.') + ' Revisa la Timeline y el panel de Retención.', 'LISTO');
        setAgentState('listo', false);
        state.simulating = false;
        btn.disabled = false;
        btn.textContent = '▶ Simular agente trabajando';
        flashWindow('win-retention');
      }
    }, step.at);
  });
}

/* ================= BRIEF + COMANDO ================= */
function buildBrief() {
  const r = computeRetention();
  const a = AGENTS[state.agent] || AGENTS['claude-code'];
  const p = currentProvider();
  const f = FORMATS[state.format];
  const sceneLines = state.scenes.map((s, i) =>
    (i + 1) + '. ' + s.name + ' (' + s.start.toFixed(1) + '–' + (s.start + s.duration).toFixed(1) + ' s, ' + s.duration + ' s)' +
    (s.isCTA ? ' [CTA]' : '') + '\n   Headline: ' + (s.headline || '(sin headline)') +
    '\n   Caption: "' + s.caption + '" (' + s.captionDuration + ' s)' +
    (s.safe ? '' : '\n   ⚠ Texto fuera de la safe zone del 10% — corrígelo.')).join('\n');
  const brief =
'# Brief — Flare Studio\n' +
'Producto: ' + state.productLine + '\n' +
'Plantilla: ' + TEMPLATES[state.templateId].name + '\n' +
'Formato: ' + state.format + ' (' + f.width + '×' + f.height + ')\n' +
'Duración total: ' + totalDuration() + ' s\n' +
'Score de retención actual: ' + r.total + '/100\n' +
'Agente: ' + a.name + '\n' +
'Proveedor de modelo (BYO key): ' + p.def.name + ' · modelo ' + (p.model || '—') + ' · ' + (p.baseUrl || '—') + '\n' +
'API key: guardada solo en el navegador del usuario (localStorage). No la pidas, no la incluyas en archivos, no la envíes a ningún servidor.\n' +
'\n## Escenas\n' + sceneLines + '\n' +
'\n## Reglas de retención (obligatorias)\n' +
'- Hook en los primeros 2 s: movimiento + texto grande + pregunta o contraste.\n' +
'- Captions que cubran al menos el 80% de la duración total.\n' +
'- Ritmo de cortes: escenas de 2 a 4 segundos.\n' +
'- CTA en los últimos 3 s, visible al menos 2 s.\n' +
'- Safe zones: en 9:16, el texto dentro de los márgenes del 10%.\n' +
'\n## Contrato de salida\n' +
'- Un <div data-composition-id="flare-ad" data-width="' + f.width + '" data-height="' + f.height + '" data-duration="' + totalDuration() + '">.\n' +
'- Clips con class="clip" y data-start, data-duration, data-track-index.\n' +
'- Captions con class="caption" y data-start, data-duration.\n' +
'- CTA final con class="cta".\n' +
'- Animaciones GSAP en timelines pausadas; exponer window.__flareSeek(t) y window.__flareDuration.\n' +
'- El render en web usa MediaRecorder (WebM). El render a MP4 es opcional, con el CLI local Node + FFmpeg.\n' +
'\n## Qué NO hacer\n' +
'- No inventes otro producto, ni precios, ni testimonios, ni especificaciones.\n' +
'- No uses metraje generado por IA ni imágenes de stock sin licencia.\n' +
'- No guardes keys ni credenciales en el código.\n';
  const command = a.command + '\n# Proveedor (BYO key): ' + p.def.name + ' · ' + (p.model || 'sin modelo') + ' · ' + (p.baseUrl || 'sin base URL') + '\n# Tu key vive solo en tu navegador. Flare no tiene servidor.';
  return { brief, command };
}
function updateCommandBox() {
  const built = buildBrief();
  $('#command-box').textContent = built.command;
  $('#agent-command').textContent = AGENTS[state.agent].command;
}
function copyText(text, feedback) {
  const done = () => {
    const el = $('#copy-feedback');
    el.textContent = feedback;
    setTimeout(() => { el.textContent = ''; }, 3500);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else fallbackCopy(text, done);
}
function fallbackCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch (e) { /* portapapeles no disponible */ }
  document.body.removeChild(ta);
  done();
}

/* ================= EXPORTAR: VIDEO WEBM (MediaRecorder) ================= */
const TONE_BG = {
  'tone-violet': ['#2A1650', '#0A0A0F'],
  'tone-pink': ['#3D1030', '#0A0A0F'],
  'tone-cyan': ['#0B2A33', '#0A0A0F'],
  'tone-dark': ['#1A1A26', '#0A0A0F'],
  'tone-split': null
};
function exportDims() {
  // Resolución completa del formato (antes 540×960, la mitad de 1080×1920).
  if (state.format === '9:16') return { w: 1080, h: 1920 };
  if (state.format === '1:1') return { w: 1080, h: 1080 };
  return { w: 1920, h: 1080 };
}
function wrapText(ctx, text, maxW) {
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  words.forEach(w => {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
    else line = test;
  });
  if (line) lines.push(line);
  return lines;
}
function drawHeadline(ctx, s, x, y, lineH, maxW) {
  // Headline con el mismo degradado flare del preview: las palabras del
  // highlight (headlineHl) van en degradado ámbar→coral→violeta, el resto
  // en blanco. Usa las mismas fuentes de la página (Space Grotesk).
  const grad = ctx.createLinearGradient(x, 0, x + maxW, 0);
  grad.addColorStop(0, '#FFB020'); grad.addColorStop(0.5, '#FF5A3C'); grad.addColorStop(1, '#8B5CF6');
  const hlWords = new Set(String(s.headlineHl || '').split(' ').filter(Boolean));
  let cy = y;
  wrapText(ctx, s.headline || '', maxW).forEach(ln => {
    const words = ln.split(' ');
    let cx = x;
    words.forEach((w, wi) => {
      const word = w + (wi < words.length - 1 ? ' ' : '');
      ctx.fillStyle = hlWords.has(w) ? grad : '#F5F5F2';
      ctx.fillText(word, cx, cy);
      cx += ctx.measureText(word).width;
    });
    cy += lineH;
  });
  return cy;
}
function drawVisualShape(ctx, kind, cx, cy, w, h, s) {
  // Visual de producto dibujado en canvas (mismo arte CSS que el preview,
  // en formas: luna, cama, sol, pantalla, barras…). Nada de texto placeholder.
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const R = Math.min(w, h);
  if (kind === 'moon' || kind === 'sun') {
    const g = ctx.createRadialGradient(cx - R * 0.15, cy - R * 0.15, R * 0.1, cx, cy, R * 0.5);
    if (kind === 'moon') { g.addColorStop(0, '#fffbe6'); g.addColorStop(0.6, '#ffd76a'); g.addColorStop(1, '#f5b942'); }
    else { g.addColorStop(0, '#fff8d6'); g.addColorStop(0.65, '#ffb703'); g.addColorStop(1, '#fb8500'); }
    ctx.shadowColor = kind === 'moon' ? 'rgba(255,215,106,.55)' : 'rgba(255,183,3,.5)';
    ctx.shadowBlur = R * 0.35;
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.32, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'zzz') {
    ctx.fillStyle = '#fff';
    ctx.font = '700 ' + Math.round(R * 0.42) + 'px "Space Grotesk", sans-serif';
    ctx.fillText('Z z z', cx, cy);
  } else if (kind === 'bed') {
    ctx.fillStyle = '#c9b8f5';
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(cx - w * 0.42, cy - h * 0.28, w * 0.84, h * 0.56, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.roundRect(cx - w * 0.36, cy - h * 0.42, w * 0.2, h * 0.22, 10); ctx.fill();
  } else if (kind === 'breeze') {
    const g = ctx.createLinearGradient(cx - w * 0.4, 0, cx + w * 0.4, 0);
    g.addColorStop(0, '#6ee7ff'); g.addColorStop(1, '#8b5cf6');
    ctx.strokeStyle = g; ctx.lineWidth = 7; ctx.lineCap = 'round';
    [0.42, 0.32, 0.22].forEach((f, i) => {
      ctx.beginPath();
      ctx.moveTo(cx - w * f, cy - h * 0.28 + i * h * 0.28);
      ctx.lineTo(cx + w * f, cy - h * 0.28 + i * h * 0.28);
      ctx.stroke();
    });
  } else if (kind === 'badge') {
    const label = s.kicker || s.product || '';
    ctx.font = '900 ' + Math.round(R * 0.22) + 'px Inter, sans-serif';
    const tw = ctx.measureText(label).width + 44;
    const g = ctx.createLinearGradient(cx - tw / 2, 0, cx + tw / 2, 0);
    g.addColorStop(0, '#FFB020'); g.addColorStop(0.5, '#FF5A3C'); g.addColorStop(1, '#8B5CF6');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(cx - tw / 2, cy - h * 0.3, tw, h * 0.6, 999); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(label, cx, cy + 1);
  } else if (kind === 'screen') {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.roundRect(cx - w * 0.44, cy - h * 0.42, w * 0.88, h * 0.84, 12); ctx.fill();
    const bars = [['#1b2a6b', 0.72], ['#6ee7ff', 0.52], ['#9aa8ff', 0.36]];
    bars.forEach(([c, f], i) => {
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.roundRect(cx - w * 0.36, cy - h * 0.3 + i * h * 0.26, w * 0.72 * f, h * 0.13, 99); ctx.fill();
    });
  } else if (kind === 'boxes') {
    for (let i = -1; i <= 1; i++) {
      ctx.fillStyle = i === 0 ? '#8b5cf6' : 'rgba(255,255,255,.92)';
      ctx.beginPath(); ctx.roundRect(cx + i * w * 0.3 - w * 0.13, cy - h * 0.3, w * 0.26, h * 0.6, 9); ctx.fill();
    }
  } else if (kind === 'receipt') {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.roundRect(cx - w * 0.34, cy - h * 0.42, w * 0.68, h * 0.84, 10); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.font = '700 ' + Math.round(R * 0.2) + 'px Inter, sans-serif';
    ctx.fillText('✓ Enviada', cx, cy - h * 0.12);
    ctx.fillStyle = '#555';
    ctx.font = '400 ' + Math.round(R * 0.16) + 'px Inter, sans-serif';
    ctx.fillText('Factura electrónica', cx, cy + h * 0.22);
  } else if (kind === 'check') {
    ctx.fillStyle = '#6ee7ff';
    ctx.font = '900 ' + Math.round(R * 0.4) + 'px Inter, sans-serif';
    ctx.fillText('✓ ✓ ✓', cx, cy);
  } else if (kind === 'chart-up' || kind === 'chart-down') {
    const hs = kind === 'chart-up' ? [0.3, 0.55, 0.8, 1] : [1, 0.7, 0.45, 0.25];
    const g = ctx.createLinearGradient(cx, cy - h * 0.4, cx, cy + h * 0.4);
    if (kind === 'chart-up') { g.addColorStop(0, '#22c55e'); g.addColorStop(1, '#a3e635'); }
    else { g.addColorStop(0, '#8b5cf6'); g.addColorStop(1, '#ff4d8d'); }
    ctx.fillStyle = g;
    hs.forEach((f, i) => {
      ctx.beginPath(); ctx.roundRect(cx - w * 0.4 + i * w * 0.21, cy + h * 0.4 - h * 0.8 * f, w * 0.15, h * 0.8 * f, 6); ctx.fill();
    });
  } else if (kind === 'layers') {
    const g = ctx.createLinearGradient(cx - w * 0.4, 0, cx + w * 0.4, 0);
    g.addColorStop(0, '#8b5cf6'); g.addColorStop(1, '#ff4d8d');
    ctx.fillStyle = g;
    [0.4, 0.3, 0.2].forEach((f, i) => {
      ctx.beginPath(); ctx.roundRect(cx - w * f, cy - h * 0.3 + i * h * 0.3, w * 2 * f, h * 0.16, 99); ctx.fill();
    });
  } else if (kind === 'search') {
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(cx - R * 0.05, cy - R * 0.05, R * 0.26, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + R * 0.14, cy + R * 0.14); ctx.lineTo(cx + R * 0.36, cy + R * 0.36); ctx.stroke();
  } else if (kind === 'clock') {
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.32, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - R * 0.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R * 0.16, cy); ctx.stroke();
  } else if (kind === 'paper') {
    // Documento real, no una barra blanca vacía: hoja con sombra, banda de
    // título, líneas de texto simuladas y sello verde con check.
    const pw = w * 0.6, ph = h * 0.72, px = cx - pw / 2, py = cy - ph / 2;
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.roundRect(px + 12, py + 12, pw, ph, 8); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 8); ctx.fill();
    // banda de título + líneas de texto
    ctx.fillStyle = '#1b2a6b';
    ctx.beginPath(); ctx.roundRect(px + pw * 0.1, py + ph * 0.12, pw * 0.5, ph * 0.09, 99); ctx.fill();
    ctx.fillStyle = '#c7d2e8';
    [[0.72, 0.3], [0.6, 0.46], [0.72, 0.62]].forEach(([f, yf]) => {
      ctx.beginPath(); ctx.roundRect(px + pw * 0.1, py + ph * yf, pw * f, ph * 0.07, 99); ctx.fill();
    });
    // sello verde con check en la esquina inferior derecha
    const sx = px + pw * 0.78, sy = py + ph * 0.78, sr = Math.min(pw, ph) * 0.16;
    ctx.fillStyle = '#22c55e';
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2, sr * 0.28); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(sx - sr * 0.45, sy); ctx.lineTo(sx - sr * 0.1, sy + sr * 0.35); ctx.lineTo(sx + sr * 0.5, sy - sr * 0.35); ctx.stroke();
  } else if (kind === 'avatar') {
    // Avatar real: círculo con iniciales "AR" + anillo en degradado flare.
    const g = ctx.createLinearGradient(cx - R * 0.3, cy - R * 0.3, cx + R * 0.3, cy + R * 0.3);
    g.addColorStop(0, '#FFB020'); g.addColorStop(0.5, '#FF5A3C'); g.addColorStop(1, '#8B5CF6');
    ctx.strokeStyle = g; ctx.lineWidth = Math.max(5, R * 0.07);
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.34, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#1a1a26';
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '800 ' + Math.round(R * 0.28) + 'px Inter, sans-serif';
    ctx.fillText('AR', cx, cy + 1);
  }
  ctx.restore();
}
function drawFrame(ctx, s, localT, W, H) {
  const p = clamp(localT / 0.6, 0, 1); // progreso de la entrada (0.6 s)
  const u = Math.min(W, H); // unidad de escala: la tipografía no explota en 16:9
  const pad = Math.round(u * 0.07);
  // Posiciones por formato (en 16:9 y 1:1 el headline arranca más arriba
  // para que quepan sub + visual + CTA + caption sin solaparse).
  const headY = state.format === '16:9' ? H * 0.24 : state.format === '1:1' ? H * 0.26 : H * 0.30;
  const visY = state.format === '1:1' ? H * 0.64 : state.format === '16:9' ? H * 0.62 : H * 0.60;
  const visH = Math.round(H * (state.format === '1:1' ? 0.11 : 0.12));
  if (s.split) {
    ctx.fillStyle = '#17171F';
    ctx.fillRect(0, 0, W / 2, H);
    const g = ctx.createLinearGradient(W / 2, 0, W, H);
    g.addColorStop(0, '#FFB020'); g.addColorStop(0.5, '#FF5A3C'); g.addColorStop(1, '#8B5CF6');
    ctx.fillStyle = g;
    ctx.fillRect(W / 2, 0, W / 2, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = '600 ' + Math.round(u * 0.03) + 'px "JetBrains Mono", monospace';
    ctx.fillText('ANTES', W * 0.25, H * 0.45);
    ctx.fillText('DESPUÉS', W * 0.75, H * 0.45);
    ctx.font = '700 ' + Math.round(u * 0.07) + 'px "Space Grotesk", sans-serif';
    ctx.fillText('apagado', W * 0.25, H * 0.53);
    ctx.fillText('glow total', W * 0.75, H * 0.53);
  } else {
    const cols = TONE_BG[s.tone] || ['#1A1A26', '#0A0A0F'];
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha = p;
    ctx.fillStyle = '#FFB020';
    ctx.font = '600 ' + Math.round(u * 0.028) + 'px "JetBrains Mono", monospace';
    ctx.fillText((s.kicker || '').toUpperCase(), pad, headY + (1 - p) * 24);
    ctx.font = '700 ' + Math.round(u * 0.085) + 'px "Space Grotesk", sans-serif';
    const lineH = Math.round(u * 0.105);
    const afterHeadline = drawHeadline(ctx, s, pad, headY + (1 - p) * 24 + lineH, lineH, W - pad * 2);
    ctx.fillStyle = 'rgba(245,245,242,.78)';
    ctx.font = '400 ' + Math.round(u * 0.036) + 'px Inter, sans-serif';
    wrapText(ctx, s.sub || '', W - pad * 2).forEach((ln, i) => ctx.fillText(ln, pad, afterHeadline + 26 + i * Math.round(u * 0.05)));
    // caja visual con el arte del producto (nunca texto placeholder)
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.strokeStyle = 'rgba(255,255,255,.16)';
    ctx.beginPath();
    ctx.roundRect(pad, visY, W - pad * 2, visH, 16);
    ctx.fill(); ctx.stroke();
    drawVisualShape(ctx, s.visualKind, W / 2, visY + visH / 2, W - pad * 2, visH, s);
    if (s.isCTA) {
      const cg = ctx.createLinearGradient(pad, 0, W - pad, 0);
      cg.addColorStop(0, '#FFB020'); cg.addColorStop(0.5, '#FF5A3C'); cg.addColorStop(1, '#8B5CF6');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.roundRect(pad, H * 0.76, W - pad * 2, Math.round(H * 0.055), 999);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '700 ' + Math.round(u * 0.036) + 'px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(s.ctaLabel || 'Comprar ahora', W / 2, H * 0.76 + Math.round(H * 0.037));
      ctx.textAlign = 'left';
    }
  }
  // caption inferior DENTRO de la safe zone: su borde inferior queda justo
  // en el 90% de la altura (antes quedaba al 93%, fuera del margen del 10%).
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  const capH = Math.round(H * 0.075);
  const capY = Math.round(H * 0.90 - capH);
  ctx.beginPath();
  ctx.roundRect(pad, capY, W - pad * 2, capH, 12);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '600 ' + Math.round(u * 0.03) + 'px Inter, sans-serif';
  ctx.textAlign = 'left';
  wrapText(ctx, s.caption || '', W - pad * 2 - 20).slice(0, 2).forEach((ln, i) =>
    ctx.fillText(ln, pad + 12, capY + Math.round(capH * 0.38) + i * Math.round(u * 0.038)));
  ctx.globalAlpha = 1;
}
async function exportWebM() {
  const status = $('#export-status');
  if (state.exporting) return;
  if (!('MediaRecorder' in window) || !HTMLCanvasElement.prototype.captureStream) {
    status.textContent = 'Tu navegador no soporta grabación con MediaRecorder. Prueba en Chrome o Edge.';
    logLine('warn', 'Exportación WebM no soportada en este navegador.', 'EXPORT');
    return;
  }
  pause();
  // Las fuentes de la página (Space Grotesk / Inter) deben estar cargadas
  // antes de dibujar en el canvas, o el vídeo saldría con otra tipografía.
  try { await document.fonts.ready; } catch (e) { /* fuentes no disponibles: se usa el fallback */ }
  const dims = exportDims();
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); return this; };
  }
  const canvas = document.createElement('canvas');
  canvas.width = dims.w; canvas.height = dims.h;
  const ctx = canvas.getContext('2d');
  const stream = canvas.captureStream(30);
  let mime = 'video/webm;codecs=vp9';
  if (typeof MediaRecorder.isTypeSupported === 'function' && !MediaRecorder.isTypeSupported(mime)) mime = 'video/webm';
  let rec;
  try {
    // Bitrate acorde a la resolución completa (1080×1920 / 1920×1080).
    const vbps = (dims.w >= 1920 || dims.h >= 1920) ? 12000000 : 10000000;
    rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: vbps });
  } catch (e) {
    status.textContent = 'No se pudo iniciar MediaRecorder en este navegador.';
    return;
  }
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  rec.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'flare-' + state.templateId + '-' + state.format.replace(':', 'x') + '.webm';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    state.exporting = false;
    status.textContent = 'Video WebM exportado (' + (blob.size / 1048576).toFixed(1) + ' MB).';
    logLine('ok', 'Video WebM exportado: ' + a.download + ' (' + (blob.size / 1048576).toFixed(1) + ' MB).', 'EXPORT');
    $('#btn-export-webm').disabled = false;
    $('#btn-export-webm').textContent = 'Exportar video (WebM)';
  };
  state.exporting = true;
  $('#btn-export-webm').disabled = true;
  $('#btn-export-webm').textContent = 'Grabando…';
  logLine('info', 'Exportando video WebM: reproduciendo la timeline y capturando el canvas a 30 fps…', 'EXPORT');
  rec.start(250);
  const total = totalDuration();
  const t0 = performance.now();
  const tick = (now) => {
    const t = (now - t0) / 1000;
    if (t >= total) {
      const s = state.scenes[state.scenes.length - 1];
      drawFrame(ctx, s, s.duration, dims.w, dims.h);
      seekTo(total);
      status.textContent = 'Finalizando exportación…';
      rec.stop();
      return;
    }
    const idx = sceneAt(t);
    const s = state.scenes[idx];
    drawFrame(ctx, s, t - s.start, dims.w, dims.h);
    seekTo(t);
    status.textContent = 'Grabando… ' + t.toFixed(1) + ' s / ' + total.toFixed(1) + ' s';
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ================= EXPORTAR: STORYBOARD HTML ================= */
function exportStoryboard() {
  const r = computeRetention();
  const rows = state.scenes.map((s, i) =>
    '<section class="sb-scene"><div class="sb-num">' + (i + 1) + '</div><div><h3>' + esc(s.name) +
    ' <span>' + s.start.toFixed(1) + '–' + (s.start + s.duration).toFixed(1) + ' s</span></h3>' +
    '<p class="sb-head">' + esc(s.headline || 'Antes / Después (pantalla partida)') + '</p>' +
    '<p>' + esc(s.sub || '') + '</p>' +
    '<p class="sb-cap">Caption (' + s.captionDuration + ' s): “' + esc(s.caption) + '”</p>' +
    (s.isCTA ? '<p class="sb-cta">' + esc(s.ctaLabel || '') + '</p>' : '') + '</div></section>').join('\n');
  const html = '<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="UTF-8">\n<title>Storyboard — ' + esc(state.product) + ' · Flare</title>\n' +
    '<style>body{font-family:Inter,system-ui,sans-serif;background:#0A0A0F;color:#F5F5F2;margin:0;padding:40px}h1{font-family:"Space Grotesk",sans-serif;font-size:32px}h1 span{background:linear-gradient(135deg,#FFB020,#FF5A3C,#8B5CF6);-webkit-background-clip:text;background-clip:text;color:transparent}.meta{color:#9A9AA8}.sb-scene{display:flex;gap:16px;background:#12121A;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:20px;margin:14px 0}.sb-num{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#FFB020,#FF5A3C,#8B5CF6);display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;flex:none}.sb-scene h3 span{color:#9A9AA8;font-size:14px;font-weight:400}.sb-head{font-size:19px;font-weight:700}.sb-cap{color:#9A9AA8}.sb-cta{display:inline-block;background:linear-gradient(135deg,#FFB020,#FF5A3C,#8B5CF6);padding:8px 16px;border-radius:999px;font-weight:700}</style>\n</head>\n<body>\n' +
    '<h1>Storyboard — <span>' + esc(state.product) + '</span></h1>\n' +
    '<p class="meta">Flare Studio · ' + esc(TEMPLATES[state.templateId].name) + ' · Formato ' + state.format + ' · ' + totalDuration() + ' s · Score de retención ' + r.total + '/100</p>\n' +
    rows + '\n<p class="meta">Generado con Flare Studio. Catch the eye. Hold the scroll. Earn the click.</p>\n</body>\n</html>';
  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'flare-storyboard-' + state.templateId + '.html';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  logLine('ok', 'Storyboard HTML exportado: ' + a.download, 'EXPORT');
}

/* ================= MENÚ RESPONSIVE (hamburguesa, B6) ================= */
function initNavToggle() {
  const toggle = $('#nav-toggle');
  const links = $('#nav-links');
  if (!toggle || !links) return;
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? '✕' : '☰';
  });
  $$('a', links).forEach(a => a.addEventListener('click', () => {
    links.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = '☰';
  }));
}

/* ================= SPOTLIGHT EN TARJETAS ================= */
function initSpotlight() {
  document.addEventListener('pointermove', (e) => {
    const card = e.target.closest && e.target.closest('.spot');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
    card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
  }, { passive: true });
}

/* ================= PERSISTENCIA DEL STUDIO (localStorage) =================
   Las ediciones de escenas/captions y la plantilla activa sobreviven a la
   recarga. "Restablecer plantilla" descarta los cambios y vuelve a la
   plantilla original. */
const LS_STUDIO = 'flare.studio.state';
function saveStudioState() {
  try {
    localStorage.setItem(LS_STUDIO, JSON.stringify({
      templateId: state.templateId, format: state.format,
      product: state.product, productLine: state.productLine,
      scenes: state.scenes, selectedScene: state.selectedScene
    }));
  } catch (e) { /* sin localStorage: el estado solo vive en memoria */ }
}
function loadStudioState() {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_STUDIO) || 'null');
    if (!saved || !Array.isArray(saved.scenes) || !saved.scenes.length) return null;
    if (!TEMPLATES[saved.templateId]) return null;
    return saved;
  } catch (e) { return null; }
}
function applyStudioState(saved) {
  pause();
  state.templateId = saved.templateId;
  state.product = saved.product;
  state.productLine = saved.productLine;
  state.scenes = saved.scenes;
  // El safe NO es un campo editable por el usuario: se re-deriva de la
  // plantilla actual (posición real en scenes.html). Sin esto, un estado
  // guardado con safe=true seguiría puntuando 10/10 aunque el HTML
  // real hubiera cambiado a bottom:0% (el probe de safe zones).
  const tpl = TEMPLATES[saved.templateId];
  if (tpl && tpl.scenes.length === state.scenes.length) {
    state.scenes.forEach((s, i) => { s.safe = tpl.scenes[i].safe; s.ctaSafe = tpl.scenes[i].ctaSafe; });
  }
  state.selectedScene = Math.min(saved.selectedScene || 0, state.scenes.length - 1);
  state.currentTime = 0;
  const sel = $('#template-select');
  if (sel) sel.value = saved.templateId;
  const t = TEMPLATES[saved.templateId];
  setFormat(saved.format || (t && t.format) || '9:16', false);
  renderComposition();
  buildMasterTimeline();
  renderTimeline();
  renderRetention();
  seekTo(0);
  updateCommandBox();
}

/* ================= PLANTILLAS ================= */
function loadTemplate(id, opts) {
  const t = TEMPLATES[id];
  if (!t) return;
  pause();
  state.templateId = id;
  state.product = t.product;
  state.productLine = t.productLine;
  state.scenes = JSON.parse(JSON.stringify(t.scenes));
  state.selectedScene = 0;
  state.currentTime = 0;
  const sel = $('#template-select');
  if (sel) sel.value = id;
  setFormat(t.format, false);
  renderComposition();
  buildMasterTimeline();
  renderTimeline();
  renderRetention();
  saveStudioState();
  seekTo(0);
  updateCommandBox();
  if (opts && opts.scroll) {
    $('#studio').scrollIntoView({ behavior: 'smooth' });
    flashWindow('win-preview');
  }
}

/* ================= INIT ================= */
document.addEventListener('DOMContentLoaded', () => {
  // Banner file:// (R4-2): visible SOLO cuando la app se abre directa con
  // file://, nunca por HTTP. Sin servidor los scores puntúan
  // conservadoramente (Safe 0/10) y la landing mostraba 75/100 sin
  // explicar por qué; el banner lo explica y dice cómo servir por HTTP.
  if (window.location.protocol === 'file:') {
    $$('.file-banner').forEach(b => { b.hidden = false; });
  }
  heroIntro();
  scrollReveals();
  initWindows();
  initSpotlight();
  initNavToggle();

  // Plantillas reales (examples/) con fallback embebido; después se restaura
  // el estado guardado del Studio si existe, si no la plantilla por defecto.
  // El brief y el score necesitan escenas cargadas, así que la carga va
  // ANTES de applyAgent.
  loadRealTemplates().then(() => {
    renderTemplateScores();
    const saved = loadStudioState();
    if (saved) applyStudioState(saved);
    else loadTemplate('colchon-descanso-total');
  });

  // Agente
  $('#agent-select').addEventListener('change', (e) => applyAgent(e.target.value));
  loadProviderSaved(); // antes de applyAgent: el comando incluye el proveedor
  applyAgent(state.agent);

  // Proveedor (BYO key): la key se conserva POR PROVEEDOR. Al cambiar de
  // proveedor se guarda la key tecleada del actual y se recupera la del
  // nuevo; nunca se borra silenciosamente (Menor 3).
  $('#provider-select').addEventListener('change', (e) => {
    stashProviderKey(state.provider, $('#provider-key').value);
    state.provider = e.target.value;
    state.providerKey = readKeyMap()[state.provider] || '';
    $('#provider-key').value = state.providerKey;
    fillProviderFields(false);
    updateCommandBox();
  });
  $('#btn-provider-save').addEventListener('click', saveProvider);
  $('#btn-provider-clear').addEventListener('click', () => {
    const map = readKeyMap();
    delete map[state.provider];
    writeKeyMap(map);
    state.providerKey = '';
    $('#provider-key').value = '';
    updateProviderSavedLabel();
    updateCommandBox();
    logLine('warn', 'Key de ' + PROVIDERS[state.provider].name + ' eliminada de este navegador.', 'PROVEEDOR');
  });

  // Formato
  $$('.format-switch button').forEach(b => b.addEventListener('click', () => setFormat(b.dataset.format)));

  // Plantillas
  $('#template-select').addEventListener('change', (e) => loadTemplate(e.target.value));
  $$('[data-use-template]').forEach(b => b.addEventListener('click', () => loadTemplate(b.dataset.useTemplate, { scroll: true })));
  $('#btn-reset-template').addEventListener('click', () => {
    try { localStorage.removeItem(LS_STUDIO); } catch (e) { /* noop */ }
    loadTemplate(state.templateId);
    logLine('info', 'Plantilla restablecida: se descartaron los cambios del Studio.', 'STUDIO');
  });

  // Reproducción
  $('#btn-play').addEventListener('click', () => (state.playing ? pause() : play()));
  $('#btn-restart').addEventListener('click', () => { pause(); seekTo(0); });
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
    e.preventDefault();
    state.playing ? pause() : play();
  });

  // Simulación y brief
  $('#btn-simulate').addEventListener('click', simulateAgent);
  $('#btn-generate').addEventListener('click', () => {
    const built = buildBrief();
    $('#brief-output').value = built.brief;
    updateCommandBox();
    $('#generate-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    logLine('ok', 'Brief generado para ' + AGENTS[state.agent].name + ' · proveedor ' + PROVIDERS[state.provider].name + ' · score ' + computeRetention().total + '/100.', 'BRIEF');
  });
  $('#btn-copy-brief').addEventListener('click', () => {
    const v = $('#brief-output').value;
    if (!v) { $('#copy-feedback').textContent = 'Genera el brief primero.'; return; }
    copyText(v, 'Brief copiado al portapapeles.');
  });
  $('#btn-copy-command').addEventListener('click', () => copyText($('#command-box').textContent, 'Comando copiado al portapapeles.'));

  // Exportar
  $('#btn-export-webm').addEventListener('click', exportWebM);
  $('#btn-export-board').addEventListener('click', exportStoryboard);

  // Footer
  $$('[data-footer-skill]').forEach(a => a.addEventListener('click', (e) => {
    e.preventDefault();
    $('#btn-generate').click();
    $('#studio').scrollIntoView({ behavior: 'smooth' });
  }));
  $$('[data-footer-renderer]').forEach(a => a.addEventListener('click', (e) => {
    e.preventDefault();
    $('#studio').scrollIntoView({ behavior: 'smooth' });
    logLine('info', 'Render en web: botón «Exportar video (WebM)» en el Preview. MP4 local opcional con el CLI Node + FFmpeg (ver README del proyecto).', 'RENDER');
  }));
  $$('[data-footer-examples]').forEach(a => a.addEventListener('click', (e) => {
    e.preventDefault();
    $('#plantillas').scrollIntoView({ behavior: 'smooth' });
  }));

  setAgentState('inactivo', false);
});
