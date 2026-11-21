// parse.js — Parse a Flare scenes file (scenes.html / fixture.html)
// into a plain timeline object. Zero dependencies, Node 22+ compatible
// (no Node 24-only APIs). Parsing is regex-based on purpose: the input
// is a small, author-controlled HTML file, not arbitrary web HTML.
//
// TWO SPELLINGS ARE ACCEPTED (both mean the same thing):
//   - Canonical (skills/SKILL.md, examples/): class-based —
//     <section class="clip" data-start data-duration>,
//     <p class="caption" data-start data-duration>,
//     <div class="cta" data-start data-duration>.
//   - Attribute-based (renderer fixtures): data-scene / data-clip /
//     data-caption / data-cta attributes.
// A scene is a .clip/.scene element (or data-scene); clips are the cuts
// the score rule "cortes 2-4s" evaluates (scenes double as clips).

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Candidate entry files, in priority order.
export const ENTRY_CANDIDATES = ['scenes.html', 'fixture.html'];

export function findEntryFile(dir) {
  const abs = resolve(dir);
  if (!existsSync(abs)) return null;
  for (const name of ENTRY_CANDIDATES) {
    const p = join(abs, name);
    if (existsSync(p)) return p;
  }
  // Fallback: any single *.html file in the directory.
  const htmls = readdirSync(abs).filter((f) => f.endsWith('.html')).sort();
  if (htmls.length === 1) return join(abs, htmls[0]);
  if (htmls.length > 1) return join(abs, htmls[0]);
  return null;
}

// --- CSS rules needed for real position checks -------------------------
// The retention "safe zones" rule must be verified from REAL positions,
// never from a substring such as "10%" anywhere in the file (a decorative
// gradient once faked a pass). We extract the declarations of the
// `.caption` / `.cta` class rules (and the `#stage` background, for the
// storyboard) from the <style> blocks. Later rules win, as in CSS.
function extractCssRules(source) {
  const rules = { caption: '', cta: '', stageBg: null };
  const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let sm;
  while ((sm = styleRe.exec(source)) !== null) {
    const css = sm[1];
    const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
    let rm;
    while ((rm = ruleRe.exec(css)) !== null) {
      const selector = rm[1];
      const decls = rm[2];
      if (/(^|[^\w-])\.caption([^\w-]|$)/.test(selector)) rules.caption += `${decls};`;
      if (/(^|[^\w-])\.cta([^\w-]|$)/.test(selector)) rules.cta += `${decls};`;
      if (/(^|[^\w-])#stage([^\w-]|$)/.test(selector) && rules.stageBg === null) {
        const bg = decls.match(/background\s*:\s*([^;]+)/i) || decls.match(/background-color\s*:\s*([^;]+)/i);
        if (bg) rules.stageBg = bg[1].trim();
      }
    }
  }
  return rules;
}

// Merge a class-rule declaration string with an element's inline style.
// Inline wins (last occurrence wins when score.js parses the result).
function mergeStyles(classRule, inlineStyle) {
  const parts = [];
  if (classRule) parts.push(classRule);
  if (inlineStyle) parts.push(inlineStyle);
  return parts.join(';');
}

function lineOf(source, index) {
  // 1-based line number for a character offset (approximate, by design).
  return source.slice(0, index).split('\n').length;
}

function parseAttrs(tag) {
  const attrs = {};
  const re = /([\w-]+)\s*=\s*"([^"]*)"|([\w-]+)\s*=\s*'([^']*)'/g;
  let m;
  while ((m = re.exec(tag)) !== null) {
    attrs[m[1] || m[3]] = m[2] ?? m[4] ?? '';
  }
  return attrs;
}

function hasClass(attrs, name) {
  return (attrs.class || '').split(/\s+/).includes(name);
}

// Presence of a valueless attribute (e.g. <div data-caption>) is not
// captured by parseAttrs (it needs = "..."), so check the raw tag text.
function hasAttr(tag, name) {
  return new RegExp(`\\b${name}(\\s*=|\\s|>|/)`).test(tag);
}

