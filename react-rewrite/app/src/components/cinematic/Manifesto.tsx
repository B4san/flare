// Flare — Manifiesto: la tesis del producto en una composición editorial.
// Izquierda: declaración con líneas enmascaradas. Derecha: ledger de scores
// reales (100/85/85 y Safe 10/10) calculados con el motor del repo.

import { useMemo } from 'react';
import { ArrowRight, CircleCheck } from 'lucide-react';
import {
  TEMPLATES,
  TEMPLATE_ORDER,
  formatDuration,
} from '../../lib/data';
import { computeRetention, deriveExportSafe } from '../../lib/retention';
import { AnimatedLines, Reveal } from './motion';
import { SectionIntro } from './Chrome';
import { scrollToId } from '../landing/codrops-effects';

const RULES = [
  { name: 'Hook', pts: 30, detail: '0–2,5 s' },
  { name: 'Captions', pts: 25, detail: '≥ 80 %' },
  { name: 'Cortes', pts: 20, detail: '2–4 s' },
  { name: 'CTA', pts: 15, detail: 'últimos 3 s' },
  { name: 'Safe', pts: 10, detail: 'margen 10 %' },
];

function ScoreRing({ score, size = 46 }: { score: number; size?: number }) {
  const r = 19;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 46 46" aria-hidden="true" className="shrink-0">
      <circle cx="23" cy="23" r={r} fill="none" stroke="rgba(244,241,233,0.12)" strokeWidth="1.5" />
      <circle
        cx="23"
        cy="23"
        r={r}
        fill="none"
        stroke={score === 100 ? '#FFB020' : '#FF5A3C'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - score / 100)}
        transform="rotate(-90 23 23)"
      />
      <text
        x="23"
        y="26"
        textAnchor="middle"
        fontSize="10"
        fontFamily="Space Grotesk, sans-serif"
        fontWeight="700"
        fill="#F4F1E9"
      >
        {score}
      </text>
    </svg>
  );
}

