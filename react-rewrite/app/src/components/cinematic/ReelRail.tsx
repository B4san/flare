// Flare — El reel: tres anuncios reales en un carrusel horizontal pinned.
// Cada tarjeta usa PreviewClip con un frame real del ejemplo y su score
// calculado por el mismo motor. En móvil se apila; en reduced-motion no
// hay pin ni transform.

import { useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowLeft, ArrowRight, ArrowUpRight, X } from 'lucide-react';
import { PreviewClip } from '../preview/PreviewClip';
import {
  TEMPLATES,
  TEMPLATE_ORDER,
  formatDuration,
} from '../../lib/data';
import { computeRetention, deriveExportSafe } from '../../lib/retention';
import type { TemplateMeta } from '../../lib/types';
import type { RetentionResult } from '../../lib/retention';
import { isReducedMotion, setScrollLocked } from '../landing/codrops-effects';
import { Reveal } from './motion';
import { SectionIntro } from './Chrome';

gsap.registerPlugin(ScrollTrigger);

const SHORT_TAGS: Record<string, string[]> = {
  'colchon-descanso-total': ['Dolor → producto', 'Hook pregunta', '9:16 vertical'],
  'marca-personal': ['Antes / después', 'Marca personal', '1:1 feed'],
  'saas-presentacion': ['Producto SaaS', 'Demo', '16:9 presentación'],
};

interface CardData {
  slug: string;
  meta: TemplateMeta;
  retention: RetentionResult;
}

