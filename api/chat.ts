import { GoogleGenAI } from '@google/genai';

function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || '';
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export default async function handler(req: any, res: any) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { messages, taskType = 'general', role = 'sars_advisor', contextData } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    // Determine model based on task complexity
    let selectedModel = 'gemini-3.8-flash';
    if (taskType === 'complex') {
      selectedModel = 'gemini-3.1-pro-preview';
    } else if (taskType === 'fast') {
      selectedModel = 'gemini-3.1-flash-lite';
    }

    // Define role-specific system instructions
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
You assist drivers and field technicians in South Africa (especially Western Cape, Cape Town, Stellenbosch, Bellville, Paarl, and surrounding regions) with:
- Estimating driving distance in KM between locations.
- Categorizing trips between Chargeable, Admin, and Private.
- Splitting multi-destination trips across different job numbers.
- Generating clear, concise logbook notes and reason descriptions.
${contextData ? `User Fleet Context: ${JSON.stringify(contextData)}` : ''}
Be concise, practical, and efficient.`;
    } else {
      systemInstruction = `You are the Timesheet & HR-018 Payroll Assistant.
You help calculate work hours on-site, travel hours, overtime, lunch break deductions, and rate billings according to standard HR-018 timesheet formats.
${contextData ? `User Context: ${JSON.stringify(contextData)}` : ''}
Help the user accurately balance their weekly hours and explain any timesheet discrepancies.`;
    }

    const ai = getGenAI();

    // Format messages into Google Gen AI contents array
    const contents = messages.map((m: { role: string; content: string }) => ({
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

    const replyText = response.text || 'I could not generate a response. Please try again.';

    return res.status(200).json({
      reply: replyText,
      modelUsed: selectedModel,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in Vercel /api/chat:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process chat request',
    });
  }
}
