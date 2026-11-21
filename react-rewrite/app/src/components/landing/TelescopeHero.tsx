// Flare — Hero Telescope (Codrops §8) + tagline Kinetic/Scramble (§1+§2)
// + badge Dojo editorial (§9.2). Solo landing: no toca el Studio.
//
// Mecánica (telescope-zoom, repo joffreysp/telescope-zoom):
// - El header hace pin 100vh; un ScrollTrigger scrubbed escribe
//   --progress (0→1, con power1.inOut) en el elemento.
// - CSS puro mueve las mitades del H1 con --progress y escala el mock
//   del Studio de 0→1; GSAP solo posee la timeline (rejilla z, fronts,
//   fade del contenido) y la intro de carga.
// - prefers-reduced-motion: sin pin, sin scramble, sin fantasmas; el
//   texto queda en su estado final (ver index.css).

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { ArrowRight, Play } from 'lucide-react';
import { NumberTicker } from '../vendor/magicui/number-ticker';
import { Particles } from '../vendor/magicui/particles';
import { ShimmerButton } from '../vendor/magicui/shimmer-button';
import { SplineSlot } from '../studio/SplineSlot';
import {
  isReducedMotion,
  registerCodropsEasings,
  scrambleSequence,
} from './codrops-effects';
import { markPinReady } from './pin-ready';

gsap.registerPlugin(ScrollTrigger, SplitText);

const TAGLINE = 'Atrapa la mirada. Retén el scroll. Gana el click.';
const BADGE_MAIN = 'DOJO AI HACKATHON 2026';

// Rejilla flotante: miniaturas de escenas que vuelan en z al hacer scroll
// (telescope §8: perspective 100vh, z 60vh, stagger desde el centro).
const TILES: Array<{ label: string; top: string; left: string; bg: string }> = [
  { label: 'HOOK · 2 s', top: '9%', left: '3%', bg: 'linear-gradient(135deg, rgba(255,176,32,.30), rgba(255,176,32,.04))' },
  { label: '100/100', top: '22%', left: '11%', bg: 'linear-gradient(135deg, rgba(255,90,60,.30), rgba(255,90,60,.04))' },
  { label: 'CAPTIONS', top: '5%', left: '69%', bg: 'linear-gradient(135deg, rgba(139,92,246,.32), rgba(139,92,246,.05))' },
  { label: 'SAFE 10/10', top: '30%', left: '88%', bg: 'linear-gradient(135deg, rgba(255,176,32,.26), rgba(255,176,32,.04))' },
  { label: 'RITMO', top: '55%', left: '1%', bg: 'linear-gradient(135deg, rgba(139,92,246,.30), rgba(139,92,246,.04))' },
  { label: 'CTA', top: '61%', left: '84%', bg: 'linear-gradient(135deg, rgba(255,90,60,.30), rgba(255,90,60,.04))' },
  { label: '9:16', top: '79%', left: '12%', bg: 'linear-gradient(135deg, rgba(255,176,32,.26), rgba(255,176,32,.04))' },
  { label: '6 ESCENAS', top: '83%', left: '70%', bg: 'linear-gradient(135deg, rgba(139,92,246,.28), rgba(139,92,246,.04))' },
];

// Mock estático del anuncio en el Studio (9:16): lo que el zoom revela.
// No es el PreviewClip real (eso es Studio); es una maqueta CSS del frame.
function StudioMock() {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[20px] border border-white/10 bg-[#12121A] text-left shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(120% 60% at 50% 0%, rgba(255,176,32,0.28), transparent 60%), radial-gradient(120% 70% at 50% 110%, rgba(139,92,246,0.35), transparent 60%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-[10%] rounded-[10px] border border-dashed border-white/25"
        aria-hidden="true"
      />
      <div className="relative flex h-full flex-col p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#FFB020]">
          Descanso Total
        </p>
        <div
          className="mt-4 h-24 w-full rounded-[14px]"
          style={{
            background:
              'linear-gradient(135deg, #FFB020 0%, #FF5A3C 55%, #8B5CF6 100%)',
            opacity: 0.9,
          }}
        />
        <p className="mt-4 font-display text-[26px] font-bold leading-[1.1] text-white">
          Duerme
          <br />
          como nunca.
        </p>
        <p className="mt-2 text-[13px] leading-snug text-[#F5F5F2]/85">
          Colchón Descanso Total — 17,5 s · 6 escenas
        </p>
        <span className="bg-flare mt-auto inline-flex w-fit items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-bold text-white">
          Ver oferta <ArrowRight className="h-3.5 w-3.5" />
        </span>
        <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className="h-1 flex-1 rounded-full bg-white/15"
              style={i < 2 ? { background: '#FFB020' } : undefined}
            />
          ))}
        </div>
        <p className="mt-2 font-mono text-[9px] tracking-[0.18em] text-[#9A9AA8]">
          9:16 · SCORE 100/100
        </p>
      </div>
    </div>
  );
}

