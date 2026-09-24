import { GoogleGenAI } from '@google/genai';

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
  source: 'server' | 'client_static_fallback';
}

export async function sendChatMessage(payload: ChatPayload): Promise<ChatResponse> {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        reply: data.reply || 'No reply generated.',
        modelUsed: data.modelUsed || 'gemini-3.8-flash',
        timestamp: data.timestamp || new Date().toISOString(),
        source: 'server',
      };
    }

    // If 404 (e.g. running on static GitHub Pages host without serverless functions)
    if (res.status === 404) {
      const clientKey =
        localStorage.getItem('gemini_api_key') ||
        (import.meta as any).env?.VITE_GEMINI_API_KEY ||
        '';

      if (clientKey) {
        return await executeClientDirectChat(payload, clientKey);
      }

      throw new Error(
        'Backend endpoint /api/chat returned 404 Not Found. This happens on static web hosts like GitHub Pages that do not support Node/serverless APIs. Deploy to Vercel or run the full-stack app with Node to use server-side Gemini.'
      );
    }

    const errData = await res.json().catch(() => ({}));
    const message = errData.error || `Server error (${res.status}): ${res.statusText}`;
    throw new Error(message);
  } catch (err: any) {
    // Check if network error and client key is available
    const clientKey =
      localStorage.getItem('gemini_api_key') ||
      (import.meta as any).env?.VITE_GEMINI_API_KEY ||
      '';

    if (clientKey && (err.message.includes('404') || err.message.includes('Failed to fetch'))) {
      return await executeClientDirectChat(payload, clientKey);
    }

    throw err;
  }
}

async function executeClientDirectChat(payload: ChatPayload, apiKey: string): Promise<ChatResponse> {
  const { messages, taskType = 'general', role = 'sars_advisor', contextData } = payload;

  let selectedModel = 'gemini-3.8-flash';
  if (taskType === 'complex') {
    selectedModel = 'gemini-3.1-pro-preview';
  } else if (taskType === 'fast') {
    selectedModel = 'gemini-3.1-flash-lite';
  }

  let systemInstruction = '';
  if (role === 'sars_advisor') {
    systemInstruction = `You are the SARS Vehicle Tax & Compliance Specialist for a South African field technician, engineer, or driver.
You possess deep knowledge of South African Revenue Service (SARS) travel allowance guidelines, Section 8(1) logbook requirements, deemed cost tables, business vs private travel distinctions, and audit-ready mileage tracking.
Always advise with precision:
- Daily private commute between home and normal place of work is strictly private under SARS rules.
- Travel from base or home directly to client sites, branches, suppliers, or meetings qualifies as business.
- An acceptable SARS logbook MUST have date, opening & closing odometer, actual KM, client/destination, and explicit business purpose.
${contextData ? `User Fleet Context: ${JSON.stringify(contextData)}` : ''}
Provide clear, actionable, professional guidance formatted neatly in markdown.`;
  } else if (role === 'dispatch_assistant') {
    systemInstruction = `You are the Logbook Dispatch & Route Optimization Assistant.
You assist drivers and field technicians in South Africa with estimating distances, categorizing trips, and generating concise logbook notes.
${contextData ? `User Fleet Context: ${JSON.stringify(contextData)}` : ''}`;
  } else {
    systemInstruction = `You are the Timesheet & HR-018 Payroll Assistant.
Help calculate work hours on-site, travel hours, overtime, and lunch deductions.
${contextData ? `User Context: ${JSON.stringify(contextData)}` : ''}`;
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const contents = messages.map((m) => ({
    role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const response = await ai.models.generateContent({
    model: selectedModel,
    contents,
    config: {
      systemInstruction,
      temperature: 0.7,
    },
  });

  return {
    reply: response.text || 'I could not generate a response. Please try again.',
    modelUsed: selectedModel,
    timestamp: new Date().toISOString(),
    source: 'client_static_fallback',
  };
}
