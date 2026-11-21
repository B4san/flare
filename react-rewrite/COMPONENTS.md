# COMPONENTS.md — Catálogo cosechado para la reescritura de Flare en React

> **Propósito:** este archivo es SOLO cosecha. No diseña ni construye la web. El agente diseñador usará estos componentes reales (con su código fuente) para construir la nueva Flare en React.
>
> **Fecha de cosecha:** 2026-11-21. **Cosechador:** agente cosechador de componentes.
>
> **Regla de verificación:** cada componente lleva un estado:
> - ✅ **OFICIAL** — leído en la documentación oficial, el registry oficial o la página del componente.
> - 📋 **CATÁLOGO** — visto en un catálogo/índice verificado (oficial o secundario con fuente), con nombre, descripción y dependencias confirmados, pero sin haber leído su página de props. **El diseñador debe abrir la página oficial del componente y leer sus props exactas antes de usarlo. No inventar props.**
> - ⚠️ **NO VERIFICADO** — mencionado en una fuente pero sin confirmación suficiente. Evitar o verificar primero.
>
> Ningún prop, comando o versión de este archivo es inventado: todo lo que aparece con valor exacto viene de una fuente leída en esta cosecha (fuentes citadas al pie de cada sección).

## 0. Contexto de Flare (para qué sirve cada componente)

Flare es un estudio web agent-native para crear comerciales animados de producto. La interfaz que se construirá en React necesita:

| Zona | Qué debe hacer |
|---|---|
| **Landing** | Hero impresionante, secciones de features, prueba social, CTA. Debe dejar de verse genérica. |
| **Studio** | Preview 9:16 / 1:1 / 16:9 del comercial, timeline de escenas, controles de reproducción, exportar WebM. |
| **Agente** | Personaje/presencia del agente que se mueve entre ventanas flotantes, con estados visibles: pensando, analizando, editando, renderizando. |
| **Actividad** | Visualizador de actividad de la IA en tiempo real: qué herramienta está usando, qué está editando, progreso, aprobaciones. |
| **Retención** | Panel de score de retención (hook 2s, captions, ritmo de cortes, CTA, safe zones) que reacciona a los datos del comercial. |
| **Selectores** | Agente (Claude Code, Codex, Cursor, Gemini CLI, OpenCode, Qwen Code) y proveedor (OpenAI, Anthropic, Gemini, Qwen, DeepSeek, Groq, Together, Mistral, OpenRouter, Fireworks, Ollama/LM Studio, custom OpenAI-compatible). |

**Principio del usuario (no negociable):** los componentes deben ser **USABLES POR EL AGENTE**: props configurables, estados y eventos, acciones ejecutables por código, control programático de animaciones, integración React, reacción a datos en tiempo real. La IA opera la interfaz como su propio espacio de trabajo: abre ventanas, las mueve al centro, muestra indicadores, actualiza tablas mientras trabaja.

## 0.1 Stack base recomendado (verificado)

| Pieza | Paquete / comando | Fuente |
|---|---|---|
| React 19 + Tailwind CSS v4 | base del proyecto (Agent Elements exige React 19 y Tailwind v4; Motion Primitives y Aceternity usan Tailwind v4) | Agent Elements SKILL.md, Motion Primitives |
| shadcn/ui | `npx shadcn@latest init` (prerrequisito de casi todos los registries) | Magic UI, Aceternity, Animate UI, Agent Elements |
| Motion | `npm install motion` (antes framer-motion; se importa desde `motion/react`) | motion.dev / SKILL motion |
| GSAP | `npm install gsap @gsap/react` | gsap.com docs / SKILL gsap |
| Three.js (React) | `npm install three @react-three/fiber @react-three/drei` + `npm install -D @types/three` | R3F SKILL (versiones verificadas jul 2026: three 0.185, fiber 9.6, drei 10.7; fiber v9 exige React 19) |
| Rive | `npm install @rive-app/react-canvas` | rive-app/rive-react, Codrops |
| Spline | `npm install @splinetool/react-spline @splinetool/runtime` (react-spline v4.2.0) | npm.io / Spline docs |
| Lottie | `npm install lottie-react` (recomendado 2026; alternativa legacy `react-lottie`) | lottie-react docs / DEV |
| Iconos | `lucide-react`, `@tabler/icons-react` (Aceternity usa Tabler; Motion Primitives usa lucide) | Aceternity, Motion Primitives |
| AI SDK (para Agent Elements) | `ai` + `@ai-sdk/react` (`useChat()`) | Agent Elements SKILL.md |

> **Regla de SSR:** Rive, Lottie, Spline y cualquier `<Canvas>` de R3F NO hacen SSR. En Next.js: componente cliente (`'use client'`) + `next/dynamic` con `ssr: false`. En Vite no hay problema.

---

## 1. 21st.dev — Agent Elements (el kit del agente) ✅ OFICIAL

**Qué es:** registry shadcn de 21st.dev con primitivas de UI para chat, herramientas y flujos de agente. Es el kit más directamente alineado con Flare: está hecho para que un agente opere la interfaz (tool calls, planes, aprobaciones, preguntas).

- **Sitio:** https://agent-elements.21st.dev — **Docs:** https://agent-elements.21st.dev/docs
- **Repo:** https://github.com/21st-dev/agent-elements (MIT, según README)
- **Registry:** https://agent-elements.21st.dev/r/index.json — por componente: `https://agent-elements.21st.dev/r/<id>.json`
- **Docs completas en un archivo:** https://agent-elements.21st.dev/llms-full.txt
- **Requisitos:** React 19+, Tailwind CSS v4, proyecto inicializado con shadcn.
- **Instalación base:** `npx shadcn@latest add https://agent-elements.21st.dev/r/agent-chat.json` (instala transitivamente todo lo que necesita; los archivos caen en `components/agent-elements/`).
- **Tema:** lee variables Tailwind `--an-foreground`, `--an-background`, `--an-primary-color` + tokens shadcn estándar. Personalizar = editar el archivo instalado (el código ya es tuyo).
- **Fuente leída:** `agent-elements/skills/agent-elements/SKILL.md` (repo oficial 21st-dev/agent-elements) + README oficial.

### 1.1 AgentChat ✅ OFICIAL
- **Qué hace:** shell completa de chat del agente. Renderiza `MessageList` + `InputBar`, despacha tool invocations a renderers, muestra empty state con sugerencias.
- **Props (verificadas):** `messages` (UIMessage[] del AI SDK), `status` (ChatStatus), `onSend`, `onStop`, `toolRenderers?`, `suggestions?`, `attachments?`, `classNames?`, `slots?`.
- **Control por agente:** `toolRenderers` es un mapa `{ Bash: BashTool, Edit: EditTool, ... }` — el agente decide qué renderer muestra cada tool call. `status` (`submitted` / `streaming` / `ready` / `error`) lo controla el loop del agente vía `useChat()`.
- **Instalación:** `npx shadcn@latest add https://agent-elements.21st.dev/r/agent-chat.json`
- **Ejemplo mínimo (oficial):**
```tsx
"use client";
import { AgentChat } from "@/components/agent-elements/agent-chat";
import { useChat } from "@ai-sdk/react";
const { messages, status, sendMessage, stop } = useChat();
<AgentChat messages={messages} status={status}
  onSend={({ content }) => sendMessage({ text: content })} onStop={stop}
  toolRenderers={{ Bash: BashTool, Edit: EditTool, Search: SearchTool }} />
```
- **Para Flare:** la superficie principal del agente en el Studio (panel lateral o ventana flotante del agente).

### 1.2 MessageList ✅ OFICIAL
- **Qué hace:** solo el transcript (sin input bar). Útil cuando el input va en otro sitio.
- **Props (verificadas):** acepta `toolRenderers` y `showCopyToolbar`.
- **Instalación:** `npx shadcn@latest add https://agent-elements.21st.dev/r/message-list.json`
- **Para Flare:** log de actividad del agente (historial de acciones) separado del composer.

### 1.3 InputBar ✅ OFICIAL
- **Qué hace:** composer del agente con adjuntos, sugerencias, selectores.
- **Props (verificadas):** `status`, `onSend({ content })`, `onStop`, `value?` + `onChange?` (controlado), `attachedImages` / `attachedFiles` con sus handlers de remove, `leftActions` / `rightActions` (slots), `suggestions?`, `questionBar?`, `infoBar?`.
- **Control por agente:** `leftActions` admite `ModelPicker` y `ModeSelector` — exactamente los selectores de proveedor/agente de Flare. `status` deshabilita el envío mientras el agente trabaja.
- **Instalación:** `npx shadcn@latest add https://agent-elements.21st.dev/r/input-bar.json`
- **Para Flare:** barra de prompt del Studio ("Crea un comercial para…", "Cambia la escena 3…").

### 1.4 ModelPicker + ModeSelector ✅ OFICIAL
- **Qué hacen:** pickers diseñados para ir en `leftActions` del InputBar. `ModelPicker` acepta `{ id, name, version? }[]`; `ModeSelector` acepta `{ id, label, icon?, description? }[]`. El diseñador debe pasar su propio array (no importar constantes predefinidas: `CLAUDE_MODELS` fue eliminado).
- **Instalación:** vienen con el registry de Agent Elements (`input/model-picker`, `input/mode-selector`).
- **Ejemplo mínimo (oficial):**
```tsx
const modes = [{ id: "agent", label: "Agent", icon: IconCursor }, { id: "plan", label: "Plan", icon: IconBulb }];
const models = [{ id: "sonnet", name: "Sonnet", version: "4.6" }, { id: "opus", name: "Opus", version: "4.7" }];
<InputBar status="ready" onSend={handleSend} onStop={handleStop}
  leftActions={<><ModeSelector modes={modes} defaultValue="agent" /><ModelPicker models={models} defaultValue="sonnet" /></>} />
```
- **Para Flare:** **los selectores de proveedor y de agente CLI del Studio, tal cual.** `models` = los 13 proveedores (OpenAI, Anthropic, Gemini, Qwen, DeepSeek, Groq, Together, Mistral, OpenRouter, Fireworks, Ollama, LM Studio, Custom); `modes` = los 6 agentes CLI.

