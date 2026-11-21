// "Cómo funciona" — 3 pasos scrubbed estilo Kinetic Typography (§1).
// Cada paso es una palabra gigante que entra desde abajo, se lee en el
// centro y sale por arriba, ligada al scroll (sticky + timeline scrubbed,
// sin pin extra). En reduced-motion se apilan como lista estática.

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isReducedMotion, registerCodropsEasings } from './codrops-effects';
import { waitPinReady } from './pin-ready';

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  {
    word: 'Brief',
    label: 'Paso 1 · El punto de partida',
    desc: 'Describe el producto o elige una plantilla. El Studio genera un brief con escenas, duraciones, captions y las 5 reglas de retención.',
  },
  {
    word: 'Agente',
    label: 'Paso 2 · El agente construye',
    desc: 'Tu CLI (Claude Code, Codex, Cursor, Gemini CLI, OpenCode o Qwen Code) lee el brief con la skill flare y construye el anuncio como HTML + GSAP, con tu proveedor y tu key.',
  },
  {
    word: 'Render',
    label: 'Paso 3 · Preview, score y export',
    desc: 'El preview reproduce el anuncio, el motor de retención lo puntúa escena por escena midiendo las safe zones con posiciones reales, y exportas a WebM real, storyboard HTML o MP4.',
  },
];

