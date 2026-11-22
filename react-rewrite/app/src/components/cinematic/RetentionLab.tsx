// Flare — Laboratorio de retención.
// El motor real (computeRetention) conectado a controles: duración del hook,
// captions, ritmo de cortes, CTA y safe zones. El visitante rompe el anuncio,
// ve el score caer y lo arregla con el agente. Sin datos inventados: los
// puntos salen del mismo módulo que usa el Studio y el CLI.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Play, Pause, RotateCcw, Sparkles, Wand2 } from 'lucide-react';
import { PreviewClip } from '../preview/PreviewClip';
import { computeRetention } from '../../lib/retention';
import type { Scene } from '../../lib/types';
import { isReducedMotion } from '../landing/codrops-effects';
import { Reveal } from './motion';
import { SectionIntro } from './Chrome';

type Rhythm = 'lento' | 'editorial' | 'rapido';

const RHYTHM_LABEL: Record<Rhythm, string> = {
  lento: 'Lento',
  editorial: 'Editorial',
  rapido: 'Rápido',
};
const RHYTHM_DUR: Record<Rhythm, [number, number, number, number]> = {
  lento: [5, 5, 3, 3],
  editorial: [3, 3, 3, 3],
  rapido: [2, 2, 2, 2],
};

type LabBase = Omit<Scene, 'start' | 'duration' | 'captionDuration'>;

const BASE: LabBase[] = [
  {
    id: 's1',
    name: 'Hook',
    kicker: 'Descanso Total',
    headline: '¿Dormiste mal otra vez?',
    headlineHl: 'otra vez?',
    sub: 'Otra noche en vela, otra mañana agotada.',
    caption: 'Dormir mal se paga todo el día.',
    tone: 'tone-dark',
    visualKind: 'moon',
  },
  {
    id: 's2',
    name: 'Dolor',
    kicker: 'El problema',
    headline: 'Te levantas cansado.',
    headlineHl: 'cansado.',
    sub: 'Con la espalda rota, todos los días.',
    caption: 'El colchón viejo ya no te deja descansar.',
    tone: 'tone-pink',
    visualKind: 'zzz',
  },
  {
    id: 's3',
    name: 'Producto',
    kicker: 'Descanso Total',
    headline: 'Llegó Descanso Total',
    headlineHl: 'Descanso Total',
    sub: 'La cama que por fin te deja dormir.',
    caption: 'Un descanso pensado para tu espalda.',
    tone: 'tone-violet',
    visualKind: 'bed',
  },
  {
    id: 's4',
    name: 'Beneficio',
    kicker: 'Beneficio',
    headline: 'Soporte firme, frescura total.',
    headlineHl: 'frescura total.',
    sub: 'Firme donde hace falta, fresco toda la noche.',
    caption: 'Duerme fresco, despierta entero.',
    tone: 'tone-cyan',
    visualKind: 'breeze',
  },
  {
    id: 's5',
    name: 'Prueba',
    kicker: 'Resultado',
    headline: 'Despierta renovado.',
    headlineHl: 'renovado.',
    sub: 'Mañanas con energía, desde la primera noche.',
    caption: 'El amanecer se siente distinto.',
    tone: 'tone-violet',
    visualKind: 'sun',
  },
  {
    id: 's6',
    name: 'CTA',
    kicker: 'Descanso Total',
    headline: 'Descúbrelo hoy',
    headlineHl: 'hoy',
    sub: 'Duerme mejor desde hoy.',
    caption: 'Tu mejor noche empieza hoy.',
    tone: 'tone-violet',
    visualKind: 'badge',
    isCTA: true,
    ctaLabel: 'Descúbrelo hoy',
    midline: 'Soporte firme, frescura total.',
    midChips: ['✓ Soporte firme', '✓ Frescura total', '✓ Despierta renovado'],
  },
];

const COLORS = {
  pass: '#34D399',
  warn: '#FBBF24',
  fail: '#FB7185',
};

function buildScenes(hook: number, rhythm: Rhythm, captions: boolean, cta: number): Scene[] {
  const body = RHYTHM_DUR[rhythm];
  const durations = [hook, ...body, cta];
  let t = 0;
  return BASE.map((b, i) => {
    const duration = durations[i];
    const scene: Scene = {
      ...b,
      start: t,
      duration,
      motion: true,
      caption: captions ? b.caption : '',
      captionDuration: captions ? duration : 0,
      safe: true,
    };
    t += duration;
    return scene;
  });
}

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`lab-toggle ${on ? 'is-on' : ''}`}
      data-cursor={on ? 'Quitar' : 'Activar'}
    >
      <i />
    </button>
  );
}