### 1.5 Suggestions ✅ OFICIAL
- **Qué hace:** chips de prompts rápidos para el empty state o inline.
- **Para Flare:** prompts de ejemplo en el Studio vacío ("Haz un comercial 9:16 para un colchón", "Sube el ritmo de cortes", "Añade CTA en los últimos 3 s").

### 1.6 BashTool ✅ OFICIAL
- **Qué hace:** tarjeta de tool call Bash: comando + stdout, colapsable.
- **Props:** recibe `part` (parte `tool-*` del UIMessage del AI SDK) vía `toolRenderers`.
- **Para Flare:** mostrar al agente ejecutando el renderer local (`flare render`), `ffmpeg`, `lint` o `score` — con su salida real.

### 1.7 EditTool ✅ OFICIAL
- **Qué hace:** tarjeta de diff. Soporta `input.old_string` / `input.new_string` o `output.structuredPatch`, más footer de aprobación vía `input.approval`.
- **Para Flare:** **clave para el principio agent-native**: cuando el agente edita `scenes.html` o el brief, muestra el diff y el usuario aprueba/rechaza antes de aplicar. La aprobación es un evento que el agente puede esperar.

### 1.8 SearchTool ✅ OFICIAL
- **Qué hace:** tarjeta de resultados de búsqueda agrupados. Acepta `results` o usa `output.results`.
- **Para Flare:** cuando el agente busca referencias, plugins o assets.

### 1.9 TodoTool ✅ OFICIAL
- **Qué hace:** lista de todos con diff (`input.todos` vs `output.oldTodos`).
- **Para Flare:** plan de trabajo del agente visible ("1. Analizar brief ✓ 2. Generar hook… 3. Renderizar") — el usuario ve el plan avanzar en vivo.

### 1.10 PlanTool ✅ OFICIAL
- **Qué hace:** título + resumen del plan con footer de aprobar/rechazar.
- **Para Flare:** el agente propone el plan del comercial (hook, escenas, CTA) y el usuario lo aprueba antes de ejecutar.

### 1.11 ThinkingTool ✅ OFICIAL
- **Qué hace:** fila de razonamiento colapsable.
- **Para Flare:** el "pensando…" del agente con su razonamiento visible (por qué eligió ese hook, ese ritmo).

### 1.12 QuestionTool ✅ OFICIAL
- **Qué hace:** pregunta clarificadora con respuestas de tipo single / multi / texto.
- **Para Flare:** el agente pregunta antes de decidir ("¿El comercial es 9:16 o 16:9?", "¿Con voz o solo visual?") sin bloquear el resto.

### 1.13 ToolGroup ✅ OFICIAL
- **Qué hace:** colapsa tool calls consecutivas en una sola fila.
- **Para Flare:** agrupar las llamadas del agente por escena o por fase.

### 1.14 SubagentTool ✅ OFICIAL
- **Qué hace:** tarjeta de sub-agente con sus herramientas anidadas.
- **Para Flare:** mostrar jueces, render workers o sub-agentes trabajando dentro del Studio.

### 1.15 McpTool ✅ OFICIAL
- **Qué hace:** salida genérica de herramienta MCP; usa `parseMcpToolType` de `@/components/agent-elements/tools/tool-registry` para obtener `mcpInfo`.
- **Para Flare:** herramientas externas del agente (p. ej. búsqueda de assets, plugins de Flare).

### 1.16 GenericTool ✅ OFICIAL
- **Qué hace:** fallback para tool calls desconocidas. Los `toolRenderers` personalizados reciben `{ part, chatStatus }` y pueden devolver cualquier UI.
- **Para Flare:** renderer fallback de cualquier acción nueva del agente.

### 1.17 TextShimmer ✅ OFICIAL
- **Qué hace:** etiqueta de estado con shimmer ("Analizando escenas…").
- **Para Flare:** estado textual del agente junto al personaje Rive.

### 1.18 SpiralLoader ✅ OFICIAL
- **Qué hace:** loader espiral Lottie para estados de carga de varios segundos.
- **Para Flare:** estado de render/export en curso.

### 1.19 21st.dev — Community Registry (catálogo general) 📋 CATÁLOGO
- **Qué es:** el marketplace/registry de 21st.dev con 1400+ componentes de comunidad (según su skill oficial), instalables por shadcn.
- **Instalación:** `npx shadcn@latest add "https://21st.dev/r/{username}/{component-slug}" -y`
- **Código directo (CDN, verificado en su skill):** `https://cdn.21st.dev/{username}/{component}/code.{timestamp}.tsx` y `https://cdn.21st.dev/{username}/{component}/registry.{timestamp}.json`
- **Para Flare:** fuente de componentes de chat, tarjetas, fondos y menús específicos; el diseñador debe buscar en https://21st.dev/community/components por categoría y tomar el slug exacto de la página del componente. **No hay API de búsqueda programática** (según su skill): la búsqueda es visual en el sitio.
- **Estado:** 📋 CATÁLOGO — el registry y el mecanismo están verificados; componentes individuales de comunidad deben verificarse uno por uno en su página.

---

## 2. Magic UI 📋 CATÁLOGO (registry oficial verificado, props por componente a confirmar en su página)

**Qué es:** 78 componentes animados (según catálogo del repo magicui, ~21k⭐, MIT) para landing pages, instalables por shadcn. Stack: React, TypeScript, Tailwind, Motion.

- **Sitio:** https://magicui.design/
- **Repo:** https://github.com/magicui/magicui
- **Instalación (patrón verificado):** `npx shadcn@latest add @magicui/<kebab-name>` — p. ej. `npx shadcn@latest add @magicui/marquee`, `@magicui/blur-fade`, `@magicui/bento-grid`.
- **Fuente:** catálogo completo del repo magicui (78 componentes, con dependencias) + skill `using-magic-ui` + catálogo `component-libs.md`. Las descripciones y dependencias de cada componente vienen de ese catálogo; **las props exactas deben leerse en magicui.design/docs/components/<slug> antes de usarlas.**

### 2.1 Marquee 📋 CATÁLOGO
- **Qué hace:** scroll infinito (horizontal/vertical) para texto, imágenes o vídeos. Sin dependencias (solo keyframes CSS).
- **Instalación:** `npx shadcn@latest add @magicui/marquee`
- **Para Flare:** cinta de prueba social / logos de proveedores y agentes CLI en la landing; cinta de escenas del comercial.

### 2.2 BentoGrid + BentoCard 📋 CATÁLOGO
- **Qué hace:** layout bento para mostrar features de producto de forma simple y elegante. Dep: `@radix-ui/react-icons`. Técnica verificada: `grid-cols-3 auto-rows-[22rem]`, cada `BentoCard` ocupa columnas según su className; en hover el icono/título sube y el CTA aparece desde abajo.
- **Instalación:** `npx shadcn@latest add @magicui/bento-grid`
- **Para Flare:** sección de features de la landing (retención, BYO agente, BYO key, render en web) y tarjetas del Studio.

### 2.3 ShimmerButton 📋 CATÁLOGO
- **Qué hace:** botón con luz que viaja por el perímetro (spark cónico con `spin-around` + `shimmer-slide`, unidades `cqw`/`cqh`). Sin dependencias de Motion.
- **Instalación:** `npx shadcn@latest add @magicui/shimmer-button`
- **Para Flare:** CTA principal ("Crear mi comercial", "Abrir Studio").

### 2.4 AnimatedGradientText 📋 CATÁLOGO
- **Qué hace:** fondo degradado animado que transiciona entre colores aplicado al texto. Sin dependencias.
- **Instalación:** `npx shadcn@latest add @magicui/animated-gradient-text`
- **Para Flare:** palabra clave del hero con el degradado Flare (ámbar → coral → violeta).

### 2.5 AnimatedShinyText 📋 CATÁLOGO
- **Qué hace:** brillo que atraviesa el texto como si brillara. Sin dependencias.
- **Instalación:** `npx shadcn@latest add @magicui/animated-shiny-text`
- **Para Flare:** badges ("Nuevo: render en web", "85/100 retención").

### 2.6 TextAnimate 📋 CATÁLOGO
- **Qué hace:** reveal de texto por stagger con 10 variantes. Dep: `motion`.
- **Instalación:** `npx shadcn@latest add @magicui/text-animate`
- **Para Flare:** titulares del hero y de cada sección de la landing.

### 2.7 BlurFade 📋 CATÁLOGO
- **Qué hace:** entrada de desenfoque a nítido; el workhorse de entradas escalonadas.
- **Instalación:** `npx shadcn@latest add @magicui/blur-fade`
- **Para Flare:** aparición escalonada de secciones, tarjetas y ventanas del Studio al montar.

### 2.8 Dock 📋 CATÁLOGO
- **Qué hace:** dock estilo macOS con magnificación por proximidad (React + Tailwind + Motion). Dep: `motion`.
- **Instalación:** `npx shadcn@latest add @magicui/dock`
- **Para Flare:** lanzador de herramientas del Studio (escenas, retención, exportar, agentes) o nav inferior de la landing.

