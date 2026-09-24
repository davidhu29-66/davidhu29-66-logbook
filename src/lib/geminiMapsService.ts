import { GoogleGenAI } from '@google/genai';

export interface MapLink {
  title: string;
  uri: string;
}

export interface MapsLookupResult {
  summary: string;
  estimatedKm: number | null;
  mapLinks: MapLink[];
  groundingChunks?: any[];
  webSearchQueries?: string[];
  isFallback?: boolean;
  source?: 'server' | 'client' | 'offline_estimate';
}

export interface MapsLookupParams {
  origin?: string;
  destination?: string;
  query?: string;
  userLocation?: { latitude: number; longitude: number } | null;
  baseAddress?: string;
}

function resolveAddress(addr: string | undefined, baseAddress?: string): string {
  if (!addr) return 'Home';
  const lowered = addr.trim().toLowerCase();
  if (baseAddress && baseAddress.trim() && (lowered === 'home' || lowered === 'office' || lowered === 'base' || lowered === 'depot' || lowered === 'work')) {
    return `${addr.trim()} (${baseAddress.trim()})`;
  }
  return addr.trim();
}

// Known Western Cape & South Africa reference landmarks for smart offline estimation
const REGIONAL_SITE_ESTIMATES: Record<string, { km: number; note: string }> = {
  uwc: { km: 28, note: 'University of the Western Cape, Bellville (via N2/Modderdam/Robert Sobukwe)' },
  sbsa: { km: 110, note: 'Standard Bank Branch (Caledon/Hermanus Overberg route via N2/Sir Lowry Pass)' },
  caledon: { km: 115, note: 'Caledon, Overberg (via N2 East)' },
  hermanus: { km: 125, note: 'Hermanus (via N2 and R43)' },
  sbm: { km: 140, note: 'Saldanha Bay Municipality / Langebaan (West Coast via R27)' },
  langebaan: { km: 135, note: 'Langebaan (via West Coast Road R27)' },
  artscape: { km: 18, note: 'Artscape Theatre Centre, Foreshore Cape Town (via N1/N2)' },
  'tru cape': { km: 55, note: 'Tru-Cape Fruit Marketing, Somerset West (via N2)' },
  eskom: { km: 220, note: 'Eskom Substation, Swellendam (via N2 East)' },
  unisa: { km: 22, note: 'UNISA Parow Campus, Jean Simonis St (via Voortrekker Rd)' },
  ccpoa: { km: 14, note: 'Century City Property Owners Association, 1 Park Lane (via N1/Bosmansdam)' },
  paarl: { km: 60, note: 'Paarl, Cape Winelands (via N1 North)' },
  stellenbosch: { km: 50, note: 'Stellenbosch (via N2/Baden Powell R310 or N1/R44)' },
  worcester: { km: 110, note: 'Worcester, Breede Valley (via N1 North through Huguenot Tunnel)' },
  bellville: { km: 25, note: 'Bellville CBD / Tygerberg (via N1)' },
  somerset: { km: 48, note: 'Somerset West / Helderberg (via N2)' },
};

function getClientKey(): string {
  if (typeof window === 'undefined') return '';
  return (
    localStorage.getItem('gemini_api_key') ||
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    ''
  );
}

export function saveClientKey(key: string): void {
  if (typeof window !== 'undefined') {
    if (key.trim()) {
      localStorage.setItem('gemini_api_key', key.trim());
    } else {
      localStorage.removeItem('gemini_api_key');
    }
  }
}

export function getStoredClientKey(): string {
  return getClientKey();
}

/**
 * Offline estimation fallback when API key is not configured or network call fails
 */
