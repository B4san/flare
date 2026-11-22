// Flare — Hero cinematográfico.
// Composición editorial: titular en tres líneas con máscara, acento serif,
// teléfono 3D con un comercial real reproduciéndose (PreviewClip), chips de
// score en vivo y marquesina de tagline. El fondo es aurora + grid + grano.

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ArrowDownRight, ArrowUpRight, Volume2 } from 'lucide-react';
import { PreviewClip } from '../preview/PreviewClip';
import { TEMPLATES } from '../../lib/data';
import { isReducedMotion, scrollToId } from '../landing/codrops-effects';
import { AnimatedLines, Magnetic, useIntroTimeline } from './motion';

const HERO_SLUG = 'colchon-descanso-total';

function usePhoneAd(play: boolean) {
  const scenes = TEMPLATES[HERO_SLUG].meta.scenes;
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!play) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % scenes.length);
    }, 2700);
    return () => window.clearInterval(id);
  }, [play, scenes.length]);
  return { scene: scenes[index], index, scenes, setIndex };
}

function LivePhone({ play }: { play: boolean }) {
  const [paused, setPaused] = useState(false);
  const { scene, index, scenes, setIndex } = usePhoneAd(play && !paused);

  return (
    <div
      className="flex flex-col items-center gap-5"
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse') setPaused(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') setPaused(false);
      }}
    >
      <div className="phone-wrap" data-intro="phone">
        <div className="phone">
          <div className="phone-notch" aria-hidden="true">
            <span className="phone-island-dot" />
          </div>
          <span className="phone-btn one" aria-hidden="true" />
          <span className="phone-btn two" aria-hidden="true" />
          <span className="phone-btn three" aria-hidden="true" />
          <div className="phone-screen">
            <div className="phone-glare" aria-hidden="true" />
            <PreviewClip scene={scene} format="9:16" showSafeGuides={false} staticMode={false} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {scenes.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setIndex(i)}
            className="flex h-6 items-center px-1"
            aria-label={`Ver escena ${i + 1}: ${s.name}`}
            aria-current={i === index ? 'true' : undefined}
            data-cursor="Escena"
          >
            <span
              className="block h-[2px] rounded-full transition-all duration-500"
              style={{
                width: i === index ? 30 : 10,
                background:
                  i === index
                    ? 'linear-gradient(90deg,#FFB020,#FF5A3C,#8B5CF6)'
                    : 'rgba(244,241,233,0.2)',
              }}
            />
          </button>
        ))}
        <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#8C8A92]">
          {String(index + 1).padStart(2, '0')}/{String(scenes.length).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}