### 2.9 AnimatedBeam 📋 CATÁLOGO
- **Qué hace:** haz de luz animado que viaja por un path SVG; ideal para mostrar integraciones. Dep: `motion`.
- **Instalación:** `npx shadcn@latest add @magicui/animated-beam`
- **Para Flare:** **visualizar el flujo del agente**: prompt → agente → escenas → render → vídeo. El haz puede animarse cuando el agente pasa de una fase a otra (control programático vía props de Motion).

### 2.10 BorderBeam 📋 CATÁLOGO
- **Qué hace:** punto de luz que recorre el borde de una tarjeta. Dep: `motion`.
- **Instalación:** `npx shadcn@latest add @magicui/border-beam`
- **Para Flare:** borde vivo de la ventana activa del Studio / de la escena que el agente está editando ahora mismo.

### 2.11 MagicCard 📋 CATÁLOGO
- **Qué hace:** spotlight que sigue al cursor e ilumina los bordes en hover. Dep: `motion`, `next-themes`.
- **Instalación:** `npx shadcn@latest add @magicui/magic-card`
- **Para Flare:** tarjetas de ejemplo (Descanso Total, Gestión Simple, Alex Rivera) con spotlight.

### 2.12 NumberTicker 📋 CATÁLOGO
- **Qué hace:** contador animado (count-up) para métricas. Dep: `motion`.
- **Instalación:** `npx shadcn@latest add @magicui/number-ticker`
- **Para Flare:** **el score de retención en vivo**: el número 0→100 anima cuando cambia el score; también métricas (escenas, segundos, CTR).

### 2.13 AnimatedCircularProgressBar 📋 CATÁLOGO
- **Qué hace:** gauge circular animado con porcentaje. Sin dependencias.
- **Instalación:** `npx shadcn@latest add @magicui/animated-circular-progress-bar`
- **Para Flare:** anillo de progreso del render/export y del score por criterio (hook, captions, cortes, CTA, safe).

### 2.14 AnimatedList 📋 CATÁLOGO
- **Qué hace:** lista que anima cada ítem en secuencia con delay. Dep: `motion`. Pensada para notificaciones/eventos en landing.
- **Instalación:** `npx shadcn@latest add @magicui/animated-list`
- **Para Flare:** **feed de actividad del agente** (cada acción aparece en secuencia: "Analizando brief…", "Hook generado", "Escena 3 editada").

### 2.15 Particles 📋 CATÁLOGO
- **Qué hace:** campo de partículas en canvas con parallax hacia el cursor. Sin dependencias.
- **Instalación:** `npx shadcn@latest add @magicui/particles`
- **Para Flare:** fondo del hero (una sola instancia, por rendimiento).

### 2.16 OrbitingCircles 📋 CATÁLOGO
- **Qué hace:** elementos orbitando un centro.
- **Instalación:** `npx shadcn@latest add @magicui/orbiting-circles`
- **Para Flare:** órbita de proveedores/agentes alrededor del logo de Flare en la landing.

### 2.17 NeonGradientCard + ShineBorder 📋 CATÁLOGO
- **Qué hacen:** tarjeta con borde neón brillante; borde con brillo rotatorio.
- **Instalación:** `npx shadcn@latest add @magicui/neon-gradient-card` / `@magicui/shine-border`
- **Para Flare:** tarjeta destacada (plan Pro / ejemplo destacado / CTA final).

### 2.18 MorphingText / WordRotate / TypingAnimation / HyperText 📋 CATÁLOGO
- **Qué hacen:** texto que morphéa entre palabras; rotación de palabras; efecto máquina de escribir; scramble-decode (hyper-text).
- **Instalación:** `npx shadcn@latest add @magicui/morphing-text` (y análogos `@magicui/word-rotate`, `@magicui/typing-animation`, `@magicui/hyper-text`)
- **Para Flare:** rotación de frases del hero ("comerciales / ads / presentaciones") y efecto de "el agente está escribiendo el guión".

### 2.19 Botones: PulsatingButton / RippleButton / InteractiveHoverButton / ShinyButton / RainbowButton 📋 CATÁLOGO
- **Qué hacen:** botón pulsante para captar atención; ripple al click; hover interactivo; brillo al hover; borde degradado arcoíris.
- **Instalación:** `npx shadcn@latest add @magicui/pulsating-button` (y análogos)
- **Para Flare:** CTAs secundarios y botón de exportar (pulsante mientras renderiza).

### 2.20 Otros del catálogo Magic UI (a explorar en su página) 📋 CATÁLOGO
`animated-grid-pattern`, `avatar-circles`, `confetti`, `cool-mode`, `dia-text-reveal`, `dot-pattern`, `flickering-grid`, `floating-3d-particles`, `globe` (dep: `cobe`, `motion` — globo 3D de puntos), `grid-pattern`, `hero-video-dialog`, `icon-cloud`, `interactive-grid-pattern`, `lens`, `meteors`, `retro-grid`, `ripple`, `safari` / `iphone-15-pro` / `android` (mockups de dispositivo para mostrar el comercial vertical), `scroll-progress`, `sparkles-text`, `spinning-text`, `terminal` (terminal animada — ideal para mostrar al agente ejecutando comandos), `text-reveal`, `video-text`, `animated-subscribe-button`, `code-comparison`, `script-copy-btn`, `pixel-image`, `highlighter`, `line-shadow-text`, `scroll-based-velocity`, `box-reveal`, `flip-text`, `comic-text`, `aurora-text`, `grid-beams`, `warp-background`, `light-rays`.

---

## 3. React Bits 📋 CATÁLOGO (catálogo oficial verificado, 172 componentes)

**Qué es:** 172 componentes animados open-source (repo DavidHDev/react-bits, ~38k⭐, MIT + Commons Clause), en 4 variantes cada uno (JS-CSS, JS-TW, TS-CSS, TS-TW).

- **Sitio:** https://reactbits.dev/ — **Registry:** https://reactbits.dev/r/registry.json — **LLMs:** https://reactbits.dev/llms.txt
- **Código por componente:** `https://reactbits.dev/r/<Component>-<LANG>-<STYLE>` (p. ej. `SplitText-TS-TW`).
- **Instalación (patrón verificado):** copiar el archivo del componente + `npm i <deps>` según la tabla (gsap, motion, three, ogl, etc.).
- **Fuente:** catálogo generado desde `reactbits.dev/llms.txt` + `registry.json` (172 componentes con deps, leído completo).

### 3.1 Texto (selección para Flare)
| Componente | Qué hace | Deps | Para Flare |
|---|---|---|---|
| **SplitText** | Divide el texto en caracteres/palabras para entrada escalonada | gsap, @gsap/react | Titulares del hero y de escenas |
| **BlurText** | Texto que empieza borroso y se resuelve nítido | motion | Reveal del hero |
| **GradientText** | Degradado animado sobre texto vivo, con velocidad y color configurables | motion | Titulares con degradado Flare |
| **ShinyText** | Brillo metálico que barre el texto | motion | Badges y scores |
| **DecryptedText** | Estilo hacker: glifos aleatorios que se resuelven en el texto real | motion | "El agente está descifrando el brief" |
| **RotatingText** | Cicla frases con transiciones 3D rotate/flip | motion | Rotación de frases del hero |
| **TextType** | Máquina de escribir con cursor parpadeante y cadencia ajustable | gsap | El agente "escribe" el guión en vivo |
| **CountUp** | Contador animado con formato y decimales | motion | Score de retención, métricas |
| **ScrollReveal** | Texto que se des-desenfoca al hacer scroll | gsap | Secciones de la landing |
| **ScrollVelocity** | Marquee cuya velocidad/distorsión escala con la velocidad de scroll | motion | Cinta reactiva al scroll |
| **VariableProximity** | El peso/ancho de las letras cambia con la distancia del puntero | motion | Titular interactivo del hero |
| **GlitchText** | Glitch RGB con jitter | — | Momentos de "error corregido" / estilo |
| **TrueFocus** | Blur/desenfoque dinámico sobre una serie de palabras en orden | motion | Foco guiado por el agente |
| **ScrambledText** | Distorsión según la posición del cursor | gsap | Texto interactivo |
| **ParticleText** | Texto que se ensambla desde partículas que se dispersan y se reforman a demanda | — | **Momento wow del hero: el logo/titular se forma desde partículas** |
| **SplitFlapText** | Tablero mecánico de solapas que cambia de frase | — | Cambios de estado del agente |
| **ASCIIText** | Texto con fondo ASCII animado | three | Estilo retro/terminal |
| **TextPressure** | Caracteres que escalan/deforman según la zona de presión del puntero | — | Titular que reacciona al mouse |

### 3.2 Animaciones / efectos de puntero
| Componente | Qué hace | Deps | Para Flare |
|---|---|---|---|
| **Magnet** | Elementos que se acercan magnéticamente al cursor y vuelven con spring | — | Botones y controles del Studio |
| **ClickSpark** | Explosión de partículas en el punto de click | — | Feedback al pulsar play/exportar |
| **BlobCursor** | Cursor blob orgánico con inercia y morph elástico | gsap | Cursor personalizado del Studio |
| **TargetCursor** | Cursor con 4 esquinas que se fijan a los objetivos | react-dom, gsap | Cursor de precisión sobre escenas |
| **GlareHover** | Brillo realista que se mueve al hover sobre cualquier elemento | — | Tarjetas de escenas |
| **ElectricBorder** | Borde eléctrico con arcos animados, glow e intensidad ajustable | — | Ventana activa del agente |
| **StarBorder** | Borde de estrellas/sparkles orbitando el contenido | — | Tarjeta destacada |
| **AnimatedContent** | Envuelve hijos y los anima al montar/scroll (dirección, distancia, duración, easing configurables) | gsap | Entradas del Studio |
| **FadeContent** | Fade/slide direccional con umbral | gsap | Entradas |
| **LogoLoop** | Marquee de logos con pausa en hover | — | Logos de proveedores/agentes |
| **PixelTransition** | Transición de disolución por píxeles al hover | gsap | Transición entre escenas |
| **ImageTrail** | Estela de imágenes que sigue al cursor | gsap | Galería de ejemplos |

