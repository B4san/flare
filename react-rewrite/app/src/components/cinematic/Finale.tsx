// Flare — Finale + footer.
// Cierre cinematográfico: declaración enorme, CTA magnético y wordmark
// interactivo. El footer recoge capítulos, recursos y créditos.

import { ArrowUpRight, GitFork, Heart } from 'lucide-react';
import { AnimatedLines, Magnetic, Reveal } from './motion';
import { FlareButton, CineGrain, SectionIntro } from './Chrome';
import { scrollToId, scrollToTop } from '../landing/codrops-effects';
import { CHAPTERS } from './chapters';
import { TaglineMarquee } from './Hero';

export function Finale({ onOpenStudio }: { onOpenStudio: () => void }) {
  return (
    <section id="accion" className="finale scroll-mt-20 border-t border-white/10">
      <CineGrain />
      <div className="finale-bloom" aria-hidden="true" />
      <div className="mx-auto w-full max-w-[1680px] px-5 pt-24 sm:px-8 lg:px-12">
        <SectionIntro
          n="07"
          label="Acción"
          title={
            <>
              El siguiente corte
              <br />
              es <span className="serif-i text-flare-soft">tuyo.</span>
            </>
          }
          aside="Abre el Studio, elige una plantilla y deja que tu agente trabaje delante de ti. El preview es real; el score, medido."
        />

        <div className="grid gap-10 py-16 lg:grid-cols-12 lg:items-end lg:py-24">
          <div className="lg:col-span-8">
            <AnimatedLines
              scrollTrigger
              className="display text-[clamp(2.7rem,6.2vw,6.4rem)]"
              stagger={0.1}
              lines={[
                { content: 'Tu próximo comercial' },
                { content: 'empieza con un' },
                {
                  content: (
                    <span className="serif-i text-flare-soft text-[1.12em]">brief.</span>
                  ),
                },
              ]}
            />
          </div>
          <div className="lg:col-span-4 lg:justify-self-end">
            <Reveal>
              <p className="max-w-sm text-[15px] leading-[1.75] text-[#B8B4AB]">
                Treinta segundos de brief. Un comercial que parece rodado. Sin cuentas,
                sin tarjeta, sin subir tu key a ningún sitio.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <FlareButton onClick={onOpenStudio} className="h-[52px] px-6 text-[15px]" cursor="Abrir">
                  Abrir el Studio
                </FlareButton>
                <Magnetic>
                  <a
                    href="https://github.com/B4san/flare"
                    target="_blank"
                    rel="noreferrer"
                    className="flare-btn flare-btn-ghost h-[52px] px-5 text-[15px]"
                    data-cursor="GitHub"
                  >
                    <GitFork className="h-4 w-4" /> Ver el repo
                  </a>
                </Magnetic>
              </div>
              <p className="mt-5 font-mono text-[9px] uppercase tracking-[0.16em] text-[#5F5D66]">
                Open source · MIT · Dojo AI Hackathon 2026
              </p>
            </Reveal>
          </div>
        </div>

        <div className="border-y border-white/10 py-4">
          <TaglineMarquee />
        </div>

        <footer className="grid gap-10 py-16 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-[#FF5A3C] blur-[6px]" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-[#FFB020]" />
              </span>
              <span className="font-display text-xl font-bold tracking-[-0.04em]">FLARE</span>
            </div>
            <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-[#8C8A92]">
              El estudio agent-native para comerciales de producto. Tu agente dirige, el motor
              mide y tú decides cuándo se publica.
            </p>
            <p className="mt-6 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#5F5D66]">
              Hecho para founders y creadores <Heart className="h-3 w-3 text-[#FF5A3C]" />
            </p>
          </div>

          <div className="lg:col-span-3">
            <p className="kicker">Capítulos</p>
            <ul className="mt-4 space-y-2">
              {CHAPTERS.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => scrollToId(c.id)}
                    className="group flex items-center gap-3 text-[12px] text-[#B8B4AB] transition hover:text-[#F4F1E9]"
                    data-cursor="Ir"
                  >
                    <span className="font-mono text-[8px] text-[#5F5D66]">{c.n}</span>
                    {c.label}
                    <ArrowUpRight className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <p className="kicker">Recursos</p>
            <ul className="mt-4 space-y-2 text-[12px] text-[#B8B4AB]">
              <li>
                <a href="https://github.com/B4san/flare" target="_blank" rel="noreferrer" className="hover:text-[#F4F1E9]" data-cursor="GitHub">
                  GitHub
                </a>
              </li>
              <li>
                <a href="https://trydojo.io" target="_blank" rel="noreferrer" className="hover:text-[#F4F1E9]" data-cursor="Dojo">
                  Dojo AI Hackathon
                </a>
              </li>
              <li className="text-[#8C8A92]">Licencia MIT</li>
              <li className="text-[#8C8A92]">Sin servidores</li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <p className="kicker">Estado</p>
            <ul className="mt-4 space-y-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#8C8A92]">
              <li className="flex items-center gap-2">
                <span className="studio-live-dot" /> Studio online
              </li>
              <li>Score engine · live</li>
              <li>Export · WebM / MP4</li>
              <li>v1.0 · 2026</li>
            </ul>
          </div>
        </footer>

        <div className="flex items-center justify-between gap-4 border-t border-white/10 py-5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#5F5D66]">
          <span>© 2026 Flare · Sebastian Flores Peralta</span>
          <button
            type="button"
            onClick={scrollToTop}
            className="hover:text-[#F4F1E9]"
            data-cursor="Arriba"
          >
            Volver arriba ↑
          </button>
        </div>

        <div className="relative pb-6 pt-4">
          <p className="finale-word flex justify-center select-none" aria-label="Flare">
            {'FLARE'.split('').map((c, i) => (
              <span key={i} style={{ transitionDelay: `${i * 20}ms` }}>
                {c}
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  );
}