export function Manifesto({ onOpenStudio }: { onOpenStudio: (slug?: string) => void }) {
  const rows = useMemo(
    () =>
      TEMPLATE_ORDER.map((slug) => {
        const b = TEMPLATES[slug];
        const exp = deriveExportSafe(b.scenesHtml, b.meta.scenes, b.meta.height);
        const r = computeRetention(b.meta.scenes, {
          safePoints: exp.points,
          format: b.meta.format,
        });
        return { slug, meta: b.meta, retention: r };
      }),
    [],
  );

  return (
    <section id="manifiesto" className="cine-section scroll-mt-20">
      <div className="mx-auto w-full max-w-[1680px] px-5 sm:px-8 lg:px-12">
        <SectionIntro
          n="01"
          label="Manifiesto"
          title={
            <>
              El anuncio dejó de ser un archivo.
              <br />
              <span className="text-[#8C8A92]">Ahora se dirige.</span>
            </>
          }
          aside="Flare es open source, corre en tu navegador y no guarda tus keys. Tu agente hace el trabajo; tú tomas las decisiones."
        />

        <div className="mt-20 grid gap-16 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <AnimatedLines
              scrollTrigger
              className="display text-[clamp(2.3rem,5.2vw,5rem)]"
              stagger={0.11}
              lines={[
                { content: 'No es un editor.' },
                { content: 'Es un estudio donde' },
                { content: 'tu agente dirige,' },
                {
                  content: (
                    <span className="serif-i text-flare-soft text-[1.1em]">mide y corta.</span>
                  ),
                },
              ]}
            />
            <Reveal className="mt-10 max-w-[52ch]" delay={0.15}>
              <p className="text-[15px] leading-[1.75] text-[#B8B4AB]">
                Describe el producto, elige el tono y deja que tu CLI construya escenas reales
                en HTML + GSAP. Tú ves la timeline, el preview y el score en vivo mientras el
                agente trabaja. Nada se sube a un servidor: el anuncio es código, y el código
                es tuyo.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-0 sm:grid-cols-3">
              {[
                ['DIRIGE', 'Ventanas, timeline y preview: el agente opera la interfaz como su set.'],
                ['MIDE', 'Hook, captions, ritmo, CTA y safe zones: 5 reglas, 100 puntos, sin humo.'],
                ['CORTA', 'WebM real desde el navegador, storyboard HTML o MP4 determinista con FFmpeg.'],
              ].map(([t, d], i) => (
                <Reveal key={t} delay={0.08 * i} className="border-t border-white/10 py-5 pr-4">
                  <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#FFB020]">
                    {t}
                  </p>
                  <p className="mt-3 text-[13px] leading-relaxed text-[#B8B4AB]">{d}</p>
                </Reveal>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <Reveal className="rounded-[22px] border border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="kicker !text-[#FFB020]">Score medido</p>
                  <h3 className="mt-2 font-display text-2xl font-bold tracking-[-0.04em]">
                    Medido, no prometido.
                  </h3>
                </div>
                <span className="rounded-full border border-[#34D399]/30 bg-[#34D399]/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-[#34D399]">
                  live engine
                </span>
              </div>

              <ul className="mt-6">
                {rows.map(({ slug, meta, retention }) => (
                  <li key={slug}>
                    <button
                      type="button"
                      onClick={() => onOpenStudio(slug)}
                      className="hover-line group flex w-full items-center gap-4 py-4 text-left"
                      data-cursor="Abrir"
                    >
                      <ScoreRing score={retention.total ?? 0} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-[15px] font-semibold text-[#F4F1E9]">
                          {meta.name}
                        </span>
                        <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.14em] text-[#8C8A92]">
                          {meta.format} · {formatDuration(meta.duration)} · Safe{' '}
                          {retention.safe === null ? '—' : retention.safe}/10
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-[#8C8A92] transition-transform group-hover:translate-x-1 group-hover:text-[#F4F1E9]" />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4 text-[11px] text-[#8C8A92]">
                <CircleCheck className="h-3.5 w-3.5 text-[#34D399]" />
                Mismo motor en la landing, el Studio y <span className="font-mono">flare score</span>.
              </div>
            </Reveal>

            <Reveal className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3" delay={0.1}>
              {RULES.map((r) => (
                <div key={r.name} className="flex items-baseline gap-2">
                  <span className="font-display text-[26px] font-bold tracking-[-0.05em] text-[#F4F1E9]">
                    {r.pts}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8C8A92]">
                    {r.name}
                    <br />
                    <span className="text-[#5f5d66]">{r.detail}</span>
                  </span>
                </div>
              ))}
            </Reveal>

            <Reveal className="mt-10" delay={0.15}>
              <button
                type="button"
                onClick={() => scrollToId('motor')}
                className="group flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#FFB020]"
                data-cursor="Probar"
              >
                Juega con el motor
                <span className="relative block h-px w-14 bg-[#FFB020]/40">
                  <span className="absolute inset-y-0 left-0 w-0 bg-[#FFB020] transition-all duration-500 group-hover:w-full" />
                </span>
              </button>
            </Reveal>
          </div>
        </div>

        <div className="marquee mt-24 border-y border-white/10 py-5" aria-hidden="true">
          <div className="marquee-track">
            {[0, 1].map((dup) => (
              <div key={dup} className="flex shrink-0 items-center">
                {['Hook', 'Captions', 'Cortes', 'CTA', 'Safe zones', 'Retención', 'Export real'].map(
                  (t, i) => (
                    <span
                      key={`${dup}-${i}`}
                      className="marquee-item text-[clamp(2rem,4.4vw,3.8rem)] uppercase text-transparent"
                      style={{ WebkitTextStroke: '1px rgba(244,241,233,0.18)' }}
                    >
                      {t}
                      <span className="marquee-star">✦</span>
                    </span>
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