### 3.3 Componentes UI
| Componente | Qué hace | Deps | Para Flare |
|---|---|---|---|
| **MagicBento** | Bento grid interactivo: tiles que expanden y animan | gsap | Features de la landing |
| **SpotlightCard** | Spotlight dinámico que sigue al cursor | — | Tarjetas de ejemplo |
| **Dock** | Dock macOS con escalado por proximidad | motion | Lanzador del Studio |
| **ScrollStack** | Stack de tarjetas que se revela al scroll con capas de profundidad | lenis | Showcase de ejemplos |
| **Stepper** | Indicador de progreso multi-paso con transiciones | motion | **Pasos del flujo del agente** (brief → escenas → render → export) |
| **CardSwap** | Tarjetas que intercambian posición con transiciones suaves | gsap | Comparar variantes de escenas |
| **Carousel** | Carrusel responsive con gestos táctiles y loop | motion, react-icons | Galería de ejemplos |
| **CircularGallery** | Galería circular en órbita | ogl | Galería de comerciales |
| **DomeGallery** | Galería 3D en domo hemisférico | @use-gesture/react | Showcase inmersivo |
| **AnimatedList** | Ítems que entran con stagger | motion | Feed de actividad del agente |
| **Counter** | Contador animado con incrementos + easing | motion | Score de retención |
| **ElasticSlider** | Slider con handle elástico | motion | Control de duración / ritmo de cortes |
| **GlassSurface** | Superficie de cristal estilo Apple con distorsión y luz en tiempo real | — | Ventanas flotantes del Studio (glass) |
| **FluidGlass** | Contenedor glassmorphism con refracción líquida animada | three, @react-three/fiber, @react-three/drei, maath | Ventanas flotantes premium |
| **TiltedCard** | Tilt 3D con perspectiva que reacciona al puntero | motion | Preview del comercial (tilt sutil) |
| **ProfileCard** | Tarjeta de perfil con glare y hover 3D | — | Tarjeta del creador / marca |
| **StaggeredMenu** | Menú con animación escalonada al abrir | gsap | Menú del Studio |
| **PillNav** | Nav tipo píldora con highlight deslizante | react-router-dom, gsap | Navegación landing/Studio |
| **ModelViewer** | Visor de modelos Three.js con orbit controls y presets de luz | @react-three/fiber, @react-three/drei, three | Visor 3D de producto (si el ejemplo lo pide) |
| **Masonry** | Masonry responsive con reflow animado | gsap | Grid de ejemplos |
| **Stack** | Stack de capas con swipe, autoplay y transiciones | motion | Carrusel de variantes |

### 3.4 Fondos (selección; el catálogo completo tiene 57)
| Componente | Qué hace | Deps | Para Flare |
|---|---|---|---|
| **Aurora** | Aurora fluida (shader OGL) | ogl | Fondo del hero |
| **Silk** | Ondas suaves con luz suave | @react-three/fiber, three | Fondo elegante del Studio |
| **Galaxy** | Starfield realista con parallax y puntero | ogl | Fondo espacial |
| **Hyperspeed** | Líneas que simulan viaje hiperespacial (al mantener click) | postprocessing, three | Transición "renderizando" |
| **LiquidEther** | Shader líquido interactivo con distorsión y colores configurables | three | Fondo líquido del hero |
| **LightRays** | Rayos de luz volumétricos con dirección configurable | ogl | Fondo del hero |
| **Particles** | Sistema de partículas configurable | ogl | Fondo del hero |
| **DotGrid / DotField** | Grid de puntos animado con interacción de cursor | gsap / — | Fondo sutil del Studio |
| **GridMotion** | Líneas de grid en perspectiva según el cursor | gsap | Fondo del Studio |
| **Plasma / PlasmaWave** | Plasma orgánico que gira y morphéa | ogl | Fondo de sección |
| **Beams** | Cintas animadas que se cruzan | three, @react-three/fiber, @react-three/drei | Fondo de sección |
| **Waves / Threads** | Líneas en onda / patrón de tela animado | — / ogl | Fondos de sección |

> Catálogo completo React Bits (172): texto 32, animaciones 38, componentes 45, fondos 57. Ver `https://reactbits.dev/r/registry.json` y el catálogo leído en esta cosecha.

---

## 4. Aceternity UI ✅ OFICIAL (página de recomendaciones de la propia librería)

**Qué es:** 200+ componentes copy-paste (114 gratuitos listados en su página de recomendaciones) con Tailwind CSS v4 + Motion. No es un paquete: se copia el código al proyecto.

- **Sitio:** https://ui.aceternity.com/components
- **Página de referencia leída:** https://ui.aceternity.com/ai-recommendations (lista completa con descripción, dependencias e install command por componente)
- **Stack:** React 18+ / Next.js 13+, Tailwind v4 (compatible v3), Motion (antes Framer Motion), TypeScript.
- **Instalación (patrón oficial):** `npx shadcn@latest add @aceternity/<component-name>`

### 4.1 Fondos y atmósfera
| Componente | Qué hace | Deps | Install | Para Flare |
|---|---|---|---|---|
| **BackgroundBeams** | Múltiples beams que siguen un path SVG; buen fondo de hero | motion | `@aceternity/background-beams` | Fondo del hero |
| **BackgroundBeamsWithCollision** | Beams que explotan/colisionan en el fondo | motion | `@aceternity/background-beams-with-collision` | Fondo del hero (momento de impacto) |
| **AuroraBackground** | Aurora / luces del sur sutil | — | `@aceternity/aurora-background` | Fondo de sección |
| **BackgroundGradientAnimation** | Degradado que cambia de posición con el tiempo | — | `@aceternity/background-gradient-animation` | Fondo de tarjetas/CTA |
| **BackgroundBoxes** | Contenedor de cajas que se iluminan en hover | mini-svg-data-uri, motion | `@aceternity/background-boxes` | Fondo interactivo |
| **Vortex** | Fondo vórtice ondulado, ideal para CTAs | simplex-noise, motion | `@aceternity/vortex` | Fondo del CTA final |
| **WavyBackground** | Ondas que se mueven | simplex-noise | `@aceternity/wavy-background` | Fondo de sección |
| **Spotlight** | Spotlight con Tailwind para llamar la atención sobre un elemento | — | `@aceternity/spotlight` | Foco sobre el CTA / preview |
| **Sparkles** | Sparkles configurables como fondo o standalone | @tsparticles/react, @tsparticles/engine, @tsparticles/slim, motion | `@aceternity/sparkles` | Sparkles sobre el score / hero |
| **Meteors** | Grupo de beams como meteoros en el fondo | — | `@aceternity/meteors` | Fondo de tarjetas |
| **GlowingStars / ShootingStars / StarsBackground** | Estrellas brillantes / fugaces / fondo de estrellas | motion | `@aceternity/glowing-stars` etc. | Fondo espacial |
| **CanvasRevealEffect** | Dot background que se expande en hover (estilo Clerk) | three, @react-three/fiber | `@aceternity/canvas-reveal-effect` | Reveal de features |
| **HeroHighlight** | Fondo con highlight de texto para hero | mini-svg-data-uri, motion | `@aceternity/hero-highlight` | Hero con highlight |

### 4.2 Texto
| Componente | Qué hace | Deps | Install | Para Flare |
|---|---|---|---|---|
| **TextGenerateEffect** | Texto que aparece palabra por palabra en fade al cargar | motion | `@aceternity/text-generate-effect` | **El agente "genera" el guión en vivo, palabra por palabra** |
| **TypewriterEffect** | Texto como si se tecleara | motion | `@aceternity/typewriter-effect` | El agente escribe el brief/guión |
| **FlipWords** | Cicla una lista de palabras con flip | motion | `@aceternity/flip-words` | Rotación de frases del hero |
| **TextRevealCard** | Mousemove que revela el texto de la tarjeta | motion | `@aceternity/text-reveal-card` | Reveal del hook del comercial |
| **TextHoverEffect** | Texto interactivo en hover | — | `@aceternity/text-hover-effect` | Titulares interactivos |
| **Cover** | Cover con sparkles | motion (+ sparkles) | `@aceternity/cover` | Titular destacado |

### 4.3 Tarjetas
| Componente | Qué hace | Deps | Install | Para Flare |
|---|---|---|---|---|
| **3DCard** | Tarjeta 3D con perspectiva al mover el mouse (el componente más icónico de la librería) | — | `@aceternity/3d-card` | **Preview del comercial en 3D** |
| **CardSpotlight** | Spotlight radial que sigue al cursor dentro de la tarjeta | motion (+ canvas-reveal-effect) | `@aceternity/card-spotlight` | Tarjetas de ejemplo |
| **CardHoverEffect** | Gradiente animado que entra desde la dirección del hover | motion | `@aceternity/card-hover-effect` | Grid de features |
| **EvervaultCard** | Hover que revela texto encriptado + gradiente | motion | `@aceternity/evervault-card` | Tarjeta "el agente está trabajando" |
| **WobbleCard** | Tarjeta que traslada y escala con el mousemove | motion | `@aceternity/wobble-card` | Feature cards |
| **GlareCard** | Glare en hover (estilo Linear) | — | `@aceternity/glare-card` | Tarjetas premium |
| **FocusCards** | Hover enfoca una tarjeta y difumina el resto | — | `@aceternity/focus-cards` | Galería de ejemplos |
| **BentoGrid** | Grid asimétrico con título, descripción y header | @tabler/icons-react | `@aceternity/bento-grid` | Features de la landing |
| **CardStack** | Tarjetas que se apilan cada cierto intervalo | motion | `@aceternity/card-stack` | Testimonios / variantes |
| **HoverBorderGradient** | Borde con gradiente que se expande al hover | motion | `@aceternity/hover-border-gradient` | Botones/tarjetas |
| **Compare** | Comparación entre dos imágenes (slide/drag) | @tabler/icons-react, motion | `@aceternity/compare` | **Antes/después del comercial (con/sin retención)** |