function createOfflineEstimate(params: MapsLookupParams): MapsLookupResult {
  const destLower = (params.destination || params.query || '').toLowerCase();
  const originName = params.origin || 'Base / Home';
  const destName = params.destination || params.query || 'Destination';

  let estimatedKm = 35; // Default sensible regional estimate
  let matchedNote = '';

  for (const [key, val] of Object.entries(REGIONAL_SITE_ESTIMATES)) {
    if (destLower.includes(key)) {
      estimatedKm = val.km;
      matchedNote = val.note;
      break;
    }
  }

  const mapSearchUri = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    params.destination || params.query || ''
  )}`;

  const summary = `📍 **Offline Route Estimate (${originName} → ${destName})**\n\n` +
    `• **Estimated One-Way Distance:** ~${estimatedKm} km\n` +
    `• **Round Trip Total:** ~${estimatedKm * 2} km\n` +
    (matchedNote ? `• **Route Details:** ${matchedNote}\n` : '') +
    `• **SARS Section 8(1) Purpose Note:** Business client site attendance at ${destName}.\n\n` +
    `ℹ️ *Note: This estimate was calculated using regional offline routing. To enable live Google Maps Grounding with turn-by-turn distance and place ID verification, add your Google Gemini API key in Settings.*`;

  return {
    summary,
    estimatedKm,
    mapLinks: [
      {
        title: `Search "${destName}" on Google Maps`,
        uri: mapSearchUri,
      },
    ],
    isFallback: true,
    source: 'offline_estimate',
  };
}

/**
 * Direct client-side execution using Google GenAI SDK
 */
async function callDirectClientMaps(
  params: MapsLookupParams,
  apiKey: string
): Promise<MapsLookupResult> {
  const { origin, destination, query, userLocation, baseAddress } = params;

  const resolvedOrigin = resolveAddress(origin, baseAddress);
  const resolvedDestination = resolveAddress(destination, baseAddress);

  const promptText = query
    ? `Provide accurate location details, full address, key travel route information, and estimated driving distance from Google Maps for: ${query}. Be concise, practical for a field technician/driver logging business mileage. At the very end, output the single exact distance value in this exact format: [Distance: X.Y km]`
    : `Estimate the driving route, distance in kilometres, and travel details between origin "${resolvedOrigin}" and destination "${resolvedDestination}". Provide verified location details from Google Maps for "${resolvedDestination}". Format key info clearly for a vehicle travel logbook. At the very end, output the single exact total driving distance value in this exact format: [Distance: X.Y km]`;

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

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

  const mapLinks: MapLink[] = [];
  for (const chunk of groundingChunks as any[]) {
    if (chunk.maps?.uri) {
      mapLinks.push({
        title: chunk.maps.title || 'View on Google Maps',
        uri: chunk.maps.uri,
      });
    }
  }

  let estimatedKm: number | null = null;
  // Try pattern distance tag first
  const distanceMatch = text.match(/\[Distance:\s*(\d+(?:\.\d+)?)\s*km\]/i);
  if (distanceMatch) {
    estimatedKm = parseFloat(distanceMatch[1]);
  } else {
    // fallback
    const kmMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:km|kilometres|kilometers)/i);
    if (kmMatch) {
      estimatedKm = parseFloat(kmMatch[1]);
    }
  }

  return {
    summary: text,
    estimatedKm,
    mapLinks,
    groundingChunks,
    webSearchQueries,
    source: 'client',
  };
}

/**
 * Main lookup function: attempts server proxy -> client SDK -> offline estimate
 */
export async function lookupMapsRoute(params: MapsLookupParams): Promise<MapsLookupResult> {
  const clientKey = getClientKey();

  // Step 1: Try server route first
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (clientKey) {
      headers['x-gemini-api-key'] = clientKey;
      headers['Authorization'] = `Bearer ${clientKey}`;
    }

    const response = await fetch('/api/maps/lookup', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        ...data,
        source: 'server',
      };
    }

    const errData = await response.json().catch(() => ({}));
    const errMessage = errData.error || `Server responded with status ${response.status}`;

    // If server failed due to missing API key or 404 (static deployment)
    if (
      response.status === 401 ||
      response.status === 403 ||
      response.status === 404 ||
      errMessage.includes('unregistered callers') ||
      errMessage.includes('API key') ||
      errMessage.includes('PERMISSION_DENIED')
    ) {
      // Step 2: Fall back to client direct call if key is available in browser
      if (clientKey) {
        try {
          return await callDirectClientMaps(params, clientKey);
        } catch (clientErr: any) {
          console.warn('Client direct Maps Grounding failed:', clientErr);
        }
      }

      // Step 3: Provide offline estimation so the user is never blocked
      return createOfflineEstimate(params);
    }

    throw new Error(errMessage);
  } catch (netErr: any) {
    console.warn('Fetch /api/maps/lookup error, attempting client/offline fallback:', netErr);

    // If client key is available, attempt direct GenAI SDK call
    if (clientKey) {
      try {
        return await callDirectClientMaps(params, clientKey);
      } catch (directErr) {
        console.warn('Direct client call failed, using offline fallback:', directErr);
      }
    }

    // Otherwise return robust offline calculation
    return createOfflineEstimate(params);
  }
}
