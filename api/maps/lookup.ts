import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || '';
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export default async function handler(req: any, res: any) {
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
    const { origin, destination, query, userLocation } = body;

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

    const mapLinks: Array<{ title: string; uri: string }> = [];
    for (const chunk of groundingChunks as any[]) {
      if (chunk.maps?.uri) {
        mapLinks.push({
          title: chunk.maps.title || 'View on Google Maps',
          uri: chunk.maps.uri,
        });
      }
    }

    let estimatedKm: number | null = null;
    const kmMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:km|kilometres|kilometers)/i);
    if (kmMatch) {
      estimatedKm = parseFloat(kmMatch[1]);
    }

    return res.status(200).json({
      summary: text,
      estimatedKm,
      mapLinks,
      groundingChunks,
      webSearchQueries,
    });
  } catch (error: any) {
    console.error('Error in Vercel /api/maps/lookup:', error);
    return res.status(500).json({
      error: error.message || 'Failed to perform Maps lookup',
    });
  }
}