### 4.4 Layout, scroll y hero
| Componente | Qué hace | Deps | Install | Para Flare |
|---|---|---|---|---|
| **Timeline** | Timeline con header sticky y beam que sigue el scroll | — | `@aceternity/timeline` | **¡El timeline de escenas del Studio!** (sticky + beam de progreso) |
| **HeroParallax** | Scroll con rotación, traslación y opacidad | motion | `@aceternity/hero-parallax` | Hero con parallax de escenas |
| **ContainerScrollAnimation** | Animación que rota en 3D al hacer scroll (hero/marketing) | motion | `@aceternity/container-scroll-animation` | Hero: el Studio entra en 3D al scrollear |
| **MacbookScroll** | Al scrollear, la imagen sale de la pantalla (estilo Fey.com) | @tabler/icons-react, motion | `@aceternity/macbook-scroll` | Demo del Studio en mockup |
| **StickyScrollReveal** | Contenedor sticky; el texto se revela al scrollear | motion | `@aceternity/sticky-scroll-reveal` | Sección "cómo funciona" |
| **LayoutGrid** | Grid que anima el ítem al click (layout de Motion) | motion | `@aceternity/layout-grid` | Grid de ejemplos expandible |
| **ParallaxScroll** | Dos columnas que scrollean en direcciones opuestas | motion | `@aceternity/parallax-scroll` | Galería de ejemplos |
| **TracingBeam** | Beam que sigue un path SVG al scrollear; su longitud se ajusta a la velocidad | motion | `@aceternity/tracing-beam` | Progreso de lectura / del flujo |
| **Lamp** | Efecto lámpara | motion | `@aceternity/lamp` | Hero con foco de luz |
| **Globe** | Globo 3D interactivo | three, three-globe, @react-three/fiber@alpha, @react-three/drei | `@aceternity/globe` | Globo de alcance (si se usa) |

### 4.5 Navegación, modales y estados
| Componente | Qué hace | Deps | Install | Para Flare |
|---|---|---|---|---|
| **FloatingNavbar** | Navbar sticky que se oculta al bajar y aparece al subir | motion | `@aceternity/floating-navbar` | Nav de la landing |
| **FloatingDock** | Dock flotante estilo macOS como barra de navegación | @tabler/icons-react, motion | `@aceternity/floating-dock` | Lanzador del Studio |
| **AnimatedModal** | Modal compound personalizable con transiciones animadas | motion | `@aceternity/animated-modal` | Modal de exportar / de detalle de escena |
| **MultiStepLoader** | Loader por pasos para pantallas que tardan en cargar | @tabler/icons-react, motion | `@aceternity/multi-step-loader` | **Loader del render con pasos reales** (analizando → escenas → render → export) |
| **AnimatedTabs** | Tabs con animación de fondo al cambiar | @radix-ui/react-tabs | `@aceternity/tabs` | Tabs del Studio (Escenas / Retención / Agente) |
| **AnimatedTooltip** | Tooltip que sigue al puntero | motion | `@aceternity/animated-tooltip` | Tooltips del timeline |
| **FollowingPointer** | Puntero personalizado que sigue al mouse con contenido | motion | `@aceternity/following-pointer` | Puntero del agente |
| **Sidebar** | Sidebar expandible en hover, responsive | @tabler/icons-react, motion | `@aceternity/sidebar` | Panel lateral del Studio |
| **InfiniteMovingCards** | Grupo de tarjetas que se mueven infinitamente en loop | — | `@aceternity/infinite-moving-cards` | Testimonios / ejemplos |
| **AppleCardsCarousel** | Carrusel minimalista estilo apple.com | @tabler/icons-react, motion | `@aceternity/apple-cards-carousel` | Galería de ejemplos |
| **ImagesSlider** | Slider de imágenes navegable con teclado | motion | `@aceternity/images-slider` | Comparar frames |
| **PlaceholdersAndVanishInput** | Input con placeholders deslizantes y efecto vanish al enviar | motion | `@aceternity/placeholders-and-vanish-input` | **El prompt del agente** (placeholders que rotan, vanish al enviar) |
| **GooeyInput** | Input de búsqueda que se expande con filtro gooey | motion | `@aceternity/gooey-input` | Búsqueda de ejemplos |
| **FileUpload** | Form de subida con drag & drop y microinteracciones | @tabler/icons-react, react-dropzone, motion | `@aceternity/file-upload` | Subir brief/assets |
| **MovingBorder** | Borde que se mueve alrededor del contenedor | motion | `@aceternity/moving-border` | Botón destacado |
| **3DPin** | Pin con gradiente que anima en hover | motion | `@aceternity/3d-pin` | Links de producto |
| **LinkPreview** | Previews dinámicos de enlaces | @radix-ui/react-hover-card, qss, motion | `@aceternity/link-preview` | Previews de referencias |
| **DirectionAwareHover** | Hover que detecta la dirección de entrada | motion | `@aceternity/direction-aware-hover` | Tarjetas de escenas |
| **SVGMaskEffect** | Máscara que revela contenido al mover el cursor | motion | `@aceternity/svg-mask-effect` | Reveal del antes/después |
| **GoogleGeminiEffect** | Efecto de SVGs como el del sitio de Google Gemini | motion | `@aceternity/google-gemini-effect` | Footer / sección especial |

---

## 5. Motion Primitives ✅ OFICIAL (registry oficial verificado, 33 componentes)

**Qué es:** 33 primitivas animadas React + Tailwind + Motion (de ibelick/motion-primitives), copy-paste estilo shadcn. Cada componente es un solo `.tsx` autocontenido.

- **Sitio:** https://motion-primitives.com — **Docs por componente:** `https://motion-primitives.com/docs/<name>`
- **Repo:** https://github.com/ibelick/motion-primitives (MIT)
- **Registry (JSON con el fuente inline):** `https://raw.githubusercontent.com/ibelick/motion-primitives/main/public/c/<slug>.json`
- **Instalación:** `npx motion-primitives@latest add <slug>` o `npx shadcn@latest add "https://motion-primitives.com/r/<slug>"` (según docs; verificar en el sitio). Todos dependen de `motion` salvo los indicados.
- **Fuente:** catálogo del registry (33 componentes) + skill `motion-primitives` + referencia UIForge (props leídas del fuente).

### 5.1 Los imprescindibles para Flare (con props verificadas donde se indica)
| Componente | Qué hace / props clave | Deps extra | Para Flare |
|---|---|---|---|
| **MorphingDialog** | El diálogo MORPHÉA desde su elemento disparador hasta el modal completo (sin corte duro). Props: `transition` (por defecto ninguna — pasar spring/ease vía `MotionConfig`); trigger y contenido comparten `layoutId = dialog-${id}`, ambos deben montar. | — | **La ventana flotante del agente que se expande desde su icono hasta el panel completo. Firma visual del Studio.** |
| **MorphingPopover** | Popover que morphéa desde su disparador. | — | Popovers del timeline / selectores |
| **Dialog** | Modal con animaciones de entrada/salida. Props verificadas: `variants` (por defecto scale 0.9→1 + fade), `transition` (por defecto `{ ease: 'easeOut', duration: 0.2 }`), `open` / `defaultOpen` / `onOpenChange`. Backdrop blur incluido. | lucide-react (icono cerrar) | Modales del Studio (exportar, detalle) |
| **TextMorph** | Morphéa entre strings de texto. Props verificadas: `transition` (por defecto spring `{ stiffness: 280, damping: 18, mass: 0.3 }`), `variants`. Morph por carácter vía `layoutId` compartido. | — | **El estado del agente cambia en su sitio** (Pensando → Analizando → Editando → Renderizando) sin saltos |
| **TextLoop** | Cicla frases con animación. | — | Rotación de estados / frases del hero |
| **TextRoll** | Animación de rollo (para números o palabras cambiantes). | — | Score que cambia, contadores |
| **TextScramble** | Scramble antes de revelar el texto final. | — | Texto del agente "descifrando" |
| **TextShimmer / TextShimmerWave** | Shimmer / shimmer en onda sobre texto. | — | Estado del agente, badges |
| **TextEffect** | Efecto de texto genérico con variantes. | — | Titulares |
| **SpinningText** | Texto giratorio. | — | Badge circular alrededor del avatar del agente |
| **AnimatedNumber** | Anima cambios de número con transiciones suaves. | — | **Score de retención en vivo** |
| **SlidingNumber** | Desliza entre números al cambiar. | react-use-measure | Score por criterio |
| **AnimatedGroup** | Anima un grupo de hijos con stagger coordinado. Presets verificados: `fade`, `slide`, `scale`, `blur`, `blur-slide`, `zoom`, `flip`, `bounce`, `rotate`, `swing`. Stagger por defecto 0.1s. | — | Entrada escalonada de escenas/tarjetas |
| **InView** | Anima `hidden → visible` al entrar en viewport. Props: `variants`, `transition`, `viewOptions`, `once`. | — | Reveals al scroll |
| **TransitionPanel** | Transiciones suaves entre estados/paneles. | — | Cambiar entre pestañas del Studio sin cortes |
| **Accordion** | Contenido colapsable con animación suave. | — | Paneles del Studio (brief, escenas, retención) |
| **Disclosure** | Muestra/oculta contenido con transiciones. | — | Secciones colapsables |
| **AnimatedBackground** | Anima el fondo de un elemento en respuesta a interacción. | — | Highlight del tab/escena activa |
| **Tilt** | Tilt 3D según la posición del cursor. | — | Preview del comercial |
| **Magnetic** | El elemento se "pega" al cursor cuando está cerca. | — | Botones del Studio |
| **Dock** | Dock macOS con magnificación. | — | Lanzador del Studio |
| **Spotlight** | Spotlight que sigue al cursor. | — | Foco sobre la escena activa |
| **GlowEffect** | Efecto glow decorativo. | — | Resaltar el score / CTA |
| **BorderTrail** | Trail de borde animado al interactuar. | — | Borde de la ventana activa |
| **ScrollProgress** | Indicador de progreso de scroll animado. | — | Progreso de la landing / del render |
| **ToolbarDynamic** | Barra que anima su ANCHO (iconos → más ancha con p. ej. campo de búsqueda). | — | Toolbar del Studio que crece al buscar |
| **ToolbarExpandable** | Toolbar expandible que revela opciones extra. | react-use-measure | Toolbar del Studio |
| **Carousel** | Cicla elementos con transiciones suaves. | — | Galería de ejemplos |
| **InfiniteSlider** | Slider infinito. | — | Cinta de ejemplos |
| **Cursor** | Cursor personalizado animado. | — | Cursor del Studio |
| **ProgressiveBlur** | Blur progresivo sobre elementos. | — | Transiciones cinematográficas |
| **ImageComparison** | Comparación de imágenes (antes/después). | — | Antes/después del comercial |

