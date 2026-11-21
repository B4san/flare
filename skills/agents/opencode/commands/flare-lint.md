---
description: Valida una pieza Flare (contrato, duraciones, captions, CTA y retención)
argument-hint: <slug>
---

Valida la pieza Flare `$ARGUMENTS` siguiendo la skill canónica (`skills/SKILL.md`) y el checklist (`skills/retention-checklist.md`):

1. Corre `flare lint $ARGUMENTS` (o `node skills/examples-check.mjs` si el CLI no está instalado).
2. Muestra la salida completa y el score de retención con el desglose por regla.
3. Si algo falla, corrígelo; no prometas un render hasta que el lint esté en verde.