export function Hero({
  introDone,
  onOpenStudio,
}: {
  introDone: boolean;
  onOpenStudio: () => void;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);

  useIntroTimeline(rootRef, introDone);

  // Tilt 3D del teléfono (solo puntero fino, nunca en reduced-motion).
  useEffect(() => {
    if (isReducedMotion() || !window.matchMedia('(pointer: fine)').matches) return;
    const root = rootRef.current;
    const phone = phoneRef.current?.querySelector<HTMLElement>('.phone');
    if (!root || !phone) return;
    const rx = gsap.quickTo(phone, 'rotateX', { duration: 0.7, ease: 'power3.out' });
    const ry = gsap.quickTo(phone, 'rotateY', { duration: 0.7, ease: 'power3.out' });
    const onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      ry(nx * 16);
      rx(-ny * 12);
    };
    const onLeave = () => {
      rx(0);
      ry(0);
    };
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerleave', onLeave);
    return () => {
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <section ref={rootRef} className="hero flex flex-col justify-between overflow-hidden pt-[92px]">
      <div className="hero-aurora" aria-hidden="true" />
      <div className="hero-grid" aria-hidden="true" />
      <div className="hero-giant-word" aria-hidden="true">
        FLARE
      </div>
      <div className="hero-lens" aria-hidden="true" />
      <div className="hero-cloud" aria-hidden="true" style={{ left: '-12vw', top: '18vh' }} />

      <div className="relative z-10 mx-auto grid w-full max-w-[1680px] flex-1 grid-cols-1 items-center gap-14 px-5 pb-12 sm:px-8 lg:grid-cols-12 lg:gap-8 lg:px-12">
        <div className="relative lg:col-span-7 lg:pr-8">
          <p className="hero-eyebrow kicker" data-intro="eyebrow">
            <span className="dot" />
            Comerciales que se sienten como cine
          </p>

          <h1 className="hero-title display mt-7 text-[#F4F1E9]" aria-label="Tu producto, en modo cinemático.">
            <AnimatedLines
              lines={[
                { content: 'Tu producto,' },
                { content: 'en modo' },
                {
                  content: (
                    <span className="serif-i text-flare-soft pr-[0.05em] text-[1.06em]">
                      cinemático.
                    </span>
                  ),
                },
              ]}
              play={introDone}
            />
          </h1>

          <p className="hero-sub mt-8" data-intro="sub">
            Convierte un brief en un comercial animado que tu agente dirige. Escenas reales
            en HTML + GSAP, retención medida una a una y export de verdad. Para founders y
            creadores que no se conforman con un template.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3" data-intro="cta">
            <Magnetic>
              <button
                type="button"
                onClick={onOpenStudio}
                className="flare-btn flare-btn-solid h-[54px] px-7 text-[15px]"
                data-cursor="Abrir"
              >
                Abrir el Studio
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </Magnetic>
            <Magnetic>
              <button
                type="button"
                onClick={() => scrollToId('reel')}
                className="flare-btn flare-btn-ghost h-[54px] px-6 text-[15px]"
                data-cursor="Ver reel"
              >
                Ver el reel
                <ArrowDownRight className="h-4 w-4" />
              </button>
            </Magnetic>
            <span className="ml-1 hidden items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-[#8C8A92] sm:flex">
              <Volume2 className="h-3.5 w-3.5" />
              Sin audio. Todo se explica solo.
            </span>
          </div>

          <dl
            className="mt-12 grid max-w-[620px] grid-cols-2 gap-x-8 gap-y-5 border-t border-white/10 pt-6 sm:grid-cols-4"
            data-intro="meta"
          >
            {[
              ['100/100', 'score perfecto'],
              ['13', 'proveedores BYO'],
              ['06', 'agentes CLI'],
              ['00', 'servidores'],
            ].map(([k, v]) => (
              <div key={v}>
                <dt className="font-display text-[22px] font-bold tracking-[-0.04em] text-[#F4F1E9]">
                  {k}
                </dt>
                <dd className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-[#8C8A92]">
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div ref={phoneRef} className="relative flex justify-center lg:col-span-5 lg:justify-end">
          <div className="relative">
            <LivePhone play={introDone} />

            <div
              className="float-chip left-[-14%] top-[16%] hidden sm:flex"
              data-intro="chip"
              aria-hidden="true"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#34D399] shadow-[0_0_10px_#34D399]" />
              Live preview
            </div>

            <div
              className="float-chip right-[-12%] top-[8%] hidden sm:flex"
              data-intro="chip"
              aria-hidden="true"
            >
              <span className="font-display text-[15px] font-bold text-[#F4F1E9]">100</span>
              <span className="text-[#8C8A92]">/100 score</span>
            </div>

            <div
              className="float-chip bottom-[18%] left-[-18%] hidden sm:flex"
              data-intro="chip"
              aria-hidden="true"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" />
              Safe 10/10
            </div>

            <div
              className="float-chip bottom-[6%] right-[-10%] hidden sm:flex"
              data-intro="chip"
              aria-hidden="true"
            >
              <span className="chip-line" />
              Hook 0–2,5 s
            </div>

            <p className="mt-6 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-[#8C8A92] lg:text-right">
              Descanso Total · 9:16 · 17,5 s
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex items-end justify-between gap-6 px-5 pb-6 sm:px-8 lg:px-12">
        <button
          type="button"
          onClick={() => scrollToId('manifiesto')}
          className="hero-scroll hidden pb-2 md:block"
          data-cursor="Bajar"
        >
          Scroll para dirigir
        </button>
        <div className="ml-auto w-full border-t border-white/10 py-4 md:w-[72%]">
          <TaglineMarquee />
        </div>
      </div>
    </section>
  );
}

export function TaglineMarquee() {
  const items = ['Atrapa la mirada', 'Retén el scroll', 'Gana el click'];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {[0, 1].map((dup) => (
          <div key={dup} className="flex shrink-0 items-center">
            {items.concat(items).map((t, i) => (
              <span key={`${dup}-${i}`} className="marquee-item text-[11px] uppercase tracking-[0.22em] text-[#B8B4AB]">
                {t}
                <span className="marquee-star">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