export function RetentionLab() {
  const [hook, setHook] = useState(3.6);
  const [captions, setCaptions] = useState(false);
  const [rhythm, setRhythm] = useState<Rhythm>('lento');
  const [cta, setCta] = useState(1.2);
  const [safe, setSafe] = useState(false);
  const [playing, setPlaying] = useState(() => !isReducedMotion());
  const [time, setTime] = useState(0);
  const [selected, setSelected] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [fixing, setFixing] = useState(false);
  const timers = useRef<number[]>([]);
  const timeRef = useRef(0);
  const shellRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);

  const scenes = useMemo(
    () => buildScenes(hook, rhythm, captions, cta),
    [hook, rhythm, captions, cta],
  );
  const total = scenes.reduce((a, s) => a + s.duration, 0);

  const retention = useMemo(
    () =>
      computeRetention(scenes, {
        safePoints: safe ? 10 : 6,
        format: '9:16',
        safeFix: 'Activa las guías y mantén todo el texto dentro del 10 %.',
      }),
    [scenes, safe],
  );

  const selectedScene = scenes[Math.min(selected, scenes.length - 1)];

  // Pausa cuando el laboratorio no está en pantalla (rendimiento).
  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Reloj del preview (rAF, 12 fps de estado para no re-renderizar de más).
  useEffect(() => {
    if (!playing || !inView) return;
    let raf = 0;
    let last = performance.now();
    let lastPaint = 0;
    let t = timeRef.current >= total ? 0 : timeRef.current;
    const tick = (now: number) => {
      const dt = Math.min(0.12, (now - last) / 1000);
      last = now;
      t += dt;
      if (t >= total) t = 0;
      timeRef.current = t;
      if (now - lastPaint > 80) {
        lastPaint = now;
        setTime(t);
        let acc = 0;
        let idx = 0;
        for (let i = 0; i < scenes.length; i++) {
          if (t >= acc && t < acc + scenes[i].duration) {
            idx = i;
            break;
          }
          acc += scenes[i].duration;
        }
        setSelected(idx);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, inView, total, scenes]);

  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
    },
    [],
  );

  const seekTo = (index: number) => {
    const t = scenes[index]?.start ?? 0;
    timeRef.current = t;
    setTime(t);
    setSelected(index);
  };

  const runFix = () => {
    if (fixing) return;
    setFixing(true);
    setLog([]);
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    const push = (line: string) => setLog((l) => [...l, line]);
    const steps: Array<{ delay: number; run: () => void; line: string }> = [
      { delay: 300, run: () => setHook(2.5), line: 'hook 3.6s → 2.5s' },
      { delay: 900, run: () => setCaptions(true), line: 'captions 0 % → 100 %' },
      { delay: 1500, run: () => setRhythm('editorial'), line: 'cortes → 2–4 s' },
      { delay: 2100, run: () => setCta(3), line: 'cta 1.2s → 3.0s' },
      { delay: 2700, run: () => setSafe(true), line: 'safe zones → guías on' },
    ];
    steps.forEach((s) => {
      timers.current.push(
        window.setTimeout(() => {
          s.run();
          push(s.line);
          setSelected(0);
          timeRef.current = 0;
          setTime(0);
        }, s.delay),
      );
    });
    timers.current.push(
      window.setTimeout(() => {
        setFixing(false);
        setPlaying(true);
      }, 3250),
    );
  };

  const reset = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    setFixing(false);
    setLog([]);
    setHook(3.6);
    setCaptions(false);
    setRhythm('lento');
    setCta(1.2);
    setSafe(false);
    setSelected(0);
    setTime(0);
    timeRef.current = 0;
  };

  const score = retention.total ?? 0;
  const scoreColor =
    score === 100 ? '#FFB020' : score >= 75 ? '#34D399' : score >= 50 ? '#FBBF24' : '#FB7185';
  const firstFail = retention.items.find((i) => !i.pass);

  return (
    <section id="motor" className="cine-section scroll-mt-20">
      <div className="mx-auto w-full max-w-[1680px] px-5 sm:px-8 lg:px-12">
        <SectionIntro
          n="03"
          label="Motor de retención"
          title={
            <>
              Rompe el anuncio.
              <br />
              <span className="serif-i text-flare-soft">Mira cómo cae el score.</span>
            </>
          }
          aside="Cinco reglas, cien puntos. Mueve las piezas y el motor real recalcula. Después deja que el agente lo arregle."
        />

        <Reveal className="mt-14">
          <div ref={shellRef} className="lab-shell p-5 sm:p-7 lg:p-9">
            <div className="grid gap-9 lg:grid-cols-[1.05fr_0.78fr_1.05fr] lg:gap-8">
              {/* ---------- Score ---------- */}
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="kicker !text-[#FFB020]">Score en vivo</p>
                    <div className="mt-1 flex items-end gap-3">
                      <span
                        className={`lab-score ${score === 100 ? 'text-flare-soft' : ''}`}
                        aria-live="polite"
                      >
                        {retention.total === null ? '—' : retention.total}
                      </span>
                      <span className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8C8A92]">
                        / 100
                      </span>
                    </div>
                  </div>
                  <svg width="92" height="92" viewBox="0 0 92 92" className="-mt-1 shrink-0" aria-hidden="true">
                    <circle cx="46" cy="46" r="39" fill="none" stroke="rgba(244,241,233,0.1)" strokeWidth="1.5" />
                    <circle
                      cx="46"
                      cy="46"
                      r="39"
                      fill="none"
                      stroke={scoreColor}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 39}
                      strokeDashoffset={2 * Math.PI * 39 * (1 - score / 100)}
                      transform="rotate(-90 46 46)"
                      style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(.16,1,.3,1), stroke .4s ease' }}
                    />
                    <text
                      x="46"
                      y="43"
                      textAnchor="middle"
                      fontSize="8"
                      fontFamily="JetBrains Mono, monospace"
                      fill="#8C8A92"
                      letterSpacing="1.5"
                    >
                      VERDICT
                    </text>
                    <text
                      x="46"
                      y="56"
                      textAnchor="middle"
                      fontSize="8.5"
                      fontFamily="Inter, sans-serif"
                      fontWeight="700"
                      fill={scoreColor}
                    >
                      {score >= 75 ? 'READY' : score >= 50 ? 'ALMOST' : 'WEAK'}
                    </text>
                  </svg>
                </div>

                <p
                  className="mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold"
                  style={{
                    borderColor: `${scoreColor}55`,
                    color: scoreColor,
                    background: `${scoreColor}12`,
                  }}
                >
                  {retention.verdict}
                </p>

                <ul className="mt-6">
                  {retention.items.map((item) => {
                    const pct = item.pts === null ? 0 : (item.pts / item.max) * 100;
                    const color = item.pass ? COLORS.pass : pct > 0 ? COLORS.warn : COLORS.fail;
                    return (
                      <li key={item.key} className="lab-rule">
                        <span className="flex items-center gap-2 text-[12px] text-[#E8E4DA]">
                          <span
                            className="inline-block h-1.5 w-1.5 rounded-full"
                            style={{ background: color }}
                          />
                          {item.label}
                        </span>
                        <span className="font-mono text-[10px] text-[#8C8A92]">
                          {item.pts === null ? '—' : item.pts}/{item.max}
                        </span>
                        <span className="lab-rule-bar">
                          <i style={{ width: `${pct}%`, background: color }} />
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-4 flex items-start gap-2 rounded-[10px] border border-white/8 bg-white/[0.025] px-3 py-2.5">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FFB020]" />
                  <p className="text-[11px] leading-relaxed text-[#B8B4AB]">
                    {firstFail ? firstFail.fix : 'Todo en verde. Este anuncio está listo para publicar.'}
                  </p>
                </div>
                <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-[#5F5D66]">
                  computeRetention() · mismo motor que el Studio
                </p>
              </div>

              {/* ---------- Preview ---------- */}
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <div className="phone" style={{ padding: 7, borderRadius: 38 }}>
                    <div className="phone-screen" style={{ borderRadius: 32 }}>
                      <div className="phone-glare" style={{ borderRadius: 32 }} />
                      <PreviewClip
                        scene={selectedScene}
                        format="9:16"
                        showSafeGuides={safe}
                        staticMode={false}
                      />
                    </div>
                  </div>
                  {!safe && (
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#FB7185]/40 bg-[#FB7185]/15 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[#FB7185]">
                      safe zone apagada
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPlaying((p) => !p)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-[#F4F1E9] hover:bg-white/10"
                    aria-label={playing ? 'Pausar preview' : 'Reproducir preview'}
                    data-cursor={playing ? 'Pausar' : 'Reproducir'}
                  >
                    {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </button>
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8C8A92]">
                    {time.toFixed(1)} / {total.toFixed(1)} s
                  </span>
                  <span className="h-3 w-px bg-white/15" />
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8C8A92]">
                    {selectedScene.name}
                  </span>
                </div>
              </div>

              {/* ---------- Controles ---------- */}
              <div>
                <div className="flex items-center justify-between">
                  <p className="kicker">Tu turno</p>
                  <button
                    type="button"
                    onClick={reset}
                    className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#8C8A92] hover:text-[#F4F1E9]"
                    data-cursor="Reset"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <div className="flex items-baseline justify-between">
                      <label htmlFor="hook-range" className="text-[12px] text-[#E8E4DA]">
                        Duración del hook
                      </label>
                      <span
                        className="font-mono text-[10px]"
                        style={{ color: hook <= 2.5 ? COLORS.pass : COLORS.warn }}
                      >
                        {hook.toFixed(1)} s
                      </span>
                    </div>
                    <input
                      id="hook-range"
                      type="range"
                      min={1.5}
                      max={4.5}
                      step={0.1}
                      value={hook}
                      onChange={(e) => setHook(Number(e.target.value))}
                      className="lab-range mt-2"
                      aria-describedby="hook-help"
                    />
                    <p id="hook-help" className="mt-1 font-mono text-[8.5px] uppercase tracking-[0.12em] text-[#5F5D66]">
                      ≤ 2,5 s = 30 pts · más = 15 pts
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/8 pt-3">
                    <span className="text-[12px] text-[#E8E4DA]">Captions en todas las escenas</span>
                    <Toggle on={captions} onChange={setCaptions} label="Captions" />
                  </div>

                  <div>
                    <span className="text-[12px] text-[#E8E4DA]">Ritmo de cortes</span>
                    <div className="lab-seg mt-2">
                      {(Object.keys(RHYTHM_LABEL) as Rhythm[]).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRhythm(r)}
                          className={rhythm === r ? 'is-on' : ''}
                          data-cursor="Elegir"
                        >
                          {RHYTHM_LABEL[r]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[12px] text-[#E8E4DA]">CTA final</span>
                    <div className="lab-seg mt-2">
                      {[1.2, 2, 3].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setCta(v)}
                          className={cta === v ? 'is-on' : ''}
                          data-cursor="Elegir"
                        >
                          {v} s
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/8 pt-3">
                    <span className="text-[12px] text-[#E8E4DA]">Safe zones (margen 10 %)</span>
                    <Toggle on={safe} onChange={setSafe} label="Safe zones" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={runFix}
                  disabled={fixing}
                  className="flare-btn flare-btn-solid mt-5 h-11 w-full text-[13px] disabled:opacity-60"
                  data-cursor="Arreglar"
                >
                  {fixing ? (
                    <>
                      <Wand2 className="h-4 w-4 animate-pulse" /> El agente está arreglando…
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" /> Arreglar con el agente
                    </>
                  )}
                </button>

                {log.length > 0 && (
                  <div className="fix-log mt-3 rounded-[10px] border border-white/8 bg-black/20 p-3" aria-live="polite">
                    {log.map((l) => (
                      <p key={l} className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-[#34D399]" /> {l}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="mt-8 border-t border-white/10 pt-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#8C8A92]">
                  Timeline · {scenes.length} escenas · {total.toFixed(1)} s
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#8C8A92]">
                  Cobertura captions {Math.round(retention.coverage * 100)} %
                </span>
              </div>
              <div className="relative">
                <div className="lab-timeline">
                  {scenes.map((s, i) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => seekTo(i)}
                      className={`lab-block ${i === selected ? 'is-on' : ''}`}
                      style={{ flexGrow: s.duration, flexBasis: 0 }}
                      aria-label={`Ir a ${s.name}, ${s.duration} s`}
                      data-cursor="Ir"
                    >
                      <span className="block truncate font-mono text-[8px] uppercase tracking-[0.12em] text-[#B8B4AB]">
                        {String(i + 1).padStart(2, '0')} {s.name}
                      </span>
                      <span className="mt-0.5 block font-mono text-[8px] text-[#5F5D66]">
                        {s.duration.toFixed(1)} s
                      </span>
                    </button>
                  ))}
                </div>
                <span
                  className="lab-playhead"
                  style={{ left: `${total ? (time / total) * 100 : 0}%` }}
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
        </Reveal>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-lg text-[12px] leading-relaxed text-[#8C8A92]">
            Este laboratorio no es una demo aparte: importa el mismo módulo de retención que
            puntúa tus ejemplos y tu Studio. Si el número cambia aquí, cambia allí.
          </p>
          <div className="flex items-center gap-4 font-mono text-[9px] uppercase tracking-[0.16em] text-[#5F5D66]">
            <span>Hook 30</span>
            <span>Captions 25</span>
            <span>Cortes 20</span>
            <span>CTA 15</span>
            <span>Safe 10</span>
          </div>
        </div>
      </div>
    </section>
  );
}