---

## 6. Animate UI 📋 CATÁLOGO (registry oficial verificado, 580+ piezas)

**Qué es:** 580+ componentes, primitivas, efectos e iconos animados con Motion + shadcn/ui. Es el kit para que los elementos NORMALES de la app también tengan animación (tabs, botones, acordeones, tooltips, diálogos, menús).

- **Sitio:** https://animate-ui.com/
- **Instalación (patrón verificado):** `npx shadcn@latest add @animate-ui/<nombre>` — p. ej. `npx shadcn@latest add @animate-ui/components-animate-tabs`. Listar: `npx shadcn@latest add @animate-ui --list`. Instalar todo: `npx shadcn@latest add @animate-ui --all`.
- **Requisito:** proyecto Next.js + Tailwind + shadcn/ui.
- **Fuente:** skill `animate-ui` (catálogo con comandos de instalación por componente). Props exactas por componente: leer en animate-ui.com.

| Componente | Qué hace | Install | Para Flare |
|---|---|---|---|
| **Tabs (animate)** | Pestañas con capas de contenido superpuestas y animación | `@animate-ui/components-animate-tabs` | Tabs del Studio (Escenas / Retención / Agente) |
| **Tooltip (animate)** | Tooltip animado al hover | `@animate-ui/components-animate-tooltip` | Tooltips del timeline y del score |
| **Dialog (animate)** | Diálogo animado | `@animate-ui/components-animate-dialog` | Modales |
| **Accordion (animate)** | Acordeón animado | `@animate-ui/components-animate-accordion` | Paneles del Studio |
| **Cursor (animate)** | Cursor personalizado animado | `@animate-ui/components-animate-cursor` | Cursor del Studio |
| **Code (animate)** | Bloque de código que se anima como tecleado | `@animate-ui/components-animate-code` | Mostrar el `scenes.html` generándose |
| **CodeTabs** | Pestañas de código por lenguaje | `@animate-ui/components-animate-code-tabs` | Ver brief / escenas / storyboard |
| **AvatarGroup** | Grupo de avatares superpuestos animados | `@animate-ui/components-animate-avatar-group` | Agentes/proveedores activos |
| **Button** | Botón con estilos y animaciones variadas | `@animate-ui/buttons-button` | Botones del Studio |
| **Bubble (background)** | Burbujas animadas interactivas de fondo | `@animate-ui/backgrounds-bubble` | Fondo lúdico |
| **Fireworks (background)** | Fuegos artificiales animados de fondo | `@animate-ui/backgrounds-fireworks` | **Celebración al completar el render / al llegar a 100/100** |
| **Tabs (primitive)** | Pestañas con animación de contenido | `@animate-ui/primitives-animate-tabs` | Tabs base |
| **Tooltip (primitive)** | Tooltip con aparición/desaparición fluida | `@animate-ui/primitives-animate-tooltip` | Tooltips base |
| **Accordion (base)** | Paneles replegables | `@animate-ui/components-accordion` | Paneles base |

> El registry @animate-ui tiene 580+ piezas; la tabla trae las verificadas en el catálogo leído. El diseñador debe listar el registry (`--list`) y elegir el resto en su página.

---

## 7. Rive — el personaje del agente ✅ OFICIAL

**Qué es:** herramienta de animación vectorial en tiempo real con **máquinas de estados**. Un personaje puede reaccionar al estado de la app: pensando, escuchando, respondiendo, trabajando, esperando. Es la pieza que hace que el agente se SIENTA vivo en vez de parecer un chat con animaciones.

- **Sitio:** https://rive.app/ — **Repo React:** https://github.com/rive-app/rive-react — **Archivos de comunidad:** https://rive.app/community/files
- **Instalación (verificada):**
```bash
npm install @rive-app/react-canvas   # wrapper React (recomendado)
# o runtime agnóstico:
npm install @rive-app/canvas
# para efectos/blend avanzados:
npm install @rive-app/webgl2
```
- **Requisito:** el archivo `.riv` debe existir (se diseña en el editor de Rive en rive.app y se exporta). El diseñador necesita que alguien diseñe el personaje en el editor: sin `.riv` no hay Rive. **Si no hay .riv a tiempo, usar Lottie como fallback y dejar el slot Rive preparado.**
- **SSR:** no SSR — componente cliente + `ssr: false` en Next.js.
- **Fuentes leídas:** skill `rive-lottie-web-animation`, tutorial Codrops "Integrating Rive into a React Project", tutorial dev.to "Build a State-Aware AI Agent Mascot with Rive and React", skill `rive-animation` y `lottie-rive`.

### 7.1 useRive + RiveComponent (@rive-app/react-canvas) ✅ OFICIAL
- **Qué hace:** hook que carga y renderiza un `.riv` en canvas, con layout y autoplay.
- **Props/opciones verificadas:** `src` (ruta al .riv, local o CDN), `stateMachines` (nombre de la máquina de estados), `autoplay`, `layout: new Layout({ fit: Fit.Cover | Fit.Contain, alignment: Alignment.Center })`, `onLoad` (callback al estar listo), `enableRiveAssetCDN`.
- **Ejemplo mínimo (verificado, Codrops):**
```tsx
import { useRive, useStateMachineInput } from "@rive-app/react-canvas";
import { Layout, Fit, Alignment } from "@rive-app/react-canvas";
const { rive, RiveComponent } = useRive({
  src: "/animations/agent.riv",
  stateMachines: "AgentMachine",
  autoplay: true,
  layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
});
return <RiveComponent style={{ width: 240, height: 240 }} />;
```
- **Regla crítica:** el contenedor debe tener ancho Y alto explícitos (o aspect-ratio), si no el canvas mide 0x0.
- **Para Flare:** **el personaje del agente en el Studio** (esquina del panel del agente / ventana flotante).

### 7.2 useStateMachineInput — conducir al personaje desde el estado del agente ✅ OFICIAL
- **Qué hace:** conecta un input de la máquina de estados (Trigger / Boolean / Number) a una variable React. Cambiar el valor dispara transiciones en el personaje.
- **API verificada:**
```tsx
const statusInput = useStateMachineInput(rive, "AgentMachine", "StatusCode", 0);
// Cambiar estado desde React:
useEffect(() => { if (statusInput) statusInput.value = agentStatusCode; }, [agentStatusCode]);
// Boolean (hover / activo):
const hoverInput = useStateMachineInput(rive, "Main", "Hovered");
const onMouseEnter = () => hoverInput && (hoverInput.value = true);
// Trigger:
rive?.play("hover"); // o fireTrigger en runtime
```
- **Contrato de estados propuesto para Flare** (nombres a definir en el editor de Rive; los nombres DEBEN coincidir exactamente con los del .riv):
  | Estado del agente | StatusCode | Input sugerido |
  |---|---|---|
  | idle / esperando | 0 | — |
  | pensando | 1 | `StatusCode = 1` |
  | analizando | 2 | `StatusCode = 2` |
  | editando | 3 | `StatusCode = 3` |
  | renderizando | 4 | `StatusCode = 4` |
  | esperando aprobación | 5 | `StatusCode = 5` + Boolean `needsApproval` |
  | error | 6 | `StatusCode = 6` |
- **Eventos de vuelta:** Rive puede emitir Eventos (nombre + datos) hacia JS — p. ej. el personaje "termina de señalar" y la UI avanza. Escuchar con `rive.on(EventType.RiveEvent, ...)`.
- **Data Binding / View Models (Rive, GA abril 2025):** alternativa moderna a inputs sueltos — un View Model (p. ej. `AgentStatusVM`) con propiedades `status` (enum), `progress` (number), `hasPendingApproval` (boolean), `statusText` (string), `isConnected` (boolean), bindeadas a propiedades visuales. Para un producto que crece, preferir View Model; para el MVP, inputs de máquina de estados.
- **Para Flare:** **el corazón agent-native**: el personaje cambia de pose/expresión según lo que el agente hace de verdad, no con un GIF en loop.