// Badge Dojo como línea editorial animada (§9.2): mono ámbar, punto
// pulsante, letras que entran una a una, scramble al entrar y unpack
// al hacer scroll (las pequeñas suben, las de contenido se separan).
function DojoBadge() {
  return (
    <span
      className="dojo-badge hero-fade mb-6 inline-flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[#FFB020]"
      role="text"
      aria-label="Dojo AI Hackathon 2026 — Flare · MIT"
    >
      <span className="dojo-dot h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[#FFB020]" aria-hidden="true" />
      <span className="dojo-letters" aria-hidden="true">
        {BADGE_MAIN.split('').map((c, i) => (
          <span key={i} className="dl-wrap inline-block overflow-hidden align-top">
            <span className="dojo-letter inline-block">{c === ' ' ? '\u00A0' : c}</span>
          </span>
        ))}
      </span>
      <span className="dojo-sep" aria-hidden="true">
        {' — '}
      </span>
      <span className="dojo-flare text-flare" aria-hidden="true">
        FLARE
      </span>
      <span className="dojo-small" aria-hidden="true">
        {' · MIT'}
      </span>
    </span>
  );
}

// Tagline con estela Kinetic (§1, máx 3 fantasmas por carácter) + Cursor
// Scramble (§2 v01). El texto real vive en aria-label; los fantasmas y
// el cursor son decorativos. Clic = reescribir.
function KineticTagline() {
  const rootRef = useRef<HTMLParagraphElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  const runScramble = () => {
    const root = rootRef.current;
    if (!root || isReducedMotion()) return;
    cancelRef.current?.();
    const chars = Array.from(root.querySelectorAll<HTMLElement>('.k-real'));
    chars.forEach((c) => {
      c.style.opacity = '0';
    });
    cancelRef.current = scrambleSequence(chars, cursorRef.current, {
      perChar: 0.035,
      shuffles: 3,
    });
  };

  useEffect(() => {
    // Solo limpieza de los timers del replay por clic.
    return () => {
      cancelRef.current?.();
    };
  }, []);

  return (
    <p
      ref={rootRef}
      className="k-tagline mt-6 cursor-pointer font-display text-xl font-bold sm:text-2xl"
      onClick={runScramble}
      title="Haz clic para reescribir"
      aria-label={TAGLINE}
    >
      <span aria-hidden="true">
        {TAGLINE.split('').map((c, i) => (
          <span key={i} className="kchar">
            <span className="k-ghost g1">{c === ' ' ? '\u00A0' : c}</span>
            <span className="k-ghost g2">{c === ' ' ? '\u00A0' : c}</span>
            <span className="k-ghost g3">{c === ' ' ? '\u00A0' : c}</span>
            <span className="k-real" data-char={c}>
              {c === ' ' ? '\u00A0' : c}
            </span>
          </span>
        ))}
        <span ref={cursorRef} className="k-cursor" aria-hidden="true" />
      </span>
    </p>
  );
}