export function ScrubbedSteps() {
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState<boolean>(() => isReducedMotion());

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduced) return;
    registerCodropsEasings();
    let cancelled = false;
    let tl: gsap.core.Timeline | null = null;
    let resizeTimer: number | undefined;

    // Estado inicial inmediato (antes de que exista el trigger): los pasos
    // nacen ocultos para que nunca se vean apilados.
    const ctx = gsap.context(() => {
      const steps = gsap.utils.toArray<HTMLElement>('.step-word');
      gsap.set(steps, { yPercent: 110, opacity: 0 });
    }, root);

    // El trigger se crea con start/end NUMÉRICOS, medidos de la geometría
    // real del documento (rango del sticky: top del contenedor hasta
    // top + altura − viewport). Números, no 'top top'/'bottom bottom':
    // _parsePosition usa un número tal cual y ningún refresh posterior lo
    // re-mide — y eso importa, porque el trigger creado ANTES del pin del
    // hero mide 900 px arriba (falta el pin-spacer) y ningún
    // ScrollTrigger.refresh() posterior lo corrige (medido R8b: rango
    // efectivo 3603–5763 frente al sticky real 4503–6663; ni un resize
    // genuino lo movió). Por eso se mide DESPUÉS del pin y de las fuentes.
    const build = () => {
      if (cancelled) return;
      tl?.scrollTrigger?.kill();
      tl?.kill();
      tl = null;
      const r = root.getBoundingClientRect();
      const stickyStart = Math.round(r.top + window.scrollY);
      const stickyEnd = Math.round(stickyStart + r.height - window.innerHeight);
      // Lead-in de 75 px: el primer paso ya viene entrando cuando el sticky
      // se engancha. Sin él, en el instante exacto del enganche los 3 pasos
      // están en opacidad 0 (muestra muerta en el borde, medida R8b).
      const start = stickyStart - 75;
      const end = stickyEnd;
      if (end <= start) return;
      tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start,
          end,
          scrub: 0.5,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (barRef.current) barRef.current.style.transform = `scaleX(${self.progress})`;
          },
        },
      });
      const steps = gsap.utils.toArray<HTMLElement>('.step-word');
      steps.forEach((step, i) => {
        // Solape estilo Kinetic: el siguiente paso entra (t+1.3) mientras
        // el anterior sale (t+1.2…t+1.9). Con el trigger alineado al sticky
        // real, cada paso tiene su dwell legible centrado y no hay zona
        // muerta; el comentario anterior que lo afirmaba sin medir era
        // falso (R8 B1), por eso ahora se verifica con barrido (r8b-verify).
        const t = i * 1.3;
        tl!.fromTo(
          step,
          { yPercent: 110, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.7, ease: 'cinematic' },
          t,
        );
        // El ÚLTIMO paso no sale: si saliera, la cola del sticky quedaba
        // vacía (Render con dwell de solo 200 px y ~50 px muertos al final,
        // medido R8b). Queda legible hasta que el sticky se suelta.
        // La salida empieza en t+1.2 (no t+0.9): con 0,5 s de hold a opacidad
        // 1, el dwell legible de cada paso es ~430 px de scroll en vez de
        // ~260 px (medido R8b: con 0,2 s de hold el muestreo discreto solo
        // cazaba 2 muestras de 100 px); sin solape de 2 pasos opacos a la
        // vez (el siguiente entra en t+1.3, cuando el anterior ya baja).
        if (i < steps.length - 1) {
          tl!.to(step, { yPercent: -110, opacity: 0, duration: 0.7, ease: 'cinematic' }, t + 1.2);
        }
      });
      // Hold final (objeto vacío: solo alarga la timeline): el último paso
      // entra en 2.6–3.3 y se queda hasta 4.2, así su dwell es ~530 px y la
      // duración total sigue siendo 4.2 (los dwells de Brief/Agente no cambian).
      tl!.to({}, { duration: 0.9 }, 3.3);
    };

    // Esperar al pin del hero (su spacer desplaza #como 900 px) y a las
    // fuentes (el swap cambia alturas sobre #como); medir antes deja el
    // trigger desalineado. Un frame después, para que el navegador aplique
    // el reflow post-fuentes. El timeout de waitPinReady evita bloquear la
    // sección si el pin fallara; 'load' y 'resize' reconstruyen con la
    // geometría vigente.
    const ready = Promise.all([
      waitPinReady(4000),
      document.fonts.ready.catch(() => undefined),
    ]);
    ready.then(() => {
      if (!cancelled) requestAnimationFrame(() => build());
    });
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(build, 250);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('load', build);
    return () => {
      cancelled = true;
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('load', build);
      tl?.scrollTrigger?.kill();
      tl?.kill();
      ctx.revert();
    };
  }, [reduced]);

  return (
    <section id="como" className="mx-auto max-w-[1240px] scroll-mt-24 px-4 py-20 sm:px-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#FFB020]">
        Cómo funciona
      </p>
      <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
        Del brief al vídeo en tres pasos
      </h2>

      {reduced ? (
        <ol className="mt-10 space-y-10">
          {STEPS.map((s, i) => (
            <li key={s.word}>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#FFB020]">
                {s.label}
              </p>
              <p className="mt-1 font-display text-4xl font-bold text-white">{s.word}</p>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#9A9AA8]">{s.desc}</p>
              <p className="sr-only">Paso {i + 1} de 3</p>
            </li>
          ))}
        </ol>
      ) : (
        <div ref={rootRef} className="relative mt-4" style={{ height: '340vh' }}>
          <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden text-center">
            {STEPS.map((s) => (
              <div
                key={s.word}
                className="step-word absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col items-center px-4 text-center"
                aria-hidden="true"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#FFB020]">
                  {s.label}
                </p>
                <p className="mt-3 font-display text-[clamp(3.5rem,12vw,9rem)] font-bold leading-[0.95] text-white">
                  {s.word}
                </p>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-[#9A9AA8]">{s.desc}</p>
              </div>
            ))}
            {/* Barra fina de progreso de los 3 pasos */}
            <div
              className="absolute bottom-10 left-1/2 h-[2px] w-40 -translate-x-1/2 overflow-hidden rounded-full bg-white/10"
              aria-hidden="true"
            >
              <div ref={barRef} className="bg-flare h-full w-full origin-left scale-x-0" />
            </div>
            {/* Texto real para lectores de pantalla */}
            <ol className="sr-only">
              {STEPS.map((s, i) => (
                <li key={s.word}>
                  Paso {i + 1}: {s.word}. {s.desc}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </section>
  );
}