---

## 8. Spline — 3D interactivo ✅ OFICIAL

**Qué es:** herramienta de diseño 3D en el navegador (como Figma pero 3D): escenas, materiales, animaciones, física, eventos. Se exporta a web y se controla por código.

- **Sitio:** https://spline.design/
- **Instalación (verificada, react-spline v4.2.0):** `npm install @splinetool/react-spline @splinetool/runtime`
- **Fuentes leídas:** npm.io / docs de `@splinetool/react-spline`, skill `spline-interactive`, skill `spline-3d-integration`.

### 8.1 Spline component (@splinetool/react-spline) ✅ OFICIAL
- **Qué hace:** renderiza una escena Spline (URL `https://prod.spline.design/<ID>/scene.splinecode`) en React.
- **Props verificadas:** `scene` (string, URL de la escena), `onLoad?` (`(spline: Application) => void`), `renderOnDemand?` (boolean, default `true`), `htmlContentMode?` (`'inline' | 'sandbox' | 'none'`), `className?`, `style?`, `id?`, `ref?`, `onSplineMouseDown?`, `onSplineMouseHover?`, `onSplineMouseUp?`, `onSplineKeyDown?`, `onSplineKeyUp?`, `onSplineStart?`, `onWheel?`.
- **Ejemplo mínimo (verificado):**
```tsx
import Spline from '@splinetool/react-spline';
export default function Hero() {
  return <div style={{ width: '100%', height: 600 }}>
    <Spline scene="https://prod.spline.design/YOUR-SCENE-ID/scene.splinecode" />
  </div>;
}
```
- **Para Flare:** escena 3D del hero (objeto de producto flotante / espacio futurista) o visor 3D del producto del comercial.

### 8.2 Runtime API — control programático de la escena ✅ OFICIAL
- **Métodos verificados (vía `onLoad`):** `findObjectByName(name)`, `findObjectById(uuid)`, `getAllObjects()`, `emitEvent(eventType, objectIdOrName)` (dispara eventos definidos en el editor: `mouseDown`, `mouseHover`, etc.), `emitEventReverse(...)`, `setVariable(name, value)` / variables, `setZoom`, control de cámara.
- **Ejemplo verificado:**
```tsx
function onLoad(splineApp) { spline.current = splineApp; }
function triggerAnimation() { spline.current.emitEvent('mouseHover', 'Cube'); }
const obj = spline.findObjectByName('Cube'); // leer/modificar posición, rotación, escala, material
```
- **Eventos de la escena hacia React:** `onSplineMouseDown/Hover/Up`, `onSplineKeyDown/Up`, `onSplineStart` — la escena avisa a React cuando el usuario interactúa con un objeto.
- **Variables en tiempo real:** la escena puede bindear variables a una API (GET/POST/PUT/PATCH/DELETE) configurada en el editor — la escena reacciona a datos sin código.
- **Para Flare:** **la escena 3D reacciona al agente**: cuando el agente pasa a "renderizando", la escena emite el evento y cambia de estado; cuando el score llega a 100, el objeto celebra. El agente opera la escena con `emitEvent`/`setVariable`.
- **Nota:** la escena debe diseñarse en spline.design y publicarse; sin escena no hay componente. Coste de rendimiento: una sola escena 3D por vista, lazy debajo del fold.

---

## 9. LottieFiles / Lottie ✅ OFICIAL

**Qué es:** animaciones exportadas de After Effects como JSON, miles listas en lottiefiles.com. Livianas, vectoriales, escalables. Para loaders, estados, iconos y micro-animaciones.

- **Sitio:** https://lottiefiles.com/
- **Paquete recomendado (verificado 2026):** `lottie-react` (v2.4.1+; ships con sus propios tipos TS). Legacy: `react-lottie` (v2.5.2, wrapper de lottie-web) — preferir `lottie-react`.
- **Instalación:** `npm install lottie-react`
- **Fuentes leídas:** guía DEV "Using Lottie Animations with TypeScript", docs npm.io de `lottie-react`/`react-lottie`, skill `lottie-rive`.

### 9.1 Lottie (lottie-react) ✅ OFICIAL
- **Props verificadas:** `animationData` (objeto JSON, requerido), `loop` (boolean | number, default true), `autoplay` (boolean, default true), `initialSegment` ([startFrame, endFrame]), `speed` (number, 1 = normal), `style`, `lottieRef` (ref a métodos imperativos), `onComplete`, `onLoopComplete`, `onEnterFrame`, `onSegmentStart`.
- **Métodos por ref (verificados):** `play()`, `stop()`, `pause()`, `playSegments([start, end], forceFlag)`, `setSpeed()`, `setDirection()`, `goToAndPlay()`, `goToAndStop()`.
- **Ejemplo mínimo (verificado):**
```tsx
import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import { useRef } from 'react';
import animData from './animations/success.json';
const lottieRef = useRef<LottieRefCurrentProps>(null);
<Lottie lottieRef={lottieRef} animationData={animData} loop={false} autoplay={false}
  onComplete={() => console.log('done')} />
// Segmentos por estado del agente:
lottieRef.current?.playSegments([0, 60], true);   // "pensando"
lottieRef.current?.playSegments([60, 120], true); // "renderizando"
```
- **Para Flare:** loader de render, icono de éxito al exportar (segmento por estado), micro-animaciones de estado del agente, animación de celebración al 100/100. **Segmentos = control programático por estado.**
- **Regla:** `animationData` es el objeto JSON parseado; una URL va en `path` (solo en react-lottie legacy), no en `animationData`.

### 9.2 dotLottie (formato .lottie + state machines) 📋 CATÁLOGO
- **Qué es:** formato dotLottie (`.lottie`) con soporte de state machines interactivas. Paquetes: `@lottiefiles/dotlottie-web` (agnóstico) / `dotlottie-react` (React).
- **Estado:** 📋 CATÁLOGO — mencionado en el skill `rive-lottie-web-animation` como la contraparte de Rive para animaciones con state machine; **no se leyó su documentación de props en esta cosecha**. Verificar en https://lottiefiles.com/ y en los docs de dotlottie antes de usar.
- **Para Flare:** alternativa a Rive si el personaje se diseña en LottieFiles con state machine.

---

## 10. Motores de animación ✅ OFICIAL

### 10.1 GSAP + @gsap/react (useGSAP) ✅ OFICIAL
- **Qué es:** GreenSock Animation Platform — el motor para secuencias complejas, timelines coreografiados y scroll. Donde Motion es declarativo, GSAP es imperativo y preciso.
- **Instalación (verificada):** `npm install gsap @gsap/react` (+ `lenis` para smooth scroll: `npm install lenis`).
- **Registro (verificado):** `gsap.registerPlugin(useGSAP, ScrollTrigger)` una vez, a nivel de módulo.
- **API verificada:**
```tsx
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(useGSAP, ScrollTrigger);
function ScrollSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    gsap.to('.element', { scrollTrigger: { trigger: '.section', scrub: 1 }, y: -100 });
  }, { scope: containerRef }); // scope = limpieza automática + selectores acotados
  const { contextSafe } = useGSAP({ scope: containerRef }); // para handlers fuera del hook
}
```
- **Capacidades:** `gsap.timeline()` (posición por parámetros: `"<"`, `"-=0.2"`), `ScrollTrigger` (pin, scrub, start/end), `gsap.matchMedia()` (respeta `prefers-reduced-motion`), `contextSafe` para animaciones creadas en click handlers, `gsap.context()` + `ctx.revert()` como fallback manual.
- **Regla SSR:** nunca correr GSAP en SSR; `useGSAP` lo maneja (en servidor cae a `useEffect`).
- **Para Flare:** **el timeline del comercial**: la coreografía de escenas (hook → dolor → producto → beneficio → resultado → CTA) como `gsap.timeline()` real con scrub; pinned sections de la landing; reveals de scroll; el preview del Studio animado por GSAP (como ya hace la versión vanilla actual).
- **Cuándo GSAP vs Motion (verificado):** GSAP para secuencias coreografiadas multi-elemento, pin/scrub y scroll complejo; Motion para animaciones ligadas al estado/props de un componente React (enter/exit, gestos, layout). No correr ambos sobre el mismo elemento.

### 10.2 Motion (motion.dev, paquete `motion`) ✅ OFICIAL
- **Qué es:** librería de animación declarativa para React (antes Framer Motion). Import: `motion/react`.
- **Instalación:** `npm install motion` (versión verificada en skills: 12.23.24; repo motiondivision/motion, 26k+⭐).
- **API verificada:**
```tsx
import { motion, AnimatePresence, useScroll, useTransform, useAnimate, useMotionValue } from "motion/react";
<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0 }} transition={{ duration: 0.5 }}
  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} whileFocus={{}} whileInView={{}}
  drag layout layoutId="shared-id" />
<AnimatePresence mode="wait">{isVisible && <motion.div key="modal" exit={{ opacity: 0 }} />}</AnimatePresence>
// Scroll:
const { scrollYProgress } = useScroll({ target: ref });
const y = useTransform(scrollYProgress, [0, 1], [0, -200]);
// Imperativo:
const [scope, animate] = useAnimate();
await animate(scope.current, { opacity: 1 }, { duration: 0.5 });
// Keyframes:
<motion.div animate={{ x: [0, 100, 100, 0, 0], rotate: [0, 90, 180, 270, 360] }} transition={{ duration: 2, repeat: Infinity }} />
```
- **Props clave:** `initial`, `animate`, `exit`, `transition` (duration, ease, spring `{ stiffness, damping, mass }`), `whileHover`, `whileTap`, `whileFocus`, `whileInView`, `drag` (con `dragConstraints`), `layout`, `layoutId` (shared-element), `variants`.
- **Hooks:** `useMotionValue`, `useTransform`, `useScroll`, `useAnimate`, `useInView`, `useSpring`, `useTime`.
- **Bundle:** `LazyMotion` + `useAnimate` mini (2.3 KB) para reducir peso.
- **Para Flare:** **el motor base de la UI React**: ventanas flotantes arrastrables (`drag`), morphing entre estados (`layoutId`), entradas/salidas (`AnimatePresence`), gestos, springs. Es la base sobre la que se montan Magic UI, Aceternity y Motion Primitives (todos dependen de `motion`).

