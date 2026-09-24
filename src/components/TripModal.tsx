import React, { useState, useEffect } from 'react';
import { Trip, Split, UserSettings, ActivityCategory, BusinessType } from '../types';
import { X, Plus, Trash2, Gauge, AlertCircle, Calendar, Clock, Car, Building2, Tag, MapPin, Navigation, Sparkles, ExternalLink, Check } from 'lucide-react';

interface TripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (trip: Trip) => void;
  initialTrip?: Trip | null;
  suggestedOdometerOut: number;
  settings: UserSettings;
  defaultCategory?: ActivityCategory;
  defaultBusinessType?: BusinessType;
}

export const TripModal: React.FC<TripModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTrip,
  suggestedOdometerOut,
  settings,
  defaultCategory = 'business',
  defaultBusinessType = 'chargeable',
}) => {
  const [date, setDate] = useState('');
  const [timeOut, setTimeOut] = useState('08:00');
  const [timeIn, setTimeIn] = useState('09:00');
  const [mileageOut, setMileageOut] = useState<number>(0);
  const [mileageIn, setMileageIn] = useState<number>(0);
  const [category, setCategory] = useState<ActivityCategory>('business');
  const [businessType, setBusinessType] = useState<BusinessType>('chargeable');
  const [client, setClient] = useState('');
  const [jobNumber, setJobNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [enableSplits, setEnableSplits] = useState(false);
  const [splits, setSplits] = useState<Split[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Maps Grounding state
  const [mapsLoading, setMapsLoading] = useState(false);
  const [mapsResult, setMapsResult] = useState<{
    summary: string;
    estimatedKm: number | null;
    mapLinks: Array<{ title: string; uri: string }>;
  } | null>(null);
  const [mapsError, setMapsError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setMapsResult(null);
    setMapsError(null);
    setMapsLoading(false);

    if (initialTrip) {
      setDate(initialTrip.date);
      setTimeOut(initialTrip.timeOut || '08:00');
      setTimeIn(initialTrip.timeIn || '09:00');
      setMileageOut(initialTrip.mileageOut || 0);
      setMileageIn(initialTrip.mileageIn || 0);
      setCategory(initialTrip.category);
      setBusinessType(initialTrip.businessType || 'chargeable');
      setClient(initialTrip.client || '');
      setJobNumber(initialTrip.jobNumber || '');
      setNotes(initialTrip.notes || '');
      setVehicle(initialTrip.vehicle || settings.vehicleName || '');
      setOrigin(initialTrip.origin || settings.region || 'Depot / Office');
      setDestination(initialTrip.destination || '');
      if (initialTrip.splits && initialTrip.splits.length > 0) {
        setEnableSplits(true);
        setSplits(initialTrip.splits);
      } else {
        setEnableSplits(false);
        setSplits([]);
      }
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const now = new Date();
      const currentH = String(now.getHours()).padStart(2, '0');
      const currentM = String(now.getMinutes()).padStart(2, '0');

      setDate(today);
      setTimeOut(`${currentH}:${currentM}`);
      setTimeIn(`${currentH}:${currentM}`);
      setMileageOut(suggestedOdometerOut || settings.currentOdometer || 0);
      setMileageIn(suggestedOdometerOut || settings.currentOdometer || 0);
      setCategory(defaultCategory);
      setBusinessType(defaultBusinessType);
      setClient(defaultBusinessType === 'admin' ? 'Admin' : (settings.clients[0] || ''));
      setJobNumber(defaultBusinessType === 'admin' ? '' : (settings.jobNumbers[0] || ''));
      setNotes('');
      setVehicle(settings.vehicleName || '');
      setOrigin(settings.region || '');
      setDestination(defaultBusinessType === 'admin' ? 'Admin' : (settings.clients[0] ? `${settings.clients[0]} Site` : ''));
      setEnableSplits(false);
      setSplits([]);
    }
    setError(null);
  }, [isOpen, initialTrip, suggestedOdometerOut, settings, defaultCategory, defaultBusinessType]);

  if (!isOpen) return null;

  const totalDistance = Math.max(0, mileageIn - mileageOut);
  const splitsSum = splits.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
  const splitsRemainder = totalDistance - splitsSum;

  const handleAddSplit = () => {
    const newSplit: Split = {
      id: `split-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      businessType: 'chargeable',
      client: settings.clients[0] || '',
      jobNumber: settings.jobNumbers[0] || '',
      amount: Math.max(0, splitsRemainder),
    };
    setSplits([...splits, newSplit]);
  };

  const handleUpdateSplit = (id: string, field: keyof Split, val: any) => {
    setSplits(
      splits.map((s) => (s.id === id ? { ...s, [field]: val } : s))
    );
  };

  const handleRemoveSplit = (id: string) => {
    setSplits(splits.filter((s) => s.id !== id));
  };

  const handleVerifyWithMaps = async () => {
    if (!destination && !origin) return;
    setMapsLoading(true);
    setMapsError(null);
    try {
      const res = await fetch('/api/maps/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, destination }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Maps lookup failed');
      }
      const data = await res.json();
      setMapsResult(data);
    } catch (err: any) {
      setMapsError(err.message || 'Error fetching Maps route');
    } finally {
      setMapsLoading(false);
    }
  };

  const handleApplyMapsDistance = () => {
    if (mapsResult?.estimatedKm) {
      const newIn = mileageOut + Math.round(mapsResult.estimatedKm);
      setMileageIn(newIn);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      setError('Date is required.');
      return;
    }
    if (mileageIn < mileageOut) {
      setError('Closing odometer (Mileage In) cannot be lower than opening odometer (Mileage Out).');
      return;
    }
    if (category === 'business' && businessType === 'chargeable' && !enableSplits && !client.trim()) {
      setError('Client name is required for chargeable business trips.');
      return;
    }
    if (enableSplits && splits.length > 0 && Math.abs(splitsRemainder) > 0.01) {
      setError(`Split amounts (${splitsSum} KM) must match the total trip distance (${totalDistance} KM). Difference: ${splitsRemainder} KM.`);
      return;
    }

    const tripData: Trip = {
      id: initialTrip ? initialTrip.id : `trip-${Date.now()}`,
      date,
      timeOut,
      timeIn,
      mileageOut: Number(mileageOut),
      mileageIn: Number(mileageIn),
      category,
      businessType,
      client: category === 'private' ? '' : (businessType === 'admin' ? 'Admin' : client),
      jobNumber: category === 'private' || businessType === 'admin' ? '' : jobNumber,
      splits: enableSplits && splits.length > 0 ? splits : undefined,
      origin: origin.trim() || undefined,
      destination: destination.trim() || undefined,
      notes,
      vehicle,
      status: 'completed',
    };

    onSave(tripData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl text-slate-100 my-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                {initialTrip ? 'Edit Trip Record' : 'Log Vehicle Trip (KM)'}
              </h2>
              <p className="text-xs text-slate-400">Record odometer start and finish</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Category Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCategory('business')}
              className={`rounded-lg py-2 text-xs font-semibold border transition-all ${
                category === 'business'
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-sm'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
              }`}
            >
              Business Trip
            </button>
            <button
              type="button"
              onClick={() => setCategory('private')}
              className={`rounded-lg py-2 text-xs font-semibold border transition-all ${
                category === 'private'
                  ? 'bg-rose-600/20 border-rose-500 text-rose-300 shadow-sm'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
              }`}
            >
              Private / Commute
            </button>
          </div>

          {/* If Business: Admin vs Chargeable */}
          {category === 'business' && (
            <div className="flex items-center gap-2 rounded-xl bg-slate-950/60 p-2 border border-slate-800">
              <span className="text-xs font-medium text-slate-400 px-2">Type:</span>
              <button
                type="button"
                onClick={() => {
                  setBusinessType('chargeable');
                  if (client === 'Admin') setClient(settings.clients[0] || '');
                }}
                className={`flex-1 rounded-lg py-1.5 text-xs font-medium border transition-colors ${
                  businessType === 'chargeable'
                    ? 'bg-red-500/20 border-red-500/40 text-red-300'
                    : 'border-transparent text-slate-400 hover:bg-slate-800'
                }`}
              >
                Chargeable (Client/Job)
              </button>
              <button
                type="button"
                onClick={() => {
                  setBusinessType('admin');
                  setClient('Admin');
                  setJobNumber('');
                }}
                className={`flex-1 rounded-lg py-1.5 text-xs font-medium border transition-colors ${
                  businessType === 'admin'
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'border-transparent text-slate-400 hover:bg-slate-800'
                }`}
              >
                Admin (Internal/Shop)
              </button>
            </div>
          )}

          {/* Date and Times */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Time Out
              </label>
              <input
                type="time"
                value={timeOut}
                onChange={(e) => setTimeOut(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Time In
              </label>
              <input
                type="time"
                value={timeIn}
                onChange={(e) => setTimeIn(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Odometer Readings */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-blue-400" />
                Odometer Readings (KM)
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Distance: {totalDistance} KM
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Start (Mileage Out)</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={mileageOut}
                  onChange={(e) => setMileageOut(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Finish (Mileage In)</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={mileageIn}
                  onChange={(e) => setMileageIn(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Client & Job Number (when single allocation) */}
          {category === 'business' && !enableSplits && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  Client Name
                </label>
                <input
                  type="text"
                  list="clients-list"
                  disabled={businessType === 'admin'}
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:opacity-50 focus:border-blue-500 focus:outline-none"
                />
                <datalist id="clients-list">
                  {settings.clients.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  Job Number
                </label>
                <input
                  type="text"
                  list="jobs-list"
                  disabled={businessType === 'admin'}
                  value={jobNumber}
                  onChange={(e) => setJobNumber(e.target.value)}
                  placeholder="e.g. J-2024-88"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:opacity-50 focus:border-blue-500 focus:outline-none"
                />
                <datalist id="jobs-list">
                  {settings.jobNumbers.map((j) => (
                    <option key={j} value={j} />
                  ))}
                </datalist>
              </div>
            </div>
          )}

          {/* Splits Toggle and Editor */}
          {category === 'business' && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-200">
                    Split trip distance across multiple jobs / admin
                  </span>
                  <p className="text-[11px] text-slate-400">
                    For multi-stop legs or mixed billable & internal mileage
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableSplits}
                    onChange={(e) => {
                      setEnableSplits(e.target.checked);
                      if (e.target.checked && splits.length === 0) {
                        setSplits([
                          {
                            id: 'sp-1',
                            businessType: businessType,
                            client: client || settings.clients[0] || 'Admin',
                            jobNumber: jobNumber,
                            amount: totalDistance,
                          },
                        ]);
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {enableSplits && (
                <div className="mt-3 space-y-2.5">
                  {splits.map((s, index) => (
                    <div key={s.id} className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[11px] font-bold text-slate-400 w-5">#{index + 1}</span>
                      <select
                        value={s.businessType}
                        onChange={(e) => handleUpdateSplit(s.id, 'businessType', e.target.value)}
                        className="rounded border border-slate-700 bg-slate-950 text-xs px-2 py-1 text-slate-200"
                      >
                        <option value="chargeable">Chargeable</option>
                        <option value="admin">Admin</option>
                      </select>

                      <input
                        type="text"
                        placeholder="Client"
                        value={s.businessType === 'admin' ? 'Admin' : s.client}
                        disabled={s.businessType === 'admin'}
                        onChange={(e) => handleUpdateSplit(s.id, 'client', e.target.value)}
                        className="rounded border border-slate-700 bg-slate-950 text-xs px-2 py-1 flex-1 min-w-[90px] text-slate-100 disabled:opacity-50"
                      />

                      <input
                        type="text"
                        placeholder="Job #"
                        value={s.businessType === 'admin' ? '' : s.jobNumber}
                        disabled={s.businessType === 'admin'}
                        onChange={(e) => handleUpdateSplit(s.id, 'jobNumber', e.target.value)}
                        className="rounded border border-slate-700 bg-slate-950 text-xs px-2 py-1 w-24 text-slate-100 disabled:opacity-50"
                      />

                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="1"
                          placeholder="KM"
                          value={s.amount}
                          onChange={(e) => handleUpdateSplit(s.id, 'amount', Number(e.target.value))}
                          className="rounded border border-slate-700 bg-slate-950 text-xs px-2 py-1 w-16 text-right font-mono text-slate-100"
                        />
                        <span className="text-xs text-slate-400">KM</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveSplit(s.id)}
                        className="p-1 text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleAddSplit}
                      className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Split Allocation
                    </button>
                    <span className={`text-xs font-mono ${Math.abs(splitsRemainder) < 0.01 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      Allocated: {splitsSum} / {totalDistance} KM ({splitsRemainder >= 0 ? `${splitsRemainder} KM left` : `${Math.abs(splitsRemainder)} KM excess`})
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Route: Origin & Destination (SARS & HR-018) */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  Origin / Departure Point
                </label>
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="e.g. Home or Office"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                    Destination / Work Site
                  </span>
                  <button
                    type="button"
                    onClick={handleVerifyWithMaps}
                    disabled={mapsLoading || (!destination && !origin)}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 disabled:opacity-40"
                  >
                    <Sparkles className="w-3 h-3" />
                    {mapsLoading ? 'Checking Maps...' : 'Verify on Google Maps'}
                  </button>
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. UWC Main Campus or SBSA Caledon"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* In-Modal Google Maps Grounding Result */}
            {mapsError && (
              <p className="text-[11px] text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                {mapsError}
              </p>
            )}

            {mapsResult && (
              <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    Google Maps Grounded Route
                  </span>
                  {mapsResult.estimatedKm && (
                    <button
                      type="button"
                      onClick={handleApplyMapsDistance}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 shadow transition-all"
                    >
                      <Check className="w-3 h-3" />
                      Apply Distance (+{mapsResult.estimatedKm} km)
                    </button>
                  )}
                </div>

                <p className="text-slate-300 text-[11px] line-clamp-3">
                  {mapsResult.summary}
                </p>

                {mapsResult.mapLinks.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {mapsResult.mapLinks.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 hover:text-blue-300 border border-blue-500/20 text-[11px]"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>{link.title || 'View on Google Maps'}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes and Vehicle */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Vehicle / Rego</label>
              <input
                type="text"
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                placeholder="e.g. Ford Ranger / CA 123-456"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Notes / Trip Purpose</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Substation delivery and site checks"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-lg hover:bg-blue-500 transition-all hover:scale-[1.02]"
            >
              {initialTrip ? 'Update Trip' : 'Save Trip Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
