import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString(),
    });
  });

  // Google Maps Grounded Route & Location Assistance
  // Uses gemini-3.8-flash with googleMaps tool
  app.post('/api/maps/lookup', async (req, res) => {
    try {
      const { origin, destination, query, userLocation } = req.body;

      if (!query && !destination && !origin) {
        return res.status(400).json({ error: 'Origin, destination, or query is required.' });
      }

      const promptText = query
        ? `Provide accurate location details, full address, key travel route information, and estimated driving distance from Google Maps for: ${query}. Be concise, practical for a field technician/driver logging business mileage.`
        : `Estimate the driving route, distance in kilometres, and travel details between origin "${origin || 'Home'}" and destination "${destination}". Provide verified location details from Google Maps for "${destination}". Format key info clearly for a vehicle travel logbook.`;

      const ai = getGenAI();

      const config: any = {
        tools: [{ googleMaps: {} }],
      };

      if (userLocation && typeof userLocation.latitude === 'number' && typeof userLocation.longitude === 'number') {
        config.toolConfig = {
          retrievalConfig: {
            latLng: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            },
          },
        };
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: promptText,
        config,
      });

      const text = response.text || '';
      const candidate = response.candidates?.[0];
      const groundingMetadata = candidate?.groundingMetadata;
      const groundingChunks = groundingMetadata?.groundingChunks || [];
      const webSearchQueries = groundingMetadata?.webSearchQueries || [];

      // Extract map links and place information
      const mapLinks: Array<{ title: string; uri: string }> = [];
      for (const chunk of groundingChunks as any[]) {
        if (chunk.maps?.uri) {
          mapLinks.push({
            title: chunk.maps.title || 'View on Google Maps',
            uri: chunk.maps.uri,
          });
        }
      }

      // Try to parse estimated distance from text if mentioned (e.g. "15 km", "45 km")
      let estimatedKm: number | null = null;
      const kmMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:km|kilometres|kilometers)/i);
      if (kmMatch) {
        estimatedKm = parseFloat(kmMatch[1]);
      }

      res.json({
        summary: text,
        estimatedKm,
        mapLinks,
        groundingChunks,
        webSearchQueries,
      });
    } catch (error: any) {
      console.error('Error calling Gemini Maps Grounding:', error);
      res.status(500).json({
        error: error.message || 'Failed to perform Maps lookup',
      });
    }
  });

  // Batch site route verification endpoint
  app.post('/api/maps/batch-verify', async (req, res) => {
    try {
      const { destinations } = req.body;
      if (!Array.isArray(destinations) || destinations.length === 0) {
        return res.status(400).json({ error: 'destinations array is required.' });
      }

      const sitesToVerify = destinations.slice(0, 5).join(', ');
      const ai = getGenAI();

      const promptText = `For these field service destinations in South Africa / Western Cape: ${sitesToVerify}.
Provide the verified location address, landmark details, and approximate driving distance/route context from Google Maps.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: promptText,
        config: {
          tools: [{ googleMaps: {} }],
        },
      });

      const text = response.text || '';
      const candidate = response.candidates?.[0];
      const groundingChunks = candidate?.groundingMetadata?.groundingChunks || [];

      const mapLinks: Array<{ title: string; uri: string }> = [];
      for (const chunk of groundingChunks as any[]) {
        if (chunk.maps?.uri) {
          mapLinks.push({
            title: chunk.maps.title || 'View on Google Maps',
            uri: chunk.maps.uri,
          });
        }
      }

      res.json({
        summary: text,
        mapLinks,
        groundingChunks,
      });
    } catch (error: any) {
      console.error('Error in batch verify:', error);
      res.status(500).json({ error: error.message || 'Failed to verify batch sites' });
    }
  });

  // Multi-turn Gemini Chatbot Endpoint
  // Supports:
  // - gemini-3.1-pro-preview (complex tasks: tax audit, deep analysis, SARS compliance)
  // - gemini-3.5-flash (general tasks: multi-turn advice, route explanations, trip drafting)
  // - gemini-3.1-flash-lite (fast tasks: quick calculations, fast summaries)
  app.post('/api/chat', async (req, res) => {
    try {
      const { messages, taskType = 'general', role = 'sars_advisor', contextData } = req.body;

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

      res.json({
        reply: replyText,
        modelUsed: selectedModel,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Error in /api/chat:', error);
      res.status(500).json({
        error: error.message || 'Failed to process chat request',
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Logbook Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