function num(v) {
  if (v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function stripTags(s) {
  // Las etiquetas se sustituyen por un espacio, no por nada: sin él,
  // "¿Dormiste mal<br>otra vez?" se concatenaba como "malotra vez?"
  // en el texto del storyboard (O1 R5b). El espacio no va antes de
  // un signo de puntuación ("papeleo ?" -> "papeleo?").
  return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').replace(/\s+([.,;:!?…%])/g, '$1').trim();
}

// Trunca sin cortar a mitad de palabra: si el texto supera `max`,
// se corta en el último espacio <= max y se añade "…".
function truncateText(s, max = 200) {
  if (s.length <= max) return s;
  const cut = s.lastIndexOf(' ', max);
  return (cut > 0 ? s.slice(0, cut) : s.slice(0, max)) + '…';
}

// Extract the inner HTML of an element starting at `startIdx` (the index
// just after its opening tag) up to its matching close tag, by tag name.
function innerHtml(source, startIdx, tagName) {
  const close = source.indexOf(`</${tagName}`, startIdx);
  if (close === -1) return '';
  return source.slice(startIdx, close);
}

// Extract the inner text of an element starting at `startIdx` (the index
// just after its opening tag) up to its matching close tag, by tag name.
function innerText(source, startIdx, tagName) {
  return stripTags(innerHtml(source, startIdx, tagName));
}

// Blank the inside of <script>…</script> and <style>…</style> blocks
// (same length, so offsets stay valid): their JS/CSS can contain text
// that looks like tags (e.g. `a < b`) and must never be parsed as markup.
function blankScriptStyle(source) {
  let out = source;
  for (const tag of ['script', 'style']) {
    const re = new RegExp(`(<${tag}[^>]*>)([\\s\\S]*?)(</${tag}>)`, 'gi');
    out = out.replace(re, (_m, open, inner, close) => open + ' '.repeat(inner.length) + close);
  }
  return out;
}

export function parseScenesFile(filePath) {
  const source = readFileSync(filePath, 'utf8');
  const errors = [];
  const warnings = [];

  // --- Composition root -------------------------------------------------
  // The root is the element carrying data-composition-id (usually <body>
  // or a wrapper <div>). Fall back to the first element with data-width.
  const rootRe = /<([a-zA-Z][\w-]*)[^>]*\bdata-composition-id\s*=\s*["']([^"']+)["'][^>]*>/;
  const rootMatch = source.match(rootRe);
  let compositionId = null;
  let width = null;
  let height = null;
  let duration = null;
  let rootLine = 1;
  let rootAttrs = {};

  if (rootMatch) {
    rootAttrs = parseAttrs(rootMatch[0]);
    compositionId = rootAttrs['data-composition-id'] || null;
    width = num(rootAttrs['data-width']);
    height = num(rootAttrs['data-height']);
    duration = num(rootAttrs['data-duration']);
    rootLine = lineOf(source, rootMatch.index);
  } else {
    errors.push({
      file: filePath, line: 1,
      message: 'Missing data-composition-id on the composition root element (e.g. <body data-composition-id="my-ad" data-width="1080" data-height="1920" data-duration="6">).',
    });
  }

  if (rootMatch) {
    if (width === null || width <= 0) {
      errors.push({ file: filePath, line: rootLine, message: `Invalid or missing data-width (got "${rootAttrs['data-width'] ?? ''}"). Expected a positive number, e.g. 1080.` });
    }
    if (height === null || height <= 0) {
      errors.push({ file: filePath, line: rootLine, message: `Invalid or missing data-height (got "${rootAttrs['data-height'] ?? ''}"). Expected a positive number, e.g. 1920.` });
    }
    if (duration === null || duration <= 0) {
      errors.push({ file: filePath, line: rootLine, message: `Invalid or missing data-duration (got "${rootAttrs['data-duration'] ?? ''}"). Expected total duration in seconds, e.g. 6.` });
    }
  }

  // --- Unified tag scan -------------------------------------------------
  // One pass over opening tags (script/style bodies blanked). Each tag is
  // classified by its data-* attributes first, then by its class tokens.
  const scenes = [];
  const clips = [];
  const captions = [];
  const ctas = [];
  const cssRules = extractCssRules(source);
  // Stage background: inline style on the composition root wins over the
  // #stage CSS rule (used by the storyboard as the real background).
  let stageBg = cssRules.stageBg;
  const stageInlineBg = (rootAttrs.style || '').match(/background\s*:\s*([^;]+)/i);
  if (stageInlineBg) stageBg = stageInlineBg[1].trim();
  const scanned = blankScriptStyle(source);
  const tagRe = /<([a-zA-Z][\w-]*)[^>]*>/g;
  let m;
  while ((m = tagRe.exec(scanned)) !== null) {
    const tagName = m[1].toLowerCase();
    if (tagName === 'script' || tagName === 'style') continue;
    const rawTag = m[0];
    const attrs = parseAttrs(rawTag);
    const start = num(attrs['data-start']);
    const dur = num(attrs['data-duration']);
    const line = lineOf(source, m.index);
    const text = truncateText(innerText(source, m.index + m[0].length, m[1]));

    const isScene = hasAttr(rawTag, 'data-scene') || hasClass(attrs, 'clip') || hasClass(attrs, 'scene');
    const isClip = hasAttr(rawTag, 'data-clip') || hasClass(attrs, 'clip');
    const isCaption = hasAttr(rawTag, 'data-caption') || hasClass(attrs, 'caption');
    const isCta = hasAttr(rawTag, 'data-cta') || hasClass(attrs, 'cta');
    if (!isScene && !isClip && !isCaption && !isCta) continue;

    const checkTimes = (kind, id) => {
      if (start === null) {
        errors.push({ file: filePath, line, message: `${kind} "${id}": missing or invalid data-start (seconds from timeline start).` });
      }
      if (dur === null || dur <= 0) {
        errors.push({ file: filePath, line, message: `${kind} "${id}": missing or invalid data-duration (seconds).` });
      }
    };

    if (isScene) {
      const id = attrs['data-scene'] || attrs.id || `scene-${scenes.length + 1}`;
      checkTimes('Scene', id);
      // Big hook text lives inside the scene (e.g. <h1 class="hook"> with
      // font-size:96px in CSS), not on the scene element itself. A headline
      // (<h1>/<h2>) also counts as hook text (unified retention rule §1).
      const inner = innerHtml(source, m.index + m[0].length, m[1]);
      const hasHookText = /\bclass\s*=\s*["'][^"']*\bhook\b[^"']*["']/.test(inner)
        || /<h[12]\b/i.test(inner)
        || /font-size\s*:\s*([4-9]\d|\d{3,})\s*px/i.test(inner);
      scenes.push({ id, start, duration: dur, bg: attrs['data-bg'] || null, line, text, hasHookText });
    }
    if (isClip) {
      const id = attrs['data-clip'] || attrs.id || `clip-${clips.length + 1}`;
      checkTimes('Clip', id);
      clips.push({ id, start, duration: dur, line });
    }
    if (isCaption) {
      const id = attrs['data-caption'] || attrs.id || `caption-${captions.length + 1}`;
      checkTimes('Caption', id);
      captions.push({ id, start, duration: dur, text, line, style: attrs.style || '', className: attrs.class || '', posStyle: mergeStyles(cssRules.caption, attrs.style || '') });
    }
    if (isCta) {
      const id = attrs['data-cta'] || attrs.id || 'cta';
      checkTimes('CTA', id);
      ctas.push({ id, start, duration: dur, text, line, style: attrs.style || '', className: attrs.class || '', posStyle: mergeStyles(cssRules.cta, attrs.style || '') });
    }
  }
  if (scenes.length === 0) {
    errors.push({ file: filePath, line: rootLine, message: 'No scenes found: add at least one element with class="clip" (or data-scene="...") and data-start/data-duration.' });
  }
  if (ctas.length === 0) {
    errors.push({ file: filePath, line: rootLine, message: 'Missing CTA: add an element with class="cta" (or data-cta) visible in the last 3 seconds (e.g. <div class="cta" data-start="15" data-duration="3">Descúbrelo hoy</div>).' });
  }

  // --- Cross-checks (warnings, not errors) ------------------------------
  if (duration && scenes.length > 0) {
    const covered = scenes.reduce((acc, s) => acc + (s.duration || 0), 0);
    if (Math.abs(covered - duration) > 0.01) {
      warnings.push({ file: filePath, line: rootLine, message: `Scene durations sum to ${covered}s but data-duration is ${duration}s; scenes should tile the full timeline.` });
    }
    for (const s of scenes) {
      if (s.start !== null && s.duration !== null && s.start + s.duration > duration + 0.01) {
        warnings.push({ file: filePath, line: s.line, message: `Scene "${s.id}" ends at ${s.start + s.duration}s, past the ${duration}s timeline.` });
      }
    }
    for (const c of ctas) {
      if (c.start !== null && c.duration !== null) {
        const overlapLast3 = Math.max(0, Math.min(c.start + c.duration, duration) - Math.max(c.start, duration - 3));
        if (overlapLast3 < 2) {
          warnings.push({ file: filePath, line: c.line, message: `CTA "${c.id}" is only visible ${overlapLast3}s inside the last 3s (needs >= 2s).` });
        }
      }
    }
  }
  if (captions.length === 0) {
    warnings.push({ file: filePath, line: rootLine, message: 'No captions found (elements with class="caption" or data-caption). Captions drive the retention score.' });
  }
  if (clips.length === 0 && scenes.length > 0) {
    // Scenes double as clips when no explicit clips exist.
    for (const s of scenes) clips.push({ id: s.id, start: s.start, duration: s.duration, line: s.line });
  }

  return {
    file: filePath,
    source,
    compositionId, width, height, duration,
    scenes, clips, captions, ctas,
    stageBg: stageBg || null,
    errors, warnings,
    valid: errors.length === 0,
  };
}

export function parseDir(dir) {
  const file = findEntryFile(dir);
  if (!file) {
    return {
      file: null, source: '', compositionId: null, width: null, height: null,
      duration: null, scenes: [], clips: [], captions: [], ctas: [],
      stageBg: null,
      errors: [{ file: dir, line: 1, message: `No scenes.html or fixture.html found in ${resolve(dir)}.` }],
      warnings: [], valid: false,
    };
  }
  return parseScenesFile(file);
}
