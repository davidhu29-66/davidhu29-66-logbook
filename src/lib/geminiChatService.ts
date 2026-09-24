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
  source: 'server' | 'client-direct';
}

const LOCAL_KEY_STORAGE = 'gemini_client_api_key';

export function getClientGeminiKey(): string {
  if (typeof window === 'undefined') return '';
  const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
  const storedKey = localStorage.getItem(LOCAL_KEY_STORAGE) || '';
  return storedKey || envKey;
}

export function setClientGeminiKey(key: string): void {
  if (typeof window === 'undefined') return;
  if (key) {
    localStorage.setItem(LOCAL_KEY_STORAGE, key.trim());
  } else {
    localStorage.removeItem(LOCAL_KEY_STORAGE);
  }
}

export async function sendChatMessage(payload: ChatPayload): Promise<ChatResponse> {
  // 1. Try server endpoint first (/api/chat)
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        reply: data.reply || 'No reply from server.',
        modelUsed: data.modelUsed || 'gemini-3.8-flash',
        timestamp: data.timestamp || new Date().toISOString(),
        source: 'server',
      };
    }

    // If server responded with 404, we are on a static host (e.g. GitHub Pages or Vercel without serverless)
    if (res.status === 404) {
      console.warn('Backend /api/chat returned 404 (static host detected). Falling back to client-side Gemini if key available.');
      return await executeClientSideFallback(payload);
    }

    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Server returned ${res.status}: ${res.statusText}`);
  } catch (error: any) {
    if (error?.isStatic404) {
      throw error;
    }
    // If network failed (e.g., completely offline or static host with no /api route)
    if (error.message && (error.message.includes('404') || error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
      return await executeClientSideFallback(payload);
    }
    throw error;
  }
}

async function executeClientSideFallback(payload: ChatPayload): Promise<ChatResponse> {
  const clientKey = getClientGeminiKey();

  if (!clientKey) {
    const customErr: any = new Error(
      'STATIC_HOST_NO_KEY: Server returned 404 because this app is currently running on a static host (such as GitHub Pages or static Vercel) without a Node.js backend. To enable the AI Advisor on static hosting, provide a Gemini API Key.'
    );
    customErr.isStatic404 = true;
    throw customErr;
  }

  // Determine model based on task complexity
  let selectedModel = 'gemini-3.8-flash';
  if (payload.taskType === 'complex') {
    selectedModel = 'gemini-3.1-pro-preview';
  } else if (payload.taskType === 'fast') {
    selectedModel = 'gemini-3.1-flash-lite';
  }

  // System instruction
  let systemInstruction = '';
  if (payload.role === 'sars_advisor') {
    systemInstruction = `You are the SARS Vehicle Tax & Compliance Specialist for a South African field technician, engineer, or driver.
You possess deep knowledge of South African Revenue Service (SARS) travel allowance guidelines, Section 8(1) logbook requirements, deemed cost tables, business vs private travel distinctions, and audit-ready mileage tracking.
Always advise with precision:
- Daily private commute between home and normal place of work is strictly private under SARS rules.
- Travel from base or home directly to client sites, branches, suppliers, or meetings qualifies as business.
- An acceptable SARS logbook MUST have date, opening & closing odometer, actual KM, client/destination, and explicit business purpose.
${payload.contextData ? `User Fleet Context: ${JSON.stringify(payload.contextData)}` : ''}
Provide clear, actionable, professional guidance formatted neatly in markdown.`;
  } else if (payload.role === 'dispatch_assistant') {
    systemInstruction = `You are the Logbook Dispatch & Route Optimization Assistant.
You assist drivers and field technicians in South Africa with estimating distances, categorizing trips, and drafting logbook reasons.
${payload.contextData ? `User Fleet Context: ${JSON.stringify(payload.contextData)}` : ''}
Be concise, practical, and efficient.`;
  } else {
    systemInstruction = `You are the Timesheet & HR-018 Payroll Assistant.
You help calculate work hours on-site, travel hours, overtime, lunch break deductions, and rate billings.
${payload.contextData ? `User Context: ${JSON.stringify(payload.contextData)}` : ''}
Help the user accurately balance their weekly hours and explain any timesheet discrepancies.`;
  }

  const ai = new GoogleGenAI({
    apiKey: clientKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const contents = payload.messages.map((m) => ({
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
    modelUsed: `${selectedModel} (Client Direct)`,
    timestamp: new Date().toISOString(),
    source: 'client-direct',
  };
}
