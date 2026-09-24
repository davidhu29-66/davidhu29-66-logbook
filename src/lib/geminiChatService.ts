export interface ChatPayload {
  messages: Array<{ role: string; content: string }>;
  taskType?: 'fast' | 'general' | 'complex';
  role?: 'sars_advisor' | 'dispatch_assistant' | 'timesheet_assistant';
  contextData?: any;
}

export interface ChatResponse {
  reply: string;
  modelUsed: string;
  timestamp: string;
  source: 'server';
}

export async function sendChatMessage(payload: ChatPayload): Promise<ChatResponse> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const message = errData.error || `Server error (${res.status}): ${res.statusText}`;
    throw new Error(message);
  }

  const data = await res.json();
  return {
    reply: data.reply || 'No reply generated.',
    modelUsed: data.modelUsed || 'gemini-3.8-flash',
    timestamp: data.timestamp || new Date().toISOString(),
    source: 'server',
  };
}