### 10.3 Three.js en React — @react-three/fiber + @react-three/drei ✅ OFICIAL
- **Qué es:** Three.js como renderer de React: la escena 3D es JSX, con hooks y Suspense.
- **Instalación (verificada, jul 2026):** `npm install three @react-three/fiber @react-three/drei` + `npm install -D @types/three`. Versiones: three `^0.185`, fiber `^9.6` (v9 exige React 19), drei `^10.7`. Opcional: `@react-three/postprocessing` (Bloom, etc.), `@react-three/rapier` (física).
- **Setup canónico (verificado):**
```tsx
'use client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Float, Text, Html, Sparkles, Stage, ContactShadows } from '@react-three/drei';
<Canvas camera={{ position: [0, 0, 5], fov: 50 }} shadows>
  <ambientLight intensity={0.5} />
  <Float speed={2} rotationIntensity={0.5} floatIntensity={1}><mesh>...</mesh></Float>
  <OrbitControls enableDamping dampingFactor={0.05} />
  <Environment preset="city" />
</Canvas>
// SSR: importar el componente con next/dynamic + ssr: false.
```
- **Helpers drei verificados:** `OrbitControls` (enableDamping), `Environment` (presets: `city`, `studio`, `sunset`; o `files` HDR), `Float` (`speed`, `rotationIntensity`, `floatIntensity`), `Text` / `Text3D` (texto 3D), `Html` (DOM dentro de la escena, con `occlude`, `transform`), `Sparkles`, `Stage`, `ContactShadows`, `Center`, `Bounds`, `PresentationControls`, `Sky`, `Stars`, `Cloud`, `useGLTF` (+ `useGLTF.preload(url)`), `useTexture`, `ScrollControls` + `useScroll` (escena guiada por scroll), `PerformanceMonitor` / `AdaptiveDpr` (rendimiento adaptativo), `MeshDistortMaterial` / `MeshWobbleMaterial` / `MeshReflectorMaterial`, `GizmoHelper`.
- **Hooks:** `useFrame((state, delta) => ...)` (lógica por frame — **aquí el agente puede mover la cámara/objetos por código**), `useThree()` (acceso a cámara, escena, gl), `useLoader()`.
- **Para Flare:** escena 3D del hero (producto flotando con `Float` + `Environment` + `Sparkles`), texto 3D del logo, escena guiada por scroll (`ScrollControls`), y el fondo 3D reactivo al estado del agente vía `useFrame` (la cámara se acerca cuando el agente renderiza, etc.).

---

## 11. Top 10 recomendaciones para Flare (con el porqué)

1. **21st.dev Agent Elements (`AgentChat` + tool cards)** — es el único kit hecho para que un agente opere la interfaz: tool calls con renderers, diffs con aprobación, planes, todos, preguntas. Sin esto, Flare es "un chat bonito"; con esto, el agente trabaja de verdad en la UI. Prioridad máxima para el Studio.
2. **Rive (`useRive` + `useStateMachineInput`)** — el personaje del agente con estados reales (pensando/analizando/editando/renderizando). Es lo que hace que la interfaz se sienta viva y legible. Requiere diseñar el `.riv`; si no hay tiempo, Lottie con segmentos como fallback.
3. **Motion Primitives `MorphingDialog`** — la ventana flotante del agente que morphéa desde su icono hasta el panel completo. Es la firma de interacción del Studio y no existe en los otros kits.
4. **Aceternity `Timeline`** — el timeline de escenas con header sticky y beam de progreso por scroll. Es literalmente el timeline de Flare, ya construido.
5. **Aceternity `TextGenerateEffect` + `PlaceholdersAndVanishInput`** — el agente genera el guión palabra por palabra y el prompt del usuario con placeholders que rotan y vanish al enviar. Son los dos momentos "el agente está trabajando" más visibles.
6. **Magic UI `AnimatedBeam` + `AnimatedList` + `NumberTicker`** — el beam visualiza el flujo del agente entre fases; la lista animada es el feed de actividad; el ticker anima el score de retención en vivo. Juntos hacen el panel de actividad/retención.
7. **Motion Primitives `TextMorph`** — el estado del agente cambia en su sitio sin saltos (Pensando → Analizando → Editando → Renderizando). Micro-interacción que vende que hay un agente real detrás.
8. **Aceternity `MultiStepLoader`** — el loader del render con pasos reales (analizando → escenas → render → export) en vez de un spinner genérico.
9. **React Bits `SplitText` + `ParticleText` (o `BlurText`)** — el hero deja de ser genérico: el titular entra por caracteres y puede formarse desde partículas. Uno solo, con mesura.
10. **Magic UI `BentoGrid` + Aceternity `3DCard`** — la landing (bento de features) y el preview del comercial en 3D. La landing se estructura con bento; el producto se muestra en 3D.

**Reglas de combinación para el diseñador:**
- **Un solo motor de layout/movimiento por zona:** Motion para la UI React (gestos, layout, enter/exit); GSAP para el timeline del comercial y el scroll coreografiado. Nunca ambos sobre el mismo elemento.
- **Máximo 2 fondos pesados por página** (uno en hero, uno en una sección) y lazy debajo del fold. Los fondos WebGL (Three.js/OGL) son espectáculo, no decoración de cada sección.
- **Una sola armonía:** tokens Flare (fondo #0A0A0F, degradado ámbar #FFB020 → coral #FF5A3C → violeta #8B5CF6, Space Grotesk + Inter + JetBrains Mono solo código). Cada componente instalado se re-tiñe a estos tokens editando su archivo (el código ya es del proyecto).
- **Respetar `prefers-reduced-motion`** en todo lo animado.

---

## 12. Fuentes consultadas (2026-11-21)

- 21st.dev Agent Elements: README y SKILL.md oficiales (github.com/21st-dev/agent-elements) + https://agent-elements.21st.dev
- Magic UI: catálogo del repo magicui (78 componentes) + skills `using-magic-ui` + `component-libs.md` — https://magicui.design/
- React Bits: catálogo generado desde https://reactbits.dev/llms.txt + https://reactbits.dev/r/registry.json (172 componentes) — https://reactbits.dev/
- Aceternity UI: https://ui.aceternity.com/ai-recommendations (114 componentes gratuitos con install commands) — https://ui.aceternity.com/
- Motion Primitives: registry oficial (33 componentes) + skills `motion-primitives` — https://motion-primitives.com/ — https://github.com/ibelick/motion-primitives
- Animate UI: skill `animate-ui` (registry @animate-ui, 580+ piezas) — https://animate-ui.com/
- Rive: skill `rive-lottie-web-animation`, Codrops "Integrating Rive into a React Project", dev.to "Build a State-Aware AI Agent Mascot with Rive and React", skills `rive-animation` / `lottie-rive` — https://rive.app/ — https://github.com/rive-app/rive-react
- Spline: npm.io `@splinetool/react-spline` (v4.2.0) + skills `spline-interactive` / `spline-3d-integration` — https://spline.design/
- Lottie: guía DEV "Using Lottie Animations with TypeScript", npm.io `lottie-react` / `react-lottie` — https://lottiefiles.com/
- GSAP: skills `scroll-gsap-engine`, `gsap` + guía "GSAP ScrollTrigger + Lenis in Next.js" — https://gsap.com/docs/v3/ — https://gsap.com/resources/React/
- Motion: skills `motion` (gamai-skills, mishmash, agentskills) + api-reference motion.dev — https://motion.dev/
- Three.js/R3F: skills `react-three-fiber` (mattwoodco, tomevault, atlas-claude, iwantcoding) — https://threejs.org/

## 13. Notas de verificación y huecos

- **Props exactas:** las secciones marcadas 📋 CATÁLOGO tienen nombre, descripción, dependencias e install command verificados, pero las props exactas deben leerse en la página oficial de cada componente antes de usarlo. No se inventó ningún prop en este archivo.
- **dotLottie:** solo verificado a nivel de catálogo; confirmar docs antes de usar.
- **21st.dev community:** sin API de búsqueda; los componentes de comunidad se eligen navegando https://21st.dev/community/components.
- **Versiones:** las versiones citadas son las verificadas en las fuentes el 2026-11-21; el diseñador debe confirmar la última estable con `npm view <paquete> version` al instalar.
- **Rive/Spline:** ambos necesitan assets diseñados en sus editores (`.riv` / escena publicada). Sin esos assets, usar los fallbacks indicados (Lottie con segmentos / fondo R3F) y dejar el slot preparado.
- **Total cosechado:** 18 (Agent Elements) + ~20 Magic UI + ~40 React Bits + ~35 Aceternity + 33 Motion Primitives + 14 Animate UI + 2 Rive + 2 Spline + 2 Lottie + 3 motores = **~169 componentes/motores documentados**, con 40+ descritos en detalle con props, instalación y uso en Flare.