function SceneModal({
  card,
  onClose,
  onOpenStudio,
}: {
  card: CardData;
  onClose: () => void;
  onOpenStudio: (slug: string) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    setScrollLocked(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const nodes = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      setScrollLocked(false);
      if (prevFocus?.isConnected) prevFocus.focus();
    };
  }, [onClose]);

  const r = card.retention;
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#07070A]/85 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={`Escenas de ${card.meta.name}`}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="max-h-[88vh] w-full max-w-[900px] overflow-y-auto rounded-[22px] border border-white/12 bg-[#0D0C12] p-6 shadow-[0_50px_120px_rgba(0,0,0,0.7)] sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="kicker !text-[#FFB020]">Escenas del export</p>
            <h3 className="mt-2 font-display text-3xl font-bold tracking-[-0.04em]">
              {card.meta.name}
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#B8B4AB]">
              {card.meta.productLine} · {card.meta.format} · {formatDuration(card.meta.duration)} ·
              score {r.total ?? '—'}/100
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 text-[#F4F1E9] transition hover:bg-white/10"
            aria-label="Cerrar"
            data-cursor="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-[290px_1fr]">
          <div className="flex justify-center">
            <PreviewClip
              scene={card.meta.scenes[Math.min(1, card.meta.scenes.length - 1)]}
              format={card.meta.format}
              showSafeGuides
              staticMode
              className="reel-poster"
            />
          </div>
          <div>
            <ul className="space-y-2">
              {card.meta.scenes.map((s, i) => (
                <li
                  key={s.id}
                  className="rounded-[12px] border border-white/8 bg-white/[0.03] px-3 py-2"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-semibold text-[#F4F1E9]">
                      {String(i + 1).padStart(2, '0')} · {s.name}
                    </span>
                    <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-[#8C8A92]">
                      {s.start.toFixed(1)}–{(s.start + s.duration).toFixed(1)} s
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#B8B4AB]">“{s.caption}”</p>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              {r.items.map((item) => (
                <span
                  key={item.key}
                  className="rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em]"
                  style={{
                    borderColor: item.pass ? 'rgba(52,211,153,0.35)' : 'rgba(251,191,36,0.35)',
                    color: item.pass ? '#34D399' : '#FBBF24',
                  }}
                >
                  {item.label.split(' (')[0]} {item.pts ?? '—'}/{item.max}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onOpenStudio(card.slug)}
              className="flare-btn flare-btn-solid mt-6 h-11 px-5 text-sm"
              data-cursor="Abrir"
            >
              Abrir en el Studio <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReelCard({
  card,
  index,
  onOpen,
  onOpenStudio,
}: {
  card: CardData;
  index: number;
  onOpen: () => void;
  onOpenStudio: (slug: string) => void;
}) {
  const { meta, retention } = card;
  const scene =
    index === 1
      ? meta.scenes[meta.scenes.length - 1]
      : meta.scenes[Math.min(index + 1, meta.scenes.length - 2)] ?? meta.scenes[0];

  return (
    <article className={`reel-card group ${index % 2 ? 'reel-card-alt' : ''}`} data-cursor="Ver">
      <div className="relative flex h-full flex-col justify-between p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#8C8A92]">
              {String(index + 1).padStart(2, '0')} / {String(TEMPLATE_ORDER.length).padStart(2, '0')}
            </span>
            <span className="h-px w-10 bg-white/20" />
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#FFB020]">
              {meta.format} · {formatDuration(meta.duration)}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-[28px] font-bold tracking-[-0.05em] text-[#F4F1E9]">
              {retention.total ?? '—'}
            </span>
            <span className="font-mono text-[9px] tracking-[0.1em] text-[#8C8A92]">/100</span>
          </div>
        </div>

        <div className="pointer-events-none flex flex-1 items-center justify-center py-6">
          <div
            className="reel-poster"
            style={{ transform: `rotate(${index === 0 ? -3.5 : index === 2 ? 2.5 : -1.5}deg)` }}
          >
            <PreviewClip
              scene={scene}
              format={meta.format}
              showSafeGuides
              staticMode
              className="shadow-[0_40px_80px_rgba(0,0,0,0.55)]"
            />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <span
              className="reel-index block select-none"
              aria-hidden="true"
              style={{ WebkitTextStroke: '1px rgba(244,241,233,0.13)' }}
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            <h3 className="-mt-4 font-display text-[clamp(1.7rem,3.2vw,2.8rem)] font-bold leading-[0.95] tracking-[-0.045em]">
              {meta.name}
            </h3>
            <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-[#B8B4AB]">
              {meta.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {(SHORT_TAGS[card.slug] ?? []).map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/12 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[#8C8A92]"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-stretch">
            <button
              type="button"
              onClick={() => onOpenStudio(card.slug)}
              className="flare-btn flare-btn-solid h-10 px-4 text-[12px]"
              data-cursor="Abrir"
            >
              Abrir en Studio <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onOpen}
              className="flare-btn flare-btn-ghost h-10 px-4 text-[12px]"
              data-cursor="Ver escenas"
            >
              Ver escenas
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ReelRail({ onOpenStudio }: { onOpenStudio: (slug?: string) => void }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const [openCard, setOpenCard] = useState<CardData | null>(null);

  const cards = useMemo<CardData[]>(
    () =>
      TEMPLATE_ORDER.map((slug) => {
        const b = TEMPLATES[slug];
        const exp = deriveExportSafe(b.scenesHtml, b.meta.scenes, b.meta.height);
        const retention = computeRetention(b.meta.scenes, {
          safePoints: exp.points,
          format: b.meta.format,
        });
        return { slug, meta: b.meta as TemplateMeta, retention };
      }),
    [],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track || isReducedMotion()) return;

    const mm = gsap.matchMedia();
    mm.add('(min-width: 901px)', () => {
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + 96);
      const tween = gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: viewport,
          start: 'top top',
          end: () => `+=${distance()}`,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (progressRef.current) {
              progressRef.current.style.transform = `scaleX(${self.progress})`;
            }
            if (countRef.current) {
              const n = Math.min(cards.length, Math.floor(self.progress * cards.length) + 1);
              countRef.current.textContent = `${String(n).padStart(2, '0')} — ${String(cards.length).padStart(2, '0')}`;
            }
          },
        },
      });
      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    });

    const onResize = () => ScrollTrigger.refresh();
    window.addEventListener('resize', onResize);
    return () => {
      mm.revert();
      window.removeEventListener('resize', onResize);
    };
  }, [cards.length]);

  const openTemplate = (slug: string) => {
    setOpenCard(null);
    window.setTimeout(() => onOpenStudio(slug), 30);
  };

  return (
    <section id="reel" className="cine-section scroll-mt-20">
      <div className="mx-auto w-full max-w-[1680px] px-5 sm:px-8 lg:px-12">
        <SectionIntro
          n="02"
          label="El reel"
          title={
            <>
              Tres anuncios.{' '}
              <span className="serif-i text-flare-soft text-[1.12em]">Cero mockups.</span>
            </>
          }
          aside="Los ejemplos del repo, con su preview real y su score medido. Ábrelos, rómpelos y vuelve a puntuarlos."
        />
      </div>

      <div ref={viewportRef} className="reel-pin mt-14">
        <div className="reel-viewport">
          <div ref={trackRef} className="reel-track">
            {cards.map((card, i) => (
              <ReelCard
                key={card.slug}
                card={card}
                index={i}
                onOpen={() => setOpenCard(card)}
                onOpenStudio={openTemplate}
              />
            ))}
          </div>

          <div className="pointer-events-none absolute inset-x-5 bottom-6 flex items-center gap-5 sm:inset-x-10">
            <span ref={countRef} className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#8C8A92]">
              01 — 03
            </span>
            <div className="reel-progress">
              <i ref={progressRef} style={{ transform: 'scaleX(0)', transformOrigin: 'left' }} />
            </div>
            <span className="hidden items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#8C8A92] sm:flex">
              <ArrowRight className="h-3.5 w-3.5" /> Scroll para recorrer
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-4 flex w-full max-w-[1680px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Reveal className="flex items-center gap-2 text-[#8C8A92]">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="font-mono text-[9px] uppercase tracking-[0.16em]">
            Cada frame es el export real
          </span>
        </Reveal>
        <Reveal className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#8C8A92]">
          Safe 10/10 en los tres
        </Reveal>
      </div>

      {openCard && (
        <SceneModal
          card={openCard}
          onClose={() => setOpenCard(null)}
          onOpenStudio={openTemplate}
        />
      )}
    </section>
  );
}
