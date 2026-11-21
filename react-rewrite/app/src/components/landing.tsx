// Flare — Landing: hero Telescope + qué es + plantillas + retención + cómo funciona.
//
// Componentes REALES del catálogo (ver DESIGN.md §1), cada uno con su papel:
//   - FloatingNav (Aceternity) — navegación flotante.
//   - TelescopeHero — hero estilo Codrops Telescope Zoom (§8) con tagline
//     Kinetic/Scramble (§1+§2) y badge Dojo editorial (§9.2).
//   - Particles (Magic UI) — fondo reactivo del hero (dentro de TelescopeHero).
//   - NumberTicker (Magic UI) — estadísticas animadas (dentro de TelescopeHero).
//   - Marquee (Magic UI) — agentes y proveedores.
//   - BentoGrid/BentoCard (Magic UI) — "Qué es Flare".
//   - CardContainer/Body/Item (Aceternity 3D Card) — tarjetas de plantillas.
//   - MorphingDialog (Motion Primitives) — detalle de cada plantilla.
//   - TextGenerateEffect (Aceternity) — titular de la sección de retención.
//   - AnimatedCircularProgressBar (Magic UI) — anillo del score.
//   - ScrubbedSteps — "Cómo funciona" con 3 pasos scrubbed (§1 Kinetic).
//   - CinematicProgress — barra de progreso cinematográfica (§7).
//   - Lenis — scroll suave global (§1/§5), iniciado en este componente.
// Una sola armonía: tokens Flare (fondo #0A0A0F, degradado ámbar→coral→
// violeta, Space Grotesk + Inter + JetBrains Mono solo código).

