// Flare — mensajes sintéticos para AgentChat (21st.dev Agent Elements).
//
// El Studio no tiene backend: la simulación del agente alimenta AgentChat
// con UIMessage construidos aquí (texto + tool parts con las formas que
// leen los tool renderers vendored: TodoWrite {todos:[{content,status}]},
// Edit {input.old_string/new_string, output.old_content/content},
// Thinking/Bash {output}). Sin useChat ni servidor: messages + status son
// props, así que la conversación es 100% local.

import type { UIMessage } from 'ai';

let seq = 0;
function uid(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

export type TodoStatus = 'pending' | 'in_progress' | 'completed';

export interface TodoItem {
  content: string;
  status: TodoStatus;
}

function asMessage(obj: unknown): UIMessage {
  return obj as unknown as UIMessage;
}

export function userTextMessage(text: string): UIMessage {
  return asMessage({ id: uid('u'), role: 'user', parts: [{ type: 'text', text }] });
}

export function assistantTextMessage(text: string): UIMessage {
  return asMessage({ id: uid('a'), role: 'assistant', parts: [{ type: 'text', text }] });
}

export function thinkingMessage(text: string): UIMessage {
  return asMessage({
    id: uid('t'),
    role: 'assistant',
    parts: [
      {
        type: 'tool-Thinking',
        toolCallId: uid('tc'),
        state: 'output-available',
        input: {},
        output: text,
      },
    ],
  });
}

export function todoMessage(todos: TodoItem[]): UIMessage {
  return asMessage({
    id: uid('td'),
    role: 'assistant',
    parts: [
      {
        type: 'tool-TodoWrite',
        toolCallId: uid('tc'),
        state: 'output-available',
        input: { todos },
        output: { oldTodos: [], newTodos: todos },
      },
    ],
  });
}

export function editMessage(
  filePath: string,
  oldString: string,
  newString: string,
): UIMessage {
  return asMessage({
    id: uid('e'),
    role: 'assistant',
    parts: [
      {
        type: 'tool-Edit',
        toolCallId: uid('tc'),
        state: 'output-available',
        input: { file_path: filePath, old_string: oldString, new_string: newString },
        output: { old_content: oldString, content: newString },
      },
    ],
  });
}

export function bashMessage(command: string, output: string): UIMessage {
  return asMessage({
    id: uid('b'),
    role: 'assistant',
    parts: [
      {
        type: 'tool-Bash',
        toolCallId: uid('tc'),
        state: 'output-available',
        input: { command },
        output,
      },
    ],
  });
}
