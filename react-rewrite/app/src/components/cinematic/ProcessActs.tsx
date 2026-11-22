// Flare — Proceso en tres actos, scrubbed con el scroll.
// Acto 1: brief. Acto 2: agente. Acto 3: render. Cada acto tiene su propio
// escenario visual (documento, consola con ventanas, export). En móvil y
// reduced-motion se apilan como fichas legibles.

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowUpRight,
  Check,
  Circle,
  Clapperboard,
  FileText,
  Gauge,
  Play,
  Terminal,
} from 'lucide-react';
import { PreviewClip } from '../preview/PreviewClip';
import { TEMPLATES } from '../../lib/data';
import { isReducedMotion, scrollToId } from '../landing/codrops-effects';
import { Reveal } from './motion';
import { SectionIntro } from './Chrome';

gsap.registerPlugin(ScrollTrigger);

const ACTS = [
  {
    n: '01',
    word: 'Brief',
    label: 'El punto de partida',
    desc: 'Describe el producto, el público y el tono. El Studio genera un brief con escenas, duraciones, captions y las cinco reglas de retención ya alineadas.',
    points: ['Producto y promesa', 'Público y tono', 'Formato y duración'],
  },
  {
    n: '02',
    word: 'Agente',
    label: 'El rodaje',
    desc: 'Tu CLI lee el brief con la skill flare y construye el anuncio como HTML + GSAP. Mueve ventanas, escribe escenas, aplica fixes. Con tu proveedor y tu key.',
    points: ['06 CLIs soportados', '13 proveedores BYO', 'Fixes reales, no flags'],
  },
  {
    n: '03',
    word: 'Render',
    label: 'La premiere',
    desc: 'El preview corre en tiempo real. El motor mide cada escena y cada safe zone. Exportas WebM desde el navegador, storyboard HTML o MP4 determinista.',
    points: ['WebM en el navegador', 'Storyboard HTML', 'MP4 con FFmpeg'],
  },
];