import { useEffect, useMemo, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import {
  Bot,
  Clapperboard,
  Gauge,
  KeyRound,
  Play,
  Sparkles,
} from 'lucide-react';
import { FloatingNav } from './vendor/aceternity/components/ui/floating-navbar';
import { TextGenerateEffect } from './vendor/aceternity/components/ui/text-generate-effect';
import {
  CardBody,
  CardContainer,
  CardItem,
} from './vendor/aceternity/components/ui/3d-card';
import { BentoCard, BentoGrid } from './vendor/magicui/bento-grid';
import { Marquee } from './vendor/magicui/marquee';
import { ShimmerButton } from './vendor/magicui/shimmer-button';
import { AnimatedCircularProgressBar } from './vendor/magicui/animated-circular-progress-bar';
import { BlurFade } from './vendor/magicui/blur-fade';
import {
  MorphingDialog,
  MorphingDialogClose,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogDescription,
  MorphingDialogSubtitle,
  MorphingDialogTitle,
  MorphingDialogTrigger,
} from './vendor/motion-primitives/morphing-dialog';
import { AGENT_ORDER, AGENTS, PROVIDER_ORDER, PROVIDERS, TEMPLATES, TEMPLATE_ORDER, formatDuration } from '../lib/data';
import { computeRetention, deriveExportSafe } from '../lib/retention';
import { TelescopeHero } from './landing/TelescopeHero';
import { ScrubbedSteps } from './landing/ScrubbedSteps';
import { CinematicProgress } from './landing/CinematicProgress';
import {
  destroySmoothScroll,
  initSmoothScroll,
  isReducedMotion,
  registerCodropsEasings,
} from './landing/codrops-effects';

gsap.registerPlugin(ScrollTrigger, SplitText);

interface LandingProps {
  onOpenStudio: (slug?: string) => void;
}

export function Landing({ onOpenStudio }: LandingProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  // Lenis + reveals por blur en los titulares de sección (§5 efecto 1,
  // solo textos cortos; el H1 y Retención ya tienen su propia animación).
  useEffect(() => {
    initSmoothScroll();
    if (isReducedMotion()) return;
    registerCodropsEasings();
    const splits: SplitText[] = [];
    const root = rootRef.current;
    if (!root) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-codrops-blur]').forEach((el) => {
        const split = new SplitText(el, { type: 'chars' });
        splits.push(split);
        gsap.fromTo(
          split.chars,
          { filter: 'blur(10px) brightness(0%)', willChange: 'filter' },
          {
            filter: 'blur(0px) brightness(100%)',
            ease: 'none',
            stagger: 0.05,
            scrollTrigger: {
              trigger: el,
              start: 'top bottom-=15%',
              end: 'bottom center+=15%',
              scrub: true,
            },
          },
        );
      });
    }, root);
    return () => {
      ctx.revert();
      splits.forEach((s) => s.revert());
      destroySmoothScroll();
    };
  }, []);

  const cards = useMemo(
    () =>
      TEMPLATE_ORDER.map((slug) => {
        const b = TEMPLATES[slug];
        const exp = deriveExportSafe(b.scenesHtml, b.meta.scenes, b.meta.height);
        const r = computeRetention(b.meta.scenes, {
          safePoints: exp.points,
          format: b.meta.format,
        });
        return { slug, meta: b.meta, exportSafe: exp, retention: r };
      }),
    [],
  );

  const navItems = [
    { name: 'Qué es', link: '#que-es' },
    { name: 'Plantillas', link: '#plantillas' },
    { name: 'Retención', link: '#retencion' },
    { name: 'Studio', link: '#studio' },
  ];

  const marqueeItems = [
    ...AGENT_ORDER.map((id) => AGENTS[id].name),
    ...PROVIDER_ORDER.map((id) => PROVIDERS[id].name),
  ];

  return (
    <div ref={rootRef} className="relative overflow-x-clip bg-[#0A0A0F] text-[#F5F5F2]">
      <CinematicProgress />
      <FloatingNav navItems={navItems} />
      {/* Grano sutil (§5, noise 200 px) solo sobre la landing */}
      <div className="codrops-grain" aria-hidden="true" />

      {/* ---------- HERO TELESCOPE (Codrops §8) ---------- */}
      <TelescopeHero onOpenStudio={onOpenStudio} />

      {/* ---------- MARQUEE ---------- */}
      <div className="border-y border-white/[0.06] py-4" aria-hidden="true">
        <Marquee pauseOnHover>
          {marqueeItems.map((name) => (
            <span
              key={name}
              className="mx-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-sm text-[#9A9AA8]"
            >
              {name}
            </span>
          ))}
        </Marquee>
      </div>
      {/* La marquesina es decorativa (aria-hidden); la lista real para
          lectores de pantalla vive aquí, visible solo para ellos. */}
      <ul className="sr-only">
        {marqueeItems.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>

      {/* ---------- QUÉ ES ---------- */}
      <section id="que-es" className="mx-auto max-w-[1240px] scroll-mt-24 px-4 py-20 sm:px-6">
        <BlurFade>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#FFB020]">
            Qué es Flare
          </p>
          <h2 data-codrops-blur className="mt-2 font-display text-3xl font-bold sm:text-4xl">
            No un generador de vídeo. Un estudio para tu agente.
          </h2>
          <p className="mt-3 max-w-2xl text-[#9A9AA8]">
            El agente opera la interfaz como su propio espacio de trabajo: ventanas
            flotantes, timeline, panel de retención y log de actividad. Tú miras cómo
            trabaja, en tiempo real.
          </p>
        </BlurFade>
        <BentoGrid className="mt-10 lg:grid-cols-3">
          <BentoCard
            name="Agent-native de verdad"
            className="lg:col-span-1"
            background={
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(400px 200px at 80% 0%, rgba(139,92,246,0.18), transparent 70%)',
                }}
              />
            }
            Icon={Bot}
            description="El agente mueve ventanas, edita escenas y aplica arreglos con props, estados y eventos — no chatea dentro de una UI animada."
            href="#studio"
            cta="Abrir el Studio"
          />
          <BentoCard
            name="BYO agente, BYO key"
            className="lg:col-span-1"
            background={
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(400px 200px at 80% 0%, rgba(255,176,32,0.16), transparent 70%)',
                }}
              />
            }
            Icon={KeyRound}
            description="6 CLIs (Claude Code, Codex, Cursor, Gemini CLI, OpenCode, Qwen Code) y 13 proveedores — de OpenAI a Qwen y Ollama local. Tu key vive solo en tu navegador."
            href="#studio"
            cta="Ver proveedores"
          />
          <BentoCard
            name="Motor de retención"
            className="lg:col-span-1"
            background={
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(400px 200px at 80% 0%, rgba(255,90,60,0.16), transparent 70%)',
                }}
              />
            }
            Icon={Gauge}
            description="Hook en 2 s, captions, ritmo de cortes, CTA final y safe zones: 5 reglas, 100 puntos, umbral 75. Medido con posiciones reales, no con un flag."
            href="#retencion"
            cta="Cómo se mide"
          />
          <BentoCard
            name="Export real, no mockup"
            className="lg:col-span-2"
            background={
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(600px 240px at 20% 0%, rgba(255,176,32,0.12), transparent 70%)',
                }}
              />
            }
            Icon={Clapperboard}
            description="El anuncio es HTML/CSS/GSAP con timeline determinista. Se exporta a WebM real con MediaRecorder (canvas a 30 fps, resolución completa) y a storyboard HTML. El render a MP4 es un CLI opcional con Node + FFmpeg."
            href="#studio"
            cta="Exportar en el Studio"
          />
          <BentoCard
            name="Open source, 100% web"
            className="lg:col-span-1"
            background={
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(400px 200px at 80% 0%, rgba(52,211,153,0.12), transparent 70%)',
                }}
              />
            }
            Icon={Sparkles}
            description="MIT. Corre entero en el navegador: sin servidor, sin cuentas, sin subir tu key a ningún sitio."
            href="https://github.com/B4san/flare"
            cta="Ver el repo"
          />
        </BentoGrid>
      </section>

      {/* ---------- PLANTILLAS ---------- */}
      <section id="plantillas" className="mx-auto max-w-[1240px] scroll-mt-24 px-4 py-20 sm:px-6">
        <BlurFade>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#FFB020]">
            Plantillas reales
          </p>
          <h2 data-codrops-blur className="mt-2 font-display text-3xl font-bold sm:text-4xl">
            Tres anuncios que ya existen. Ábrelos y rómpelos.
          </h2>
          <p className="mt-3 max-w-2xl text-[#9A9AA8]">
            Son los ejemplos del proyecto: se cargan desde los archivos del repo y su
            score se calcula con el motor unificado. Cada plantilla muestra su
            duración real y su score medido en vivo.
          </p>
        </BlurFade>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {cards.map(({ slug, meta, retention }) => (
            <CardContainer key={slug} className="inter-var w-full">
              <CardBody className="flex h-full flex-col rounded-[20px] border border-white/10 bg-[#12121A] p-5">
                <CardItem translateZ={40} className="w-full">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display text-xl font-bold text-white">{meta.name}</p>
                    <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 font-mono text-[11px] text-[#9A9AA8]">
                      {meta.format} · {formatDuration(meta.duration)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[#9A9AA8]">
                    {meta.productLine}
                  </p>
                </CardItem>
                <CardItem translateZ={30} className="mt-4 w-full">
                  <p className="font-display text-2xl font-bold text-white">
                    {retention.total === null ? '—' : retention.total}
                    <span className="text-base text-[#9A9AA8]">/100</span>
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[#9A9AA8]">
                    Hook <b className="text-white">{retention.hook}/30</b> · Captions{' '}
                    <b className="text-white">{retention.captions}/25</b> · Cortes{' '}
                    <b className="text-white">{retention.cuts}/20</b> · CTA{' '}
                    <b className="text-white">{retention.cta}/15</b> · Safe{' '}
                    <b className="text-white">
                      {retention.safe === null ? '—' : retention.safe}/10
                    </b>
                  </p>
                  <p className="mt-1 text-xs text-[#82828F]">
                    {meta.scenes.length} escenas · {meta.description}
                  </p>
                </CardItem>
                <CardItem translateZ={20} className="mt-auto w-full pt-5">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenStudio(slug)}
                      className="bg-flare flex-1 rounded-full px-4 py-2.5 text-sm font-bold text-white"
                    >
                      Abrir en el Studio
                    </button>
                    <MorphingDialog>
                      <MorphingDialogTrigger className="rounded-full border border-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/5">
                        Ver escenas
                      </MorphingDialogTrigger>
                      <MorphingDialogContainer>
                        <MorphingDialogContent className="w-[480px] max-w-[92vw] rounded-[20px] border border-white/10 bg-[#12121A] p-6">
                          <MorphingDialogTitle className="font-display text-xl font-bold text-white">
                            {meta.name}
                          </MorphingDialogTitle>
                          <MorphingDialogSubtitle className="mt-1 text-sm text-[#9A9AA8]">
                            {meta.productLine} · {meta.format} · {formatDuration(meta.duration)} ·
                            score {retention.total === null ? '—' : retention.total}/100
                          </MorphingDialogSubtitle>
                          <MorphingDialogDescription className="mt-4">
                            <ul className="space-y-2">
                              {meta.scenes.map((s, i) => (
                                <li
                                  key={s.id}
                                  className="rounded-[12px] border border-white/[0.06] bg-[#0A0A0F]/60 px-3 py-2 text-sm"
                                >
                                  <b className="text-white">
                                    {i + 1}. {s.name}
                                  </b>{' '}
                                  <span className="font-mono text-xs text-[#9A9AA8]">
                                    {s.start.toFixed(1)}–{(s.start + s.duration).toFixed(1)} s
                                  </span>
                                  <span className="block text-xs text-[#9A9AA8]">
                                    “{s.caption}”
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </MorphingDialogDescription>
                          <MorphingDialogClose className="mt-4 rounded-full border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5">
                            Cerrar
                          </MorphingDialogClose>
                        </MorphingDialogContent>
                      </MorphingDialogContainer>
                    </MorphingDialog>
                  </div>
                </CardItem>
              </CardBody>
            </CardContainer>
          ))}
        </div>
      </section>

      {/* ---------- RETENCIÓN ---------- */}
      <section id="retencion" className="mx-auto max-w-[1240px] scroll-mt-24 px-4 py-20 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <BlurFade>
            <TextGenerateEffect
              words="Retención medida, no prometida."
              className="font-display text-3xl font-bold leading-tight sm:text-4xl"
            />
            <p className="mt-4 max-w-xl leading-relaxed text-[#9A9AA8]">
              Cinco reglas, cien puntos. El hook en los primeros 2 segundos, captions que
              cubran el 80%, cortes de 2 a 4 segundos, el CTA en los últimos 3 segundos y
              todo el texto dentro de la safe zone del 10%.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              {[
                'Hook en los primeros 2 s — 30 pts',
                'Captions ≥ 80% de la duración — 25 pts',
                'Ritmo de cortes (escenas de 2–4 s) — 20 pts',
                'CTA en los últimos 3 s, visible ≥ 2 s — 15 pts',
                'Safe zones (texto dentro del margen 10%) — 10 pts',
              ].map((rule) => (
                <li key={rule} className="flex items-center gap-2 text-[#F5F5F2]">
                  <span className="text-[#34D399]">✓</span> {rule}
                </li>
              ))}
            </ul>
            <p className="mt-6 rounded-[14px] border border-[#FBBF24]/30 bg-[#FBBF24]/[0.07] px-4 py-3 text-sm leading-relaxed text-[#FBBF24]">
              La safe zone se mide con posiciones reales en el navegador
              (getBoundingClientRect), escena por escena, en los 3 formatos. Si no se
              puede medir, Flare dice «sin verificar» en vez de inventar un 0/10.
            </p>
          </BlurFade>
          <BlurFade className="flex flex-col items-center rounded-[20px] border border-white/10 bg-[#12121A] p-8 text-center">
            <AnimatedCircularProgressBar
              value={100}
              max={100}
              min={0}
              gaugePrimaryColor="#FF5A3C"
              gaugeSecondaryColor="rgba(255,255,255,0.08)"
              className="size-44"
            />
            <p className="mt-4 font-display text-xl font-bold text-white">
              Descanso Total · 100/100
            </p>
            <p className="mt-1 text-sm text-[#9A9AA8]">
              Hook 30/30 · Captions 25/25 · Cortes 20/20 · CTA 15/15 · Safe 10/10
            </p>
            <button
              type="button"
              onClick={() => onOpenStudio('colchon-descanso-total')}
              className="bg-flare mt-6 rounded-full px-5 py-2.5 text-sm font-bold text-white"
            >
              Verlo medido en el Studio
            </button>
          </BlurFade>
        </div>
      </section>

      {/* ---------- CÓMO FUNCIONA (3 pasos scrubbed, §1 Kinetic) ---------- */}
      <ScrubbedSteps />

      {/* ---------- CTA FINAL + FOOTER ---------- */}
      <section className="mx-auto max-w-[1240px] px-4 pb-20 sm:px-6">
        <div className="rounded-[24px] border border-white/10 bg-[#12121A] px-6 py-14 text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Atrapa la mirada. <span className="text-flare">Retén el scroll.</span> Gana el
            click.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[#9A9AA8]">
            Abre el Studio, elige una plantilla y deja que tu agente trabaje delante de
            ti.
          </p>
          <ShimmerButton onClick={() => onOpenStudio()} className="mt-8 px-6 py-3 text-base font-bold">
            <span className="inline-flex items-center gap-2">
              <Play className="h-4 w-4" /> Abrir el Studio
            </span>
          </ShimmerButton>
        </div>
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-6 text-xs text-[#82828F]">
          <p>
            Flare — open source (MIT) · Hecho para el Dojo AI Hackathon 2026 ·{' '}
            <a
              href="https://github.com/B4san/flare"
              target="_blank"
              rel="noreferrer"
              className="text-[#9A9AA8] hover:text-white"
            >
              github.com/B4san/flare
            </a>
          </p>
          <p>Atrapa la mirada. Retén el scroll. Gana el click.</p>
        </footer>
      </section>
    </div>
  );
}
