# Flare — Proveedores de modelo (BYO key)

Flare no tiene servidor y no guarda tus credenciales. **Tú traes tu propio modelo y tu propia key.** El Studio de Flare es una web estática: la configuración del proveedor vive solo en tu navegador (`localStorage`) y solo la usa tu agente/CLI en tu máquina.

**Fuente de verdad de URLs y modelos: `web/app.js` (`PROVIDERS`).** Si este archivo y el Studio discrepan, manda el Studio. Las URLs de abajo son las de `web/app.js` (líneas 673-690), verificadas el 2026-11-21:

- **Gemini:** `https://generativelanguage.googleapis.com/v1beta/openai` — es el endpoint OpenAI-compatible oficial de Google (la raíz nativa `/v1beta` no sirve para un cliente OpenAI-compatible). Verificado en la documentación de compatibilidad OpenAI de Gemini.
- **Qwen:** `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` — es el endpoint internacional (Singapur) por defecto. Si tu cuenta es de la región de Pekín (China), usa `https://dashscope.aliyuncs.com/compatible-mode/v1` en su lugar.

## Proveedores soportados

| Proveedor | Base URL por defecto | Modelo por defecto | Otros modelos |
|---|---|---|---|
| OpenAI | `https://api.openai.com/v1` | `gpt-5` | `gpt-4o`, `gpt-4o-mini` |
| Anthropic | `https://api.anthropic.com/v1` | `claude-sonnet-4-5` | `claude-opus-4-1`, `claude-haiku-4-5` |
| Google Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-2.5-pro` | `gemini-2.5-flash` |
| Qwen (Alibaba) | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` | `qwen3-max` | `qwen3-coder-plus`, `qwen3-235b-a22b` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` | `deepseek-reasoner` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` | `openai/gpt-oss-120b` |
| Together | `https://api.together.xyz/v1` | `meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8` | — |
| Mistral | `https://api.mistral.ai/v1` | `mistral-large-latest` | `mistral-medium-latest` |
| OpenRouter | `https://openrouter.ai/api/v1` | `anthropic/claude-sonnet-4.5` | `openai/gpt-5` |
| Fireworks AI | `https://api.fireworks.ai/inference/v1` | `accounts/fireworks/models/llama-v3p3-70b-instruct` | — |
| Ollama (local) | `http://localhost:11434/v1` | `qwen3` | `llama3.2`, `gemma3` |
| LM Studio (local) | `http://localhost:1234/v1` | `local-model` | — |
| Custom (OpenAI-compatible) | (la que tú pongas) | (el que tú pongas) | — |

Notas:
- Todos los proveedores remotos necesitan key, salvo Ollama y LM Studio (locales, sin key: puede ir vacía; el modelo corre en tu máquina).
- Todos usan el formato OpenAI-compatible (`/chat/completions`), salvo **Anthropic**, cuya base URL es su API nativa (Messages API); el Studio la trata como proveedor nativo.
- Los nombres de modelo cambian con el tiempo: si el Studio rechaza un modelo, revisa la lista actual del proveedor y actualiza `web/app.js` (`PROVIDERS`) y esta tabla a la vez.

## Reglas de seguridad (no negociables)

1. **La key nunca sale del navegador.** Se guarda en `localStorage` bajo la clave `flare.provider.key` (la configuración del proveedor, sin key, va en `flare.provider.config`) y solo la lee el Studio en tu máquina para mostrarla en el brief que tú copias. Flare no hace llamadas a ningún servidor propio: no hay servidor al que enviarla.
2. **La key nunca va al repo.** Ni en `scenes.html`, ni en `brief.md`, ni en `meta.json`, ni en commits. Si tu agente la escribe en un archivo, bórralo y avisa.
3. **La key nunca va en URLs ni en logs.** No la pegues en un `?key=...` ni la imprimas en la consola.
4. **Local primero:** con Ollama o LM Studio no necesitas key ni internet: el modelo corre en tu máquina.
5. **Para borrarla:** en el Studio, proveedor → "Borrar key guardada". Eso elimina `flare.provider.key` de `localStorage`.

## Cómo se usa en el flujo

1. En Flare Studio eliges proveedor (o Custom con base URL + modelo + key).
2. El brief que genera "Generar con mi agente" incluye el proveedor y el modelo elegidos, para que tu agente (Claude Code, Codex, Cursor, Gemini CLI, OpenCode, Qwen Code o cualquier CLI con skills) sepa con qué modelo trabajar.
3. Tu agente usa **su propia** configuración de key en su CLI — Flare no le pasa la key guardada en el navegador. Si tu CLI ya tiene key, no necesitas ponerla en el Studio.

## Añadir un proveedor nuevo

Si tu proveedor expone un endpoint OpenAI-compatible (`/chat/completions`), usa **Custom**: base URL + nombre del modelo + tu key. No hace falta tocar código de Flare.