function BriefStage() {
  return (
    <div className="relative flex h-full flex-col p-5 sm:p-7">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#FF5A3C]/70" />
          <span className="h-2 w-2 rounded-full bg-[#FFB020]/70" />
          <span className="h-2 w-2 rounded-full bg-[#34D399]/70" />
          <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#8C8A92]">
            brief.md
          </span>
        </div>
        <FileText className="h-3.5 w-3.5 text-[#8C8A92]" />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ['Producto', 'Descanso Total'],
          ['Formato', '9:16 · 17,5 s'],
          ['Tono', 'Cálido, directo'],
        ].map(([k, v]) => (
          <div key={k} className="rounded-[10px] border border-white/10 bg-white/[0.03] px-3 py-2">
            <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#5F5D66]">{k}</p>
            <p className="mt-1 text-[11px] font-semibold text-[#E8E4DA]">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex-1 space-y-3">
        {[96, 88, 74, 92, 62, 84].map((w, i) => (
          <div key={i} className="brief-line" style={{ width: `${w}%` }}>
            <i style={{ width: `${45 + ((i * 17) % 50)}%` }} />
          </div>
        ))}
        <p className="code-line caret pt-2">
          <b>escena</b> 06 · CTA final · <em>«Descúbrelo hoy»</em>
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
        {['hook ≤ 2,5 s', 'captions 100 %', 'cortes 2–4 s', 'cta 3 s', 'safe 10 %'].map((t) => (
          <span
            key={t}
            className="flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[#8C8A92]"
          >
            <Check className="h-2.5 w-2.5 text-[#34D399]" /> {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function AgentStage() {
  return (
    <div className="relative h-full overflow-hidden p-5 sm:p-7">
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <Terminal className="h-3.5 w-3.5 text-[#FFB020]" />
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#8C8A92]">
          agente · claude code
        </span>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.14em] text-[#34D399]">
          <span className="studio-live-dot" /> trabajando
        </span>
      </div>

      <div className="mt-5 space-y-1.5">
        <p className="code-line">
          <span className="text-[#5F5D66]">$</span> claude <b>&quot;/flare:build</b> --brief
          brief.md<b>&quot;</b>
        </p>
        <p className="code-line">
          <span className="text-[#5F5D66]">→</span> leyendo skill flare <em>v1.0</em>
        </p>
        <p className="code-line">
          <span className="text-[#5F5D66]">→</span> generando <em>scenes.html</em> · 6 escenas
        </p>
        <p className="code-line">
          <span className="text-[#5F5D66]">→</span> midiendo rects · safe zones
        </p>
        <p className="code-line text-[#34D399]">
          ✓ score 100/100 — hook 30 · captions 25 · cortes 20 · cta 15 · safe 10
        </p>
      </div>

      <div className="pointer-events-none absolute inset-0">
        <div className="mini-window left-[8%] top-[42%] w-[40%] p-3 sm:left-[14%]">
          <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#8C8A92]">preview</p>
          <div className="mt-2 space-y-1">
            <div className="h-1.5 w-3/4 rounded bg-white/15" />
            <div className="h-1.5 w-1/2 rounded bg-white/10" />
          </div>
          <div className="mt-3 flex h-16 items-center justify-center rounded-[6px] bg-gradient-to-br from-[#FFB020]/30 via-[#FF5A3C]/20 to-[#8B5CF6]/30">
            <Play className="h-4 w-4 text-white/70" />
          </div>
        </div>
        <div className="mini-window right-[6%] top-[34%] w-[34%] p-3">
          <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#8C8A92]">timeline</p>
          <div className="mt-2 flex gap-1">
            {[3, 2, 4, 2, 3, 3].map((n, i) => (
              <span key={i} className="h-8 flex-1 rounded-sm bg-white/10" style={{ flexGrow: n }} />
            ))}
          </div>
          <p className="mt-2 font-mono text-[8px] text-[#34D399]">100/100</p>
        </div>
        <div className="mini-window bottom-[8%] right-[9%] w-[42%] p-3">
          <div className="flex items-center gap-2">
            <Gauge className="h-3.5 w-3.5 text-[#FF5A3C]" />
            <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#8C8A92]">retención</p>
          </div>
          <div className="mt-2 flex items-end gap-2">
            <span className="font-display text-2xl font-bold leading-none text-[#F4F1E9]">100</span>
            <span className="font-mono text-[8px] text-[#8C8A92]">/100</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RenderStage() {
  const template = TEMPLATES['colchon-descanso-total'];
  const scene = template.meta.scenes[template.meta.scenes.length - 1];
  return (
    <div className="grid h-full grid-cols-1 gap-4 p-5 sm:grid-cols-[1fr_auto] sm:p-7">
      <div className="flex flex-col">
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <Clapperboard className="h-3.5 w-3.5 text-[#8B5CF6]" />
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#8C8A92]">
            export · descanso total
          </span>
          <span className="ml-auto flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.14em] text-[#34D399]">
            <span className="studio-live-dot" /> listo
          </span>
        </div>

        <div className="mt-4 flex flex-1 flex-wrap items-center justify-center gap-4">
          <PreviewClip scene={scene} format="9:16" showSafeGuides staticMode className="scale-[0.78] sm:scale-90" />
          <div className="min-w-[180px]">
            <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#5F5D66]">
              score final
            </p>
            <p className="text-flare-soft font-display text-5xl font-bold leading-none tracking-[-0.06em]">
              100
            </p>
            <p className="mt-2 font-mono text-[8px] leading-relaxed text-[#8C8A92]">
              hook 30 · captions 25
              <br />
              cortes 20 · cta 15 · safe 10
            </p>
            <div className="mt-4 flex flex-col gap-1.5">
              {['WebM · MediaRecorder', 'Storyboard HTML', 'MP4 · FFmpeg'].map((t) => (
                <span key={t} className="flex items-center gap-1.5 font-mono text-[8px] text-[#B8B4AB]">
                  <Check className="h-2.5 w-2.5 text-[#34D399]" /> {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="filmstrip mt-4 border-t border-white/10 pt-3" aria-hidden="true">
          {Array.from({ length: 14 }).map((_, i) => (
            <span key={i} className={i > 1 && i < 12 ? 'is-on' : ''} />
          ))}
        </div>
      </div>

      <div className="hidden w-24 flex-col justify-between border-l border-white/10 pl-4 sm:flex">
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#5F5D66]">formatos</p>
          <div className="mt-2 space-y-2">
            {['9:16', '1:1', '16:9'].map((f) => (
              <p
                key={f}
                className={`rounded-md border px-2 py-1 text-center font-mono text-[8px] ${
                  f === '9:16'
                    ? 'border-[#FF5A3C]/50 bg-[#FF5A3C]/10 text-[#FF8A6A]'
                    : 'border-white/10 text-[#8C8A92]'
                }`}
              >
                {f}
              </p>
            ))}
          </div>
        </div>
        <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#5F5D66]">
          fps 30
          <br />
          1080 × 1920
        </p>
      </div>
    </div>
  );
}

const STAGES = [BriefStage, AgentStage, RenderStage];

export function ProcessActs() {
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(() => isReducedMotion());

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduced) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 901px)', () => {
      const acts = gsap.utils.toArray<HTMLElement>('.act', root);
      if (acts.length < 3) return;
      gsap.set(acts, { autoAlpha: 0, y: 46 });
      gsap.set(acts[0], { autoAlpha: 1, y: 0 });
      let lastActive = 0;
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.8,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (barRef.current) barRef.current.style.transform = `scaleX(${self.progress})`;
            const next = Math.min(2, Math.floor(self.progress * 3));
            if (next !== lastActive) {
              lastActive = next;
              setActive(next);
            }
          },
        },
      });
      tl.to(acts[0], { autoAlpha: 0, y: -46, duration: 0.32, ease: 'power2.in' }, 0.68)
        .fromTo(acts[1], { autoAlpha: 0, y: 46 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power3.out' }, 0.72)
        .to(acts[1], { autoAlpha: 0, y: -46, duration: 0.32, ease: 'power2.in' }, 1.42)
        .fromTo(acts[2], { autoAlpha: 0, y: 46 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power3.out' }, 1.46);
      return () => {
        tl.scrollTrigger?.kill();
        tl.kill();
      };
    });
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 600);
    return () => {
      window.clearTimeout(t);
      mm.revert();
    };
  }, [reduced]);

  return (
    <section id="proceso" className="cine-section scroll-mt-20">
      <div className="mx-auto w-full max-w-[1680px] px-5 sm:px-8 lg:px-12">
        <SectionIntro
          n="04"
          label="El proceso"
          title={
            <>
              Del brief a la premiere.
              <br />
              <span className="text-[#8C8A92]">En tres actos.</span>
            </>
          }
          aside="Tú escribes el brief. El agente rueda. El motor puntúa. Tú decides cuándo se publica."
        />

        <Reveal className="mt-12">
          <div className="flex items-center justify-between">
            <div className="act-rail" aria-hidden="true">
              {ACTS.map((a, i) => (
                <i key={a.n} className={active === i ? 'is-on' : ''} />
              ))}
            </div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#8C8A92]">
              {ACTS[active]?.n} / 03
            </p>
          </div>
        </Reveal>

        <div ref={rootRef} className="acts">
          <div className="acts-sticky">
            <div className="mx-auto w-full max-w-[1680px] px-5 sm:px-8 lg:px-12">
              {ACTS.map((a, i) => {
                const Stage = STAGES[i];
                return (
                  <article key={a.n} className="act">
                    <div className="grid w-full items-center gap-10 lg:grid-cols-[0.85fr_1.15fr]">
                      <div>
                        <p className="section-num">
                          ACTO {a.n} / {a.label}
                        </p>
                        <h3 className="act-word display mt-3">
                          {a.word}
                          <span className="text-[#FF5A3C]">.</span>
                        </h3>
                        <p className="mt-6 max-w-md text-[15px] leading-[1.7] text-[#B8B4AB]">
                          {a.desc}
                        </p>
                        <ul className="mt-7 space-y-2">
                          {a.points.map((p) => (
                            <li key={p} className="flex items-center gap-3 text-[13px] text-[#E8E4DA]">
                              <Circle className="h-2 w-2 fill-[#FF5A3C] text-[#FF5A3C]" />
                              {p}
                            </li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          onClick={() => scrollToId('studio-app')}
                          className="mt-8 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#FFB020]"
                          data-cursor="Abrir"
                        >
                          Verlo en el Studio <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="act-stage h-[clamp(360px,58vh,560px)]">
                        <Stage />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="absolute bottom-8 left-1/2 flex w-[min(360px,72vw)] -translate-x-1/2 items-center gap-4">
              <div className="h-px flex-1 bg-white/10">
                <i
                  ref={barRef}
                  className="block h-full origin-left bg-gradient-to-r from-[#FFB020] via-[#FF5A3C] to-[#8B5CF6]"
                  style={{ transform: 'scaleX(0)' }}
                />
              </div>
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#8C8A92]">
                {ACTS[active]?.word}
              </span>
            </div>
          </div>
        </div>

        <ol className="sr-only">
          {ACTS.map((a, i) => (
            <li key={a.n}>
              Acto {i + 1}, {a.word}: {a.desc}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
