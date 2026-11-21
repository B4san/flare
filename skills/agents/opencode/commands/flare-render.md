---
description: Renderiza una pieza Flare a MP4 local (opción avanzada; solo si el lint está en verde)
argument-hint: <slug>
---

Renderiza `$ARGUMENTS` a MP4 local con `flare render` (la opción avanzada: el render principal de Flare es WebM en el navegador, botón "Exportar video (WebM)" en Flare Studio):

1. Primero corre `flare lint $ARGUMENTS`. Si falla, NO renderices: corrige y vuelve a validar.
2. Solo con lint en verde, corre `flare render $ARGUMENTS`.
3. Nunca prometas el MP4 antes de validar la timeline (regla de oro de la skill canónica).
