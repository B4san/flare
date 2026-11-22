// Flare — Agentes y proveedores.
// El equipo ya está contratado: 6 CLIs con la skill flare y 13 proveedores
// BYO key. La lista es interactiva y el terminal muestra el comando real.

import { useEffect, useState } from 'react';
import { ArrowUpRight, Check, Copy, Terminal } from 'lucide-react';
import { AGENT_ORDER, AGENTS, PROVIDER_ORDER, PROVIDERS } from '../../lib/data';
import type { AgentId } from '../../lib/types';
import { Reveal } from './motion';
import { FlareButton, SectionIntro } from './Chrome';

function ProviderRow({ reverse }: { reverse?: boolean }) {
  const names = PROVIDER_ORDER.map((id) => PROVIDERS[id].name);
  return (
    <div className="marquee py-1" aria-hidden="true">
      <div className={`marquee-track ${reverse ? 'reverse' : ''}`} style={{ animationDuration: '52s' }}>
        {[0, 1].map((dup) => (
          <div key={dup} className="flex shrink-0 items-center">
            {names.map((n, i) => (
              <span key={`${dup}-${i}`} className="provider-line flex items-center gap-5 px-5">
                <span
                  className={
                    reverse
                      ? 'text-transparent'
                      : i % 3 === 0
                        ? 'text-[#F4F1E9]'
                        : 'text-[#2f2d36]'
                  }
                  style={
                    reverse ? { WebkitTextStroke: '1px rgba(244,241,233,0.16)' } : undefined
                  }
                >
                  {n}
                </span>
                <span className="text-[0.28em] text-[#FF5A3C]">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AgentsSection({ onOpenStudio }: { onOpenStudio: () => void }) {
  const [active, setActive] = useState<AgentId>('claude-code');
  const [copied, setCopied] = useState(false);
  const agent = AGENTS[active];

  const choose = (id: AgentId) => {
    setActive(id);
    setCopied(false);
  };

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(t);
  }, [copied]);

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(agent.command);
      setCopied(true);
    } catch {
      /* clipboard bloqueado por el navegador: el comando sigue visible */
    }
  };

  return (
    <section id="agentes" className="cine-section scroll-mt-20">
      <div className="mx-auto w-full max-w-[1680px] px-5 sm:px-8 lg:px-12">
        <SectionIntro
          n="05"
          label="El equipo"
          title={
            <>
              Tu equipo ya está
              <br />
              <span className="serif-i text-flare-soft">contratado.</span>
            </>
          }
          aside="Sin cuentas, sin suscripciones, sin servidores. Tu CLI, tu proveedor y tu key. Flare pone la skill, la interfaz y el motor."
        />

        <div className="mt-16 grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <div className="mb-4 flex items-center justify-between">
              <p className="kicker">06 agentes CLI</p>
              <p className="kicker">selecciona uno</p>
            </div>
            <div>
              {AGENT_ORDER.map((id, i) => {
                const a = AGENTS[id];
                const on = id === active;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`agent-row ${on ? 'is-active' : ''}`}
                    onPointerEnter={() => choose(id)}
                    onFocus={() => choose(id)}
                    onClick={() => choose(id)}
                    aria-pressed={on}
                    data-cursor="Elegir"
                  >
                    <span className="w-8 shrink-0 font-mono text-[9px] tracking-[0.16em] text-[#5F5D66]">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span
                      className="agent-dot shrink-0"
                      style={{ background: a.color, color: a.color, opacity: on ? 1 : 0.45 }}
                    />
                    <span className="agent-name flex-1">{a.name}</span>
                    <span
                      className="hidden rounded-full border px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.14em] sm:inline-block"
                      style={{
                        borderColor: on ? `${a.color}66` : 'rgba(244,241,233,0.12)',
                        color: on ? a.color : '#8C8A92',
                      }}
                    >
                      skill flare
                    </span>
                    <ArrowUpRight className="agent-arrow h-5 w-5 shrink-0 text-[#F4F1E9]" />
                  </button>
                );
              })}
            </div>

            <Reveal className="mt-10 flex flex-wrap items-end gap-x-12 gap-y-6">
              <div>
                <p className="font-display text-[clamp(2.6rem,5vw,4rem)] font-bold leading-none tracking-[-0.05em]">
                  06<span className="text-[#FF5A3C]">.</span>
                </p>
                <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#8C8A92]">
                  agentes CLI
                </p>
              </div>
              <div>
                <p className="font-display text-[clamp(2.6rem,5vw,4rem)] font-bold leading-none tracking-[-0.05em]">
                  13<span className="text-[#FFB020]">.</span>
                </p>
                <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#8C8A92]">
                  proveedores BYO
                </p>
              </div>
              <div>
                <p className="font-display text-[clamp(2.6rem,5vw,4rem)] font-bold leading-none tracking-[-0.05em]">
                  00<span className="text-[#8B5CF6]">.</span>
                </p>
                <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#8C8A92]">
                  servidores
                </p>
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-5">
            <div
              className="lab-shell relative overflow-hidden p-5 sm:p-6 lg:sticky lg:top-28"
              style={{
                background: `radial-gradient(80% 60% at 100% 0%, ${agent.color}22, transparent 60%), rgba(11,10,15,0.85)`,
              }}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="h-3.5 w-3.5 text-[#8C8A92]" />
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#8C8A92]">
                    {agent.name}
                  </span>
                </div>
                <span className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.14em] text-[#34D399]">
                  <span className="studio-live-dot" /> ready
                </span>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#5F5D66]">
                    comando
                  </p>
                  <button
                    type="button"
                    onClick={copyCommand}
                    className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.14em] text-[#8C8A92] transition hover:text-[#F4F1E9]"
                    data-cursor={copied ? 'Copiado' : 'Copiar'}
                  >
                    {copied ? <Check className="h-3 w-3 text-[#34D399]" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <p className="mt-2 break-words font-mono text-[11px] leading-[1.9] text-[#E8E4DA]">
                  <span className="text-[#5F5D66]">$ </span>
                  {agent.command}
                </p>
              </div>

              <div className="mt-5 space-y-1.5 rounded-[12px] border border-white/8 bg-black/25 p-3 font-mono text-[10px] leading-relaxed text-[#8C8A92]">
                <p>
                  <span className="text-[#34D399]">✓</span> skill flare · {agent.sub}
                </p>
                <p>
                  <span className="text-[#34D399]">✓</span> brief.md detectado
                </p>
                <p>
                  <span className="text-[#34D399]">✓</span> scenes.html listo para editar
                </p>
                <p>
                  <span className="text-[#5F5D66]">→</span> esperando tu siguiente instrucción
                </p>
              </div>

              <div className="mt-5">
                <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#5F5D66]">
                  proveedor por defecto
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {PROVIDER_ORDER.slice(0, 6).map((id) => (
                    <span
                      key={id}
                      className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[#8C8A92]"
                    >
                      {PROVIDERS[id].name}
                    </span>
                  ))}
                  <span className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[#5F5D66]">
                    +7
                  </span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                <p className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-[#8C8A92]">
                  <Check className="h-3 w-3 text-[#34D399]" /> key solo en tu navegador
                </p>
                <FlareButton
                  onClick={onOpenStudio}
                  className="h-9 px-4 text-[11px]"
                  cursor="Abrir"
                >
                  Abrir Studio
                </FlareButton>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-24 border-y border-white/10 py-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <p className="display text-[clamp(1.9rem,3.4vw,3.2rem)]">
              Cualquier modelo. <span className="text-[#8C8A92]">Tu key.</span>{' '}
              <span className="serif-i text-flare-soft">Cero servidores.</span>
            </p>
            <p className="max-w-xs text-[12px] leading-relaxed text-[#8C8A92]">
              OpenAI, Anthropic, Gemini, Qwen, DeepSeek, Groq, Ollama local, LM Studio y
              cualquier endpoint compatible.
            </p>
          </div>
          <ProviderRow />
          <ProviderRow reverse />
        </div>
      </div>
    </section>
  );
}
