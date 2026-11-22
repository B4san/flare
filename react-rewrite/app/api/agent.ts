// Flare — proxy del agente real (Vercel Serverless Function).
//
// El Studio es 100% frontend: no puede guardar una API key sin exponerla
// en el bundle. Este proxy guarda la key de Qwen Cloud SOLO en variables
// de entorno de Vercel (QWEN_API_KEY) y reenvía las peticiones del Studio
// al endpoint compatible con OpenAI. La key nunca sale del servidor y
// nunca se devuelve en ninguna respuesta.
//
// Variables de entorno:
//   QWEN_API_KEY   (requerida) key de Qwen Cloud.
//   QWEN_BASE_URL  (opcional) default: el endpoint de Qwen Cloud ap-southeast-1.
//   QWEN_MODEL     (opcional) default: qwen4-max.
//
// Límites: solo POST, body JSON ≤ 200 KB, ≤ 30 mensajes, max_tokens fijo
// en 2048, temperatura fija 0.3. El modelo lo elige el servidor (se ignora
// el que mande el cliente) para que el proxy no sirva de puerta a otros
// modelos más caros.

const DEFAULT_BASE_URL =
  'https://ap-southeast-1.maas.qwencloudapi.com/compatible-mode/v1';
const DEFAULT_MODEL = 'qwen4-max';
const MAX_BODY_BYTES = 200 * 1024;
const MAX_MESSAGES = 30;
const MAX_CONTENT_CHARS = 8000;
const MAX_TOOLS = 10;

interface ProxyRequest {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

interface ProxyResponse {
  status: (code: number) => ProxyResponse;
  json: (data: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

type ChatMessage = {
  role: string;
  content?: string;
  tool_calls?: unknown;
  tool_call_id?: string;
  name?: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeMessage(value: unknown): string {
  const text = typeof value === 'string' ? value : 'Error del proveedor.';
  return text.slice(0, 300);
}

export default async function handler(req: ProxyRequest, res: ProxyResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).json({ error: { code: 'method_not_allowed', message: 'Solo POST.' } });
    return;
  }

  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) {
    res.status(501).json({
      error: {
        code: 'agent_not_configured',
        message: 'El agente real no está configurado en el servidor (falta QWEN_API_KEY).',
      },
    });
    return;
  }

  let body: unknown = req.body;
  if (typeof body === 'string') {
    if (body.length > MAX_BODY_BYTES) {
      res.status(413).json({ error: { code: 'body_too_large', message: 'Body demasiado grande.' } });
      return;
    }
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({ error: { code: 'bad_json', message: 'Body JSON inválido.' } });
      return;
    }
  }
  if (!isObject(body)) {
    res.status(400).json({ error: { code: 'bad_body', message: 'Se esperaba un objeto JSON.' } });
    return;
  }

  const { messages, tools } = body;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    res.status(400).json({
      error: { code: 'bad_messages', message: `messages debe ser un array de 1 a ${MAX_MESSAGES} elementos.` },
    });
    return;
  }
  for (const m of messages) {
    if (!isObject(m) || typeof m.role !== 'string') {
      res.status(400).json({ error: { code: 'bad_message', message: 'Cada mensaje necesita role (string).' } });
      return;
    }
    if (typeof m.content === 'string' && m.content.length > MAX_CONTENT_CHARS) {
      res.status(400).json({ error: { code: 'content_too_long', message: 'Un mensaje supera el máximo permitido.' } });
      return;
    }
  }
  const cleanMessages: ChatMessage[] = messages.map((m) => {
    const obj = m as Record<string, unknown>;
    const out: ChatMessage = { role: obj.role as string };
    if (typeof obj.content === 'string') out.content = obj.content;
    if (obj.tool_calls !== undefined) out.tool_calls = obj.tool_calls;
    if (typeof obj.tool_call_id === 'string') out.tool_call_id = obj.tool_call_id;
    if (typeof obj.name === 'string') out.name = obj.name;
    return out;
  });

  let cleanTools: unknown = undefined;
  if (tools !== undefined) {
    if (!Array.isArray(tools) || tools.length > MAX_TOOLS) {
      res.status(400).json({
        error: { code: 'bad_tools', message: `tools debe ser un array de hasta ${MAX_TOOLS} elementos.` },
      });
      return;
    }
    cleanTools = tools;
  }

  const baseUrl = (process.env.QWEN_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
  const model = process.env.QWEN_MODEL || DEFAULT_MODEL;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);
  try {
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: cleanMessages,
        ...(cleanTools ? { tools: cleanTools } : {}),
        temperature: 0.3,
        max_tokens: 2048,
        stream: false,
      }),
      signal: controller.signal,
    });

    const data: unknown = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      const message = isObject(data) && isObject(data.error)
        ? sanitizeMessage(data.error.message)
        : `El proveedor respondió ${upstream.status}.`;
      res.status(upstream.status).json({ error: { code: 'provider_error', message } });
      return;
    }
    res.status(200).json(data);
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    res.status(aborted ? 504 : 502).json({
      error: {
        code: aborted ? 'provider_timeout' : 'provider_unreachable',
        message: aborted
          ? 'El modelo tardó demasiado en responder.'
          : 'No se pudo contactar con el proveedor del modelo.',
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}
