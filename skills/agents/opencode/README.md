# Flare para OpenCode

Copia esta carpeta a tu config de OpenCode o al repo (ver `skill/SKILL.md`).

Contenido:

- `opencode.json` — registra el plugin/skill `flare` (apunta a `skill/SKILL.md`).
- `skill/SKILL.md` — adaptador OpenCode de la skill canónica (`skills/SKILL.md`).
- `commands/flare-lint.md` — comando `/flare-lint <slug>`.
- `commands/flare-score.md` — comando `/flare-score <slug>`.
- `commands/flare-render.md` — comando `/flare-render <slug>` (solo si lint en verde).

Verificación: en una conversación nueva pregunta "¿Qué es Flare y cuál es su regla de oro?" Debe responder: estudio agent-native HTML/CSS/GSAP → video (WebM en el navegador, o MP4 local como opción avanzada), BYO agent/BYO key, y *nunca inventar duraciones ni prometer un render sin validar la timeline*.
