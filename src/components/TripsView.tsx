import React, { useState } from 'react';
import { Trip, UserSettings } from '../types';
import { Plus, Search, Filter, Car, Edit2, Trash2, Calendar, Gauge, ArrowRight, AlertTriangle, Layers, Database, Compass, MapPin, ExternalLink } from 'lucide-react';

interface TripsViewProps {
  trips: Trip[];
  settings: UserSettings;
  onAddTrip: () => void;
  onEditTrip: (trip: Trip) => void;
  onDeleteTrip: (id: string) => void;
  onOpenImportModal: () => void;
  onOpenMapsView: () => void;
  onClearAllTrips?: () => void;
  onResetSampleData?: () => void;
}

export const TripsView: React.FC<TripsViewProps> = ({
  trips,
  onAddTrip,
  onEditTrip,
  onDeleteTrip,
  onOpenImportModal,
  onOpenMapsView,
  onClearAllTrips,
  onResetSampleData,
}) => {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'chargeable' | 'admin' | 'private'>('all');

  // Sort trips descending by date and time
  const sortedTrips = [...trips].sort((a, b) => {
    const keyA = `${a.date}T${a.timeOut || '00:00'}`;
    const keyB = `${b.date}T${b.timeOut || '00:00'}`;
    return keyB.localeCompare(keyA);
  });

  const filteredTrips = sortedTrips.filter((t) => {
    if (filterCategory === 'chargeable' && (t.category !== 'business' || t.businessType !== 'chargeable')) return false;
    if (filterCategory === 'admin' && (t.category !== 'business' || t.businessType !== 'admin')) return false;
    if (filterCategory === 'private' && t.category !== 'private') return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchClient = t.client?.toLowerCase().includes(q);
      const matchJob = t.jobNumber?.toLowerCase().includes(q);
      const matchNotes = t.notes?.toLowerCase().includes(q);
      const matchDate = t.date?.includes(q);
      const matchOrigin = t.origin?.toLowerCase().includes(q);
      const matchDest = t.destination?.toLowerCase().includes(q);
      const matchSplits = t.splits?.some((s) => s.client.toLowerCase().includes(q) || s.jobNumber.toLowerCase().includes(q));
      if (!matchClient && !matchJob && !matchNotes && !matchDate && !matchOrigin && !matchDest && !matchSplits) return false;
    }
    return true;
  });

  const totalKm = trips.reduce((acc, t) => acc + Math.max(0, (t.mileageIn || 0) - (t.mileageOut || 0)), 0);
  const businessKm = trips
    .filter((t) => t.category === 'business')
    .reduce((acc, t) => acc + Math.max(0, (t.mileageIn || 0) - (t.mileageOut || 0)), 0);
  const privateKm = trips
    .filter((t) => t.category === 'private')
    .reduce((acc, t) => acc + Math.max(0, (t.mileageIn || 0) - (t.mileageOut || 0)), 0);

  return (
    <div className="space-y-6">
      {/* Header with Title and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Car className="w-5 h-5 text-blue-400" />
            Vehicle Trips Logbook (KM)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Odometer-verified distance records with Google Maps route grounding and multi-job attribution
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {trips.length > 0 && onClearAllTrips && (
            <button
              type="button"
              onClick={onClearAllTrips}
              className="flex items-center gap-1.5 rounded-xl border border-rose-900/50 bg-rose-950/20 px-3 py-2 text-xs font-semibold text-rose-300 hover:text-rose-100 hover:bg-rose-900/40 transition-all"
              title="Clear all logged trips to get a clean database"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Clear All Trips</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenImportModal}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-700 transition-all"
            title="Import CSV trips data"
          >
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>Import CSV</span>
          </button>

          <button
            type="button"
            onClick={onOpenMapsView}
            className="flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 transition-all"
            title="Google Maps Route Grounding"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Maps & Routes</span>
          </button>

          <button
            type="button"
            onClick={onAddTrip}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-blue-500 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            Log Vehicle Trip
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-xs text-slate-400">Total Logged KM</span>
          <p className="text-2xl font-bold font-mono text-slate-100 mt-1">{totalKm.toLocaleString()} KM</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-xs text-slate-400">Business KM</span>
          <p className="text-2xl font-bold font-mono text-blue-400 mt-1">{businessKm.toLocaleString()} KM</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-xs text-slate-400">Private KM</span>
          <p className="text-2xl font-bold font-mono text-rose-400 mt-1">{privateKm.toLocaleString()} KM</p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client, job #, date, or notes..."
            className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1" />
          {(['all', 'chargeable', 'admin', 'private'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-colors ${
                filterCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Trips Cards List */}
      <div className="space-y-3">
        {trips.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
              <Car className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-base font-bold text-slate-100">Logbook Database is Completely Clean</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-6">
              All previous trips have been cleared. You have a fresh slate to log verified trips or import your CSV spreadsheet.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onAddTrip}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-blue-500 transition-all hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                Log Vehicle Trip
              </button>
              <button
                type="button"
                onClick={onOpenImportModal}
                className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-all"
              >
                <Database className="w-4 h-4 text-blue-400" />
                Import CSV File
              </button>
              {onResetSampleData && (
                <button
                  type="button"
                  onClick={onResetSampleData}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-all"
                >
                  <span>Restore Sample Dataset</span>
                </button>
              )}
            </div>
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-10 text-center text-slate-500">
            <Car className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-sm font-medium">No trip records match the current filter or search query.</p>
            <p className="text-xs mt-1">Try changing the search keywords or filter category above.</p>
          </div>
        ) : (
          filteredTrips.map((trip) => {
            const distance = Math.max(0, (trip.mileageIn || 0) - (trip.mileageOut || 0));
            const hasSplits = trip.splits && trip.splits.length > 0;

            let badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
            let label = 'Chargeable';
            if (trip.category === 'private') {
              badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
              label = 'Private';
            } else if (trip.businessType === 'admin') {
              badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
              label = 'Admin';
            }

            return (
              <div
                key={trip.id}
                className="group relative rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-all hover:border-slate-700 hover:bg-slate-900/90"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left Column: Date, Type, Client */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1 text-xs font-semibold text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {trip.date}
                      </span>
                      <span className="text-xs text-slate-500">
                        {trip.timeOut || '00:00'} - {trip.timeIn || '00:00'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${badgeColor}`}>
                        {label}
                      </span>
                      {hasSplits && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          <Layers className="w-3 h-3" />
                          Split ({trip.splits?.length} allocations)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-100 text-sm">
                        {trip.category === 'private' ? 'Personal Commute / Private' : trip.client || 'Admin'}
                      </h4>
                      {trip.jobNumber && (
                        <span className="text-xs font-mono font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                          {trip.jobNumber}
                        </span>
                      )}
                    </div>

                    {/* Origin to Destination Route */}
                    {(trip.origin || trip.destination) && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="text-slate-400">{trip.origin || 'Home/Depot'}</span>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        <span className="font-semibold text-slate-200">{trip.destination || 'Site'}</span>
                        {trip.destination && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.destination)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View on Google Maps"
                            className="text-slate-500 hover:text-blue-400 p-0.5 ml-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}

                    {trip.notes && (
                      <p className="text-xs text-slate-400 italic">"{trip.notes}"</p>
                    )}

                    {/* If split, display split rows */}
                    {hasSplits && (
                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1">
                        {trip.splits?.map((s, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs text-slate-300 pl-2 border-l-2 border-indigo-500/40">
                            <span className="font-medium">
                              {s.client} {s.jobNumber ? `(${s.jobNumber})` : ''} - <span className="capitalize text-slate-400">{s.businessType}</span>
                            </span>
                            <span className="font-mono font-semibold text-indigo-300">{s.amount} KM</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Odometer & Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-6 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                    <div className="text-left md:text-right">
                      <div className="flex items-center md:justify-end gap-1.5 text-xs text-slate-400">
                        <Gauge className="w-3.5 h-3.5 text-slate-500" />
                        <span className="font-mono">{trip.mileageOut.toLocaleString()}</span>
                        <ArrowRight className="w-3 h-3 text-slate-600" />
                        <span className="font-mono">{trip.mileageIn.toLocaleString()}</span>
                      </div>
                      <p className="text-lg font-black font-mono text-slate-100 mt-0.5">
                        {distance} <span className="text-xs font-normal text-slate-400">KM</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => onEditTrip(trip)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
                        title="Edit Trip"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteTrip(trip.id)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-950/40 hover:text-red-400 transition-colors"
                        title="Delete Trip"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
