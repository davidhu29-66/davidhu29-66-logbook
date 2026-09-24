import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, ExternalLink, Search, Compass, Car, Sparkles, CheckCircle2, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import { UserSettings, Trip } from '../types';

interface MapsGroundingViewProps {
  settings: UserSettings;
  onLogTripWithRoute: (routeData: { origin: string; destination: string; distanceKm: number; notes: string }) => void;
}

interface MapLink {
  title: string;
  uri: string;
}

const COMMON_SITES = [
  { name: 'UWC Main Campus', client: 'UWC', query: 'University of the Western Cape Robert Sobukwe Rd Bellville Cape Town' },
  { name: 'SBSA Caledon Branch', client: 'SBSA', query: 'Standard Bank 17 Plein St Caledon Western Cape' },
  { name: 'SBSA Hermanus Branch', client: 'SBSA', query: 'Standard Bank Main Rd Hermanus Western Cape' },
  { name: 'SBM-LBN Depot', client: 'SBM', query: 'Saldanha Bay Municipality Depot Langebaan Western Cape' },
  { name: 'Artscape Theatre Centre', client: 'Artscape', query: 'Artscape Theatre Centre D.F. Malan St Foreshore Cape Town' },
  { name: 'Tru Cape Fruit Marketing', client: 'Tru Cape', query: 'Tru-Cape Fruit Marketing De Witt St Somerset West Western Cape' },
  { name: 'Swellendam Eskom Substation', client: 'Eskom', query: 'Eskom Substation Swellendam Western Cape' },
  { name: 'UNISA Cape Town Campus', client: 'Unisa', query: 'UNISA 15 Jean Simonis St Parow Cape Town' },
  { name: 'Century City CCPOA', client: 'CCPOA', query: 'Century City Property Owners Association No 1 Park Lane Century City Cape Town' },
];

export const MapsGroundingView: React.FC<MapsGroundingViewProps> = ({
  settings,
  onLogTripWithRoute,
}) => {
  const [origin, setOrigin] = useState('Home');
  const [destination, setDestination] = useState('UWC Main Campus');
  const [customQuery, setCustomQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    summary: string;
    estimatedKm: number | null;
    mapLinks: MapLink[];
    groundingChunks?: any[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Request browser geolocation if permitted
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        (err) => {
          console.warn('Geolocation not available:', err.message);
        },
        { timeout: 5000 }
      );
    }
  }, []);

  const handleLookup = async (lookupOrigin?: string, lookupDest?: string, directQuery?: string) => {
    setLoading(true);
    setError(null);

    const orig = lookupOrigin ?? origin;
    const dest = lookupDest ?? destination;
    const q = directQuery ?? customQuery;

    try {
      const response = await fetch('/api/maps/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: orig,
          destination: dest,
          query: q || undefined,
          userLocation,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to retrieve route details');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred while connecting to Google Maps');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectQuickSite = (site: typeof COMMON_SITES[0]) => {
    setDestination(site.name);
    setCustomQuery(site.query);
    handleLookup(origin, site.name, site.query);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Compass className="w-5 h-5 text-blue-400" />
            Google Maps Route Grounding & Site Assistance
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time route estimation, verified site addresses, and direct Google Maps navigation links
          </p>
        </div>

        {userLocation && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
            <MapPin className="w-3.5 h-3.5" />
            <span>GPS: {userLocation.latitude.toFixed(3)}, {userLocation.longitude.toFixed(3)}</span>
          </div>
        )}
      </div>

      {/* Main Grid: Lookup Card & Quick Sites */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Route Calculator */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-400" />
              Route & Distance Calculator
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Origin Point</label>
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="e.g. Home, Office, or street address"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Destination Work Site</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. UWC Main Campus, SBSA Caledon"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Specific Address or Landmark Query (Optional)
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  placeholder="e.g. University of the Western Cape Robert Sobukwe Rd Bellville"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs font-medium text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                Powered by Gemini with Google Maps Grounding
              </span>

              <button
                type="button"
                disabled={loading || (!destination && !customQuery)}
                onClick={() => handleLookup()}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {loading ? 'Consulting Google Maps...' : 'Verify Route & Distance'}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <span className="font-semibold block">Google Maps Lookup Error</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Results Card */}
          {result && (
            <div className="rounded-2xl border border-blue-500/20 bg-slate-900/80 p-5 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Google Maps Grounded Route Result</h4>
                    <span className="text-xs text-slate-400">
                      {origin} → {destination}
                    </span>
                  </div>
                </div>

                {result.estimatedKm && (
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-right">
                      <span className="text-[10px] uppercase font-bold block">Estimated Distance</span>
                      <span className="text-base font-black font-mono">{result.estimatedKm} KM</span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        onLogTripWithRoute({
                          origin,
                          destination,
                          distanceKm: result.estimatedKm || 25,
                          notes: `Verified via Google Maps: ${origin} to ${destination}`,
                        })
                      }
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 shadow-md transition-all hover:scale-105"
                    >
                      <Car className="w-3.5 h-3.5" />
                      Log Trip (+{result.estimatedKm} km)
                    </button>
                  </div>
                )}
              </div>

              {/* Text Summary */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 leading-relaxed whitespace-pre-line font-sans">
                {result.summary}
              </div>

              {/* Grounded Google Maps Links (MANDATORY REQUIREMENT) */}
              {result.mapLinks.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                    Official Google Maps Places & Navigation Links:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {result.mapLinks.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:text-blue-300 text-xs font-medium transition-all"
                      >
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>{link.title || 'View Place on Google Maps'}</span>
                        <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Verified Client Work Sites */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              Frequent Client Work Sites
            </h3>
            <p className="text-xs text-slate-400">
              Click any site to verify its Google Maps address and estimate trip distance.
            </p>

            <div className="space-y-2 pt-1">
              {COMMON_SITES.map((site) => (
                <div
                  key={site.name}
                  onClick={() => handleSelectQuickSite(site)}
                  className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-800/60 hover:border-slate-700 cursor-pointer transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 group-hover:text-blue-400 transition-colors">
                      {site.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                      {site.client}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 truncate">
                    {site.query}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
