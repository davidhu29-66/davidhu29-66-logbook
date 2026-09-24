import React, { useState } from 'react';
import { WorkSession, UserSettings } from '../types';
import { hoursBetween } from '../lib/timesheetLogic';
import { Plus, Search, Filter, Clock, Edit2, Trash2, Calendar, Layers, Play, Square } from 'lucide-react';

interface TimeSessionsViewProps {
  sessions: WorkSession[];
  settings: UserSettings;
  activeSession: WorkSession | null;
  timerElapsedText: string;
  onAddSession: () => void;
  onStartLiveTimer: (category: 'business' | 'private', businessType: 'admin' | 'chargeable') => void;
  onStopLiveTimer: () => void;
  onEditSession: (session: WorkSession) => void;
  onDeleteSession: (id: string) => void;
}

export const TimeSessionsView: React.FC<TimeSessionsViewProps> = ({
  sessions,
  activeSession,
  timerElapsedText,
  onAddSession,
  onStartLiveTimer,
  onStopLiveTimer,
  onEditSession,
  onDeleteSession,
}) => {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'chargeable' | 'admin' | 'private'>('all');

  // Sort sessions descending
  const sortedSessions = [...sessions].sort((a, b) => {
    const keyA = `${a.onDate}T${a.onTime || '00:00'}`;
    const keyB = `${b.onDate}T${b.onTime || '00:00'}`;
    return keyB.localeCompare(keyA);
  });

  const filteredSessions = sortedSessions.filter((s) => {
    if (filterCategory === 'chargeable' && (s.category !== 'business' || s.businessType !== 'chargeable')) return false;
    if (filterCategory === 'admin' && (s.category !== 'business' || s.businessType !== 'admin')) return false;
    if (filterCategory === 'private' && s.category !== 'private') return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchClient = s.client?.toLowerCase().includes(q);
      const matchJob = s.jobNumber?.toLowerCase().includes(q);
      const matchNotes = s.notes?.toLowerCase().includes(q);
      const matchDate = s.onDate?.includes(q);
      const matchSplits = s.splits?.some((sp) => sp.client.toLowerCase().includes(q) || sp.jobNumber.toLowerCase().includes(q));
      if (!matchClient && !matchJob && !matchNotes && !matchDate && !matchSplits) return false;
    }
    return true;
  });

  // Totals
  let totalHours = 0;
  let chargeableHours = 0;
  let adminHours = 0;

  sessions.forEach((s) => {
    if (s.status !== 'completed') return;
    const dur = hoursBetween(s.onDate, s.onTime, s.offDate, s.offTime);
    totalHours += dur;
    if (s.category === 'business') {
      if (s.businessType === 'chargeable') {
        chargeableHours += dur;
      } else {
        adminHours += dur;
      }
    }
  });

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            Time On / Off Work Sessions (HRS)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Explicit clock intervals — the exact source of truth for the HR-018 Timesheet
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeSession ? (
            <button
              type="button"
              onClick={onStopLiveTimer}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-red-500 transition-all hover:scale-105"
            >
              <Square className="w-4 h-4 fill-current" />
              Stop Timer ({timerElapsedText})
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onStartLiveTimer('business', 'chargeable')}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-emerald-500 transition-all hover:scale-105"
            >
              <Play className="w-4 h-4 fill-current" />
              Clock In Onsite
            </button>
          )}

          <button
            type="button"
            onClick={onAddSession}
            className="flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Manual Entry
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-xs text-slate-400">Total Work Hours</span>
          <p className="text-2xl font-bold font-mono text-slate-100 mt-1">{totalHours.toFixed(2)} HRS</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-xs text-slate-400">Chargeable Hours</span>
          <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">{chargeableHours.toFixed(2)} HRS</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-xs text-slate-400">Admin Hours</span>
          <p className="text-2xl font-bold font-mono text-yellow-400 mt-1">{adminHours.toFixed(2)} HRS</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client, job #, date, or notes..."
            className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
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
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions List */}
      <div className="space-y-3">
        {filteredSessions.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-10 text-center text-slate-500">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-sm font-medium">No session records found.</p>
            <p className="text-xs mt-1">Tap "Clock In Onsite" or "Manual Entry" to record your work hours.</p>
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isLive = session.status === 'active';
            const duration = isLive ? 0 : hoursBetween(session.onDate, session.onTime, session.offDate, session.offTime);
            const hasSplits = session.splits && session.splits.length > 0;

            let badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
            let label = 'Chargeable';
            if (session.category === 'private') {
              badgeColor = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
              label = 'Private';
            } else if (session.businessType === 'admin') {
              badgeColor = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
              label = 'Admin';
            }

            return (
              <div
                key={session.id}
                className={`group relative rounded-xl border p-4 transition-all ${
                  isLive
                    ? 'border-emerald-500/60 bg-emerald-950/20 shadow-lg shadow-emerald-950/20'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/90'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left Column */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1 text-xs font-semibold text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {session.onDate}
                      </span>
                      <span className="text-xs text-slate-500">
                        {session.onTime} - {isLive ? 'Active' : session.offTime}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${badgeColor}`}>
                        {label}
                      </span>
                      {isLive && (
                        <span className="animate-pulse flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-500/40">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                          RUNNING NOW
                        </span>
                      )}
                      {hasSplits && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          <Layers className="w-3 h-3" />
                          Split ({session.splits?.length} allocations)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-100 text-sm">
                        {session.category === 'private' ? 'Private Break / Personal' : session.client || 'Admin'}
                      </h4>
                      {session.jobNumber && (
                        <span className="text-xs font-mono font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                          {session.jobNumber}
                        </span>
                      )}
                    </div>

                    {session.notes && (
                      <p className="text-xs text-slate-400 italic">"{session.notes}"</p>
                    )}

                    {/* Splits breakdown */}
                    {hasSplits && (
                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1">
                        {session.splits?.map((sp, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs text-slate-300 pl-2 border-l-2 border-emerald-500/40">
                            <span className="font-medium">
                              {sp.client} {sp.jobNumber ? `(${sp.jobNumber})` : ''} - <span className="capitalize text-slate-400">{sp.businessType}</span>
                            </span>
                            <span className="font-mono font-semibold text-emerald-300">{Number(sp.amount).toFixed(2)} HRS</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column */}
                  <div className="flex items-center justify-between md:justify-end gap-6 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                    <div className="text-left md:text-right">
                      <p className="text-xs text-slate-400">Duration</p>
                      <p className="text-xl font-black font-mono text-slate-100 mt-0.5">
                        {isLive ? timerElapsedText : `${duration.toFixed(2)} HRS`}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {isLive ? 'Timer ticking' : `${Math.round(duration * 60)} mins`}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      {!isLive && (
                        <button
                          type="button"
                          onClick={() => onEditSession(session)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
                          title="Edit Session"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteSession(session.id)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-950/40 hover:text-red-400 transition-colors"
                        title="Delete Session"
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