export function TelescopeHero({ onOpenStudio }: { onOpenStudio: (slug?: string) => void }) {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || isReducedMotion()) return;
    registerCodropsEasings();

    let splitLeft: SplitText | null = null;
    let splitRight: SplitText | null = null;
    let cancelTagline: (() => void) | null = null;

    const setup = () => {
      const leftEl = root.querySelector<HTMLElement>('.t-half-left');
      const rightEl = root.querySelector<HTMLElement>('.t-half-right');
      if (!leftEl || !rightEl) return;
      splitLeft = new SplitText(leftEl, { type: 'words, chars', mask: 'chars', wordsClass: 'st-word' });
      splitRight = new SplitText(rightEl, { type: 'words, chars', mask: 'chars', wordsClass: 'st-word' });
      const sLeft = splitLeft;
      const sRight = splitRight;

      const ctx = gsap.context(() => {
        const eased = gsap.parseEase('power1.inOut');
        // Pin Telescope: el header queda fijo 100vh de scroll y --progress
        // (0→1) pilota en CSS el split del H1 y el zoom del mock.
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: root,
            start: 'top top',
            end: '+=100%',
            scrub: 1,
            pin: true,
            anticipatePin: 1,
            onUpdate: (self) => {
              const p = eased(self.progress).toFixed(4);
              root.style.setProperty('--progress', p);
              // Estela Kinetic (R8 B2): antes --ghost crecía con el progreso
              // mientras el tagline entero se desvanecía (hero-fade), así
              // que la visibilidad efectiva era fade × ghost = 0. Ahora el
              // tagline ya no es hero-fade (sus caracteres reales se apagan
              // con su propio tween) y la estela tiene curva propia: crece
              // hasta p=0,7 y se apaga al final del pin, para que sea
              // visible a mitad de pin y no quede colgando al cerrarlo.
              const pe = parseFloat(p);
              const g = pe < 0.7 ? pe / 0.7 : Math.max(0, 1 - (pe - 0.7) / 0.3);
              root.style.setProperty('--ghost', g.toFixed(4));
            },
          },
        });
        gsap.set('.hero-tile', {
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
          force3D: true,
        });
        gsap.set('.f1', { scale: 1 });
        gsap.set('.f2', { scale: 0.7 });
        gsap.set('.f3', { scale: 0.4 });
        gsap.set('.hero-media-front', { filter: 'blur(2px)' });
        tl.to(
          '.hero-tile',
          { z: '60vh', duration: 1, ease: 'power1.inOut', stagger: { amount: 0.25, from: 'center' } },
          0,
        )
          .to('.hero-fade', { opacity: 0, y: -24, duration: 0.4, ease: 'power1.in' }, 0)
          // El tagline ya NO es .hero-fade (R8 B2): sus caracteres reales
          // se apagan con su propio tween y los fantasmas (.k-ghost,
          // pilotados por --ghost) quedan visibles a mitad de pin.
          .to('.k-real', { opacity: 0, duration: 0.4, ease: 'power1.in' }, 0)
          .to('.k-cursor', { opacity: 0, duration: 0.2, ease: 'power1.in' }, 0)
          .to('.dojo-small', { yPercent: -60, opacity: 0, duration: 0.3, ease: 'power1.out' }, 0.05)
          .to('.dojo-letters', { letterSpacing: '0.34em', duration: 0.5, ease: 'power1.inOut' }, 0.05)
          .to(
            '.hero-media-front',
            { scale: 1, filter: 'blur(0px)', duration: 1, ease: 'power1.inOut', stagger: { amount: 0.2, from: 'end' } },
            0.55,
          );

        // Intro de carga: badge letra a letra, H1 por caracteres,
        // contenido desde abajo, tagline con scramble.
        const taglineEl = root.querySelector<HTMLElement>('.k-tagline');
        const tagChars = taglineEl
          ? Array.from(taglineEl.querySelectorAll<HTMLElement>('.k-real'))
          : [];
        const cursorEl = taglineEl?.querySelector<HTMLElement>('.k-cursor') ?? null;
        tagChars.forEach((c) => {
          c.style.opacity = '0';
        });
        const badgeLetters = Array.from(root.querySelectorAll<HTMLElement>('.dojo-letter'));
        const intro = gsap.timeline({ defaults: { ease: 'cinematic' }, delay: 0.1 });
        intro
          .from('.dojo-letter', { yPercent: -115, duration: 0.5, stagger: 0.012, ease: 'power3.out' }, 0)
          .from(sLeft.chars, { yPercent: 115, opacity: 0, rotate: 2, duration: 0.9, stagger: 0.018 }, 0.15)
          .from(sRight.chars, { yPercent: 115, opacity: 0, rotate: 2, duration: 0.9, stagger: 0.018 }, 0.4)
          .from('.hero-fade-in', { opacity: 0, y: 24, duration: 0.8, stagger: 0.1 }, 0.95)
          .add(() => {
            cancelTagline = scrambleSequence(badgeLetters, null, { perChar: 0.012, shuffles: 2 });
          }, 0.55)
          .add(() => {
            cancelTagline = scrambleSequence(tagChars, cursorEl, { perChar: 0.035, shuffles: 3 });
          }, 1.0);
      }, root);

      // El pin (con su pin-spacer) ya existe: avisar a ScrubbedSteps, que
      // mide su trigger a partir de la geometría del documento (R8 B1).
      markPinReady();

      return () => {
        cancelTagline?.();
        ctx.revert();
        splitLeft?.revert();
        splitRight?.revert();
      };
    };

    let cleanup: (() => void) | undefined;
    // Esperar a las fuentes para que SplitText mida con la tipografía real.
    document.fonts.ready.then(() => {
      cleanup = setup();
      ScrollTrigger.refresh();
    });
    return () => {
      cleanup?.();
    };
  }, []);

  return (
    <header
      ref={rootRef}
      className="t-hero relative flex h-[100svh] flex-col items-center justify-center overflow-hidden px-4 text-center"
    >
      {/* Fondo: partículas + radiales (como antes) */}
      <div className="absolute inset-0" aria-hidden="true">
        <Particles quantity={90} size={1.6} color="#8B5CF6" staticity={40} ease={60} className="h-full w-full" />
      </div>
      <SplineSlot className="absolute inset-0" />
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(700px 400px at 50% 0%, rgba(255,176,32,0.10), transparent 70%), radial-gradient(600px 500px at 50% 100%, rgba(139,92,246,0.12), transparent 70%)',
        }}
      />

      {/* Rejilla flotante que vuela en z (§8) */}
      <div className="hero-grid" aria-hidden="true">
        {TILES.map((t) => (
          <div key={t.label} className="hero-tile" style={{ top: t.top, left: t.left, background: t.bg }}>
            <span className="hero-tile-label">{t.label}</span>
            <span className="hero-tile-bar" />
          </div>
        ))}
      </div>

      {/* Mock del Studio que escala 0→1 con --progress + 3 capas
          frontales enmascaradas (trailing zoom, blur 2px→0) */}
      <div className="hero-media" aria-hidden="true">
        <div className="hero-media-back">
          <StudioMock />
        </div>
        <div className="hero-media-front f1">
          <StudioMock />
        </div>
        <div className="hero-media-front f2">
          <StudioMock />
        </div>
        <div className="hero-media-front f3">
          <StudioMock />
        </div>
      </div>

      {/* Contenido */}
      <div className="hero-content relative z-10 flex max-w-4xl flex-col items-center">
        <DojoBadge />
        <h1 className="t-hero-title font-display text-5xl font-bold leading-[1.05] sm:text-7xl">
          <span className="t-half t-half-left">El comercial que</span>{' '}
          <span className="t-half t-half-right">tu agente puede dirigir.</span>
        </h1>
        <KineticTagline />
        <p className="hero-fade hero-fade-in mt-4 max-w-2xl text-base leading-relaxed text-[#9A9AA8] sm:text-lg">
          Flare es un estudio agent-native: tu agente construye comerciales animados de
          producto como código HTML + GSAP, con un motor de retención que mide el anuncio
          escena por escena. Trae tu agente, trae tu key. No hay servidor.
        </p>
        <div className="hero-fade hero-fade-in mt-8 flex flex-wrap items-center justify-center gap-3">
          <ShimmerButton onClick={() => onOpenStudio()} className="px-6 py-3 text-base font-bold">
            <span className="inline-flex items-center gap-2">
              <Play className="h-4 w-4" /> Abrir el Studio
            </span>
          </ShimmerButton>
          <a
            href="#plantillas"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-6 py-3 text-base font-semibold text-white hover:bg-white/5"
          >
            Ver plantillas <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <div className="hero-fade hero-fade-in mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            { value: 3, suffix: '', label: 'plantillas reales' },
            { value: 100, suffix: '/100', label: 'mejor score' },
            { value: 13, suffix: '', label: 'proveedores BYO key' },
            { value: 6, suffix: '', label: 'agentes CLI' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-display text-3xl font-bold text-white sm:text-4xl">
                <NumberTicker value={s.value} />
                <span className="text-flare">{s.suffix}</span>
              </p>
              <p className="mt-1 text-xs text-[#9A9AA8]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
