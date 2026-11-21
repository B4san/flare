// Flare — AgentPanel: el chat del agente (AgentChat real de 21st.dev).
//
// AgentChat es el componente Agent Elements del catálogo (top 10, #1):
// MessageList + InputBar + tool renderers (Thinking, TodoWrite, Edit, Bash)
// + Suggestions. Lo alimentamos con mensajes sintéticos locales (la
// simulación del Studio) o con lo que el usuario escribe; no hay backend,
// no hay useChat, no hay keys en juego.

import type { ChatStatus, UIMessage } from 'ai';
import { AgentChat } from '../vendor/agent-elements/components/agent-chat';
import type { SuggestionItem } from '../vendor/agent-elements/components/input/suggestions';

interface AgentPanelProps {
  messages: UIMessage[];
  status: ChatStatus;
  onSend: (message: { role: 'user'; content: string }) => void;
  onStop: () => void;
  suggestions: SuggestionItem[];
}

export function AgentPanel({ messages, status, onSend, onStop, suggestions }: AgentPanelProps) {
  return (
    <AgentChat
      messages={messages}
      status={status}
      onSend={onSend}
      onStop={onStop}
      suggestions={suggestions}
      initialScrollBehavior="bottom"
      className="h-full"
    />
  );
}
