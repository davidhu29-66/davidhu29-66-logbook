import React from 'react';
import { Trip, WorkSession, UserSettings, ActionCategoryType } from '../types';
import { CategoryArtCard } from './CategoryArtCard';
import { weekRange, currentWeekAnchor, computeWeeklyTimesheet } from '../lib/timesheetLogic';
import { Gauge, Clock, ShieldCheck, Plus, ArrowRight, Play, Square, AlertCircle, Sparkles } from 'lucide-react';

interface DashboardViewProps {
  trips: Trip[];
  sessions: WorkSession[];
  settings: UserSettings;
  activeSession: WorkSession | null;
  activeTrip: Trip | null;
  onOpenTripModal: (category?: 'business' | 'private', businessType?: 'admin' | 'chargeable') => void;
  onOpenSessionModal: (category?: 'business' | 'private', businessType?: 'admin' | 'chargeable') => void;
  onStartLiveTimer: (category: 'business' | 'private', businessType: 'admin' | 'chargeable') => void;
  onStopLiveTimer: () => void;
  onCompleteLiveTrip: () => void;
  onNavigateTab: (tab: string) => void;
  timerElapsedText: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  trips,
  sessions,
  settings,
  activeSession,
  activeTrip,
  onOpenTripModal,
  onOpenSessionModal,
  onStartLiveTimer,
  onStopLiveTimer,
  onCompleteLiveTrip,
  onNavigateTab,
  timerElapsedText,
}) => {
  const currentWeekDays = weekRange(currentWeekAnchor());
  const calculation = computeWeeklyTimesheet(trips, sessions, currentWeekDays);

  // Compute week totals
  let weekBusinessKm = 0;
  let weekPrivateKm = 0;
  let weekTotalHrs = 0;

  Object.values(calculation.daily).forEach((dayData) => {
    weekPrivateKm += dayData.pvte;
    dayData.cols.forEach((c) => {
      weekBusinessKm += c.km;
      weekTotalHrs += c.hrs;
    });
  });

  const weekTotalKm = weekBusinessKm + weekPrivateKm;

  // Recent 5 activities
  const recentItems = [
    ...trips.map((t) => ({
      id: t.id,
      type: 'trip' as const,
      date: t.date,
      time: t.timeOut,
      title: t.category === 'private' ? 'Private Trip' : `${t.client || 'Admin'} (${t.businessType})`,
      subtitle: `${t.mileageOut} → ${t.mileageIn} (${Math.max(0, (t.mileageIn || 0) - (t.mileageOut || 0))} KM)`,
      badge: `${Math.max(0, (t.mileageIn || 0) - (t.mileageOut || 0))} KM`,
      color: t.category === 'private' ? 'text-rose-400 bg-rose-500/10' : (t.businessType === 'admin' ? 'text-amber-400 bg-amber-500/10' : 'text-blue-400 bg-blue-500/10'),
    })),
    ...sessions.filter((s) => s.status === 'completed').map((s) => {
      const a = new Date(`${s.onDate}T${s.onTime || '00:00'}`);
      const b = new Date(`${s.offDate}T${s.offTime || '00:00'}`);
      const hrs = Math.max(0, (b.getTime() - a.getTime()) / 3600000);
      return {
        id: s.id,
        type: 'session' as const,
        date: s.onDate,
        time: s.onTime,
        title: s.category === 'private' ? 'Private Break' : `${s.client || 'Admin'} (${s.businessType})`,
        subtitle: `${s.onTime} - ${s.offTime} (${s.jobNumber || 'No Job #'})`,
        badge: `${hrs.toFixed(2)} HRS`,
        color: s.category === 'private' ? 'text-purple-400 bg-purple-500/10' : (s.businessType === 'admin' ? 'text-yellow-400 bg-yellow-500/10' : 'text-emerald-400 bg-emerald-500/10'),
      };
    }),
  ]
    .sort((a, b) => `${b.date}T${b.time || ''}`.localeCompare(`${a.date}T${a.time || ''}`))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Active Live Timer Alert Banner */}
      {activeSession && (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/60 bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-950 p-4 shadow-xl shadow-emerald-950/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <Clock className="w-6 h-6 animate-spin text-emerald-300" style={{ animationDuration: '6s' }} />
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Live Clock Onsite
                  </span>
                  <span className="text-xs text-slate-400">
                    Started at {activeSession.onTime}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-100 mt-0.5">
                  {activeSession.client || 'Admin Session'} {activeSession.jobNumber ? `• ${activeSession.jobNumber}` : ''}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Elapsed Time</p>
                <p className="text-2xl font-black font-mono tracking-tight text-emerald-400">
                  {timerElapsedText || '00:00:00'}
                </p>
              </div>
              <button
                type="button"
                onClick={onStopLiveTimer}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-emerald-500 transition-all hover:scale-105"
              >
                <Square className="w-4 h-4 fill-current" />
                Clock Off & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Live Drive Alert Banner */}
      {activeTrip && (
        <div className="relative overflow-hidden rounded-2xl border border-blue-500/60 bg-gradient-to-r from-blue-950/90 via-slate-900 to-slate-950 p-4 shadow-xl shadow-blue-950/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/40">
                <Gauge className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-500/30">
                  Drive In Progress
                </span>
                <h3 className="text-lg font-bold text-slate-100 mt-0.5">
                  Started at {activeTrip.mileageOut.toLocaleString()} KM
                </h3>
                <p className="text-xs text-slate-400">
                  {activeTrip.client ? `${activeTrip.client} (${activeTrip.jobNumber})` : 'Private Drive'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onCompleteLiveTrip}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-blue-500 transition-all hover:scale-105"
            >
              <Gauge className="w-4 h-4" />
              Enter Finish Odometer
            </button>
          </div>
        </div>
      )}

      {/* Technician & Fleet Setup Alert Banner (When Unconfigured) */}
      {(!settings.driverName || !settings.vehicleRego) && (
        <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Technician & Vehicle Setup Required
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Clean Slate
                </span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                All placeholder default data has been removed. Set your technician name, vehicle details, odometer, and client presets in Settings.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('settings')}
            className="shrink-0 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors shadow-md"
          >
            <span>Configure Technician Profile</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-sm backdrop-blur">
          <span className="text-xs font-medium text-slate-400">This Week KM</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100">{weekTotalKm.toLocaleString()}</span>
            <span className="text-xs text-slate-400">KM</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {weekBusinessKm} business • {weekPrivateKm} private
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-sm backdrop-blur">
          <span className="text-xs font-medium text-slate-400">This Week Hours</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">{weekTotalHrs.toFixed(2)}</span>
            <span className="text-xs text-slate-400">HRS</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Timesheet ready (HR-018)
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-sm backdrop-blur">
          <span className="text-xs font-medium text-slate-400">Current Odometer</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-blue-400">
              {(settings.currentOdometer || 0).toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">KM</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            {settings.vehicleName || settings.vehicleRego || 'Vehicle unconfigured'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-sm backdrop-blur">
          <span className="text-xs font-medium text-slate-400">Technician & Depot</span>
          <div className="mt-1">
            <span className="text-base font-bold text-slate-200 block truncate">
              {settings.driverName || 'Not configured'}
            </span>
            <span className="text-xs text-slate-400 block truncate">
              {settings.region || 'Depot unassigned'}
            </span>
          </div>
          <p className="text-[11px] text-blue-400/80 mt-1">
            {settings.clients?.length || 0} client presets
          </p>
        </div>
      </div>

      {/* The 6 Signature Thematic Action Cards */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              Quick Action Deck
            </h2>
            <p className="text-xs text-slate-400">
              One-click logging for all six mileage and time tracking modes
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {trips.length} trips • {sessions.length} sessions logged
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Chargeable Mileage */}
          <CategoryArtCard
            type="charge-mileage"
            title="Chargeable Mileage"
            subtitle="Billable vehicle travel to client sites"
            badge="KM • Billable"
            currentStat="Splits supported across multiple jobs"
            onAction={() => onOpenTripModal('business', 'chargeable')}
          />

          {/* 2. Admin Mileage */}
          <CategoryArtCard
            type="admin-mileage"
            title="Admin Mileage"
            subtitle="Shop, office, parts run & depot driving"
            badge="KM • Internal"
            currentStat="Direct to Column 0 on HR-018"
            onAction={() => onOpenTripModal('business', 'admin')}
          />

          {/* 3. Private Mileage */}
          <CategoryArtCard
            type="pvt-mileage"
            title="Private Mileage"
            subtitle="Personal drives & non-work commutes"
            badge="KM • Private"
            currentStat="Reconciles weekly odometer balance"
            onAction={() => onOpenTripModal('private', 'admin')}
          />

          {/* 4. Time Onsite (Clock In / Out) */}
          <CategoryArtCard
            type="time-onsite"
            title="Time On-Site"
            subtitle="Chargeable client work timer (HRS source)"
            badge="HRS • Client"
            isTimerRunning={activeSession?.category === 'business' && activeSession.businessType === 'chargeable'}
            currentStat={activeSession?.businessType === 'chargeable' ? `Live: ${timerElapsedText}` : 'Explicit clock on & off'}
            onAction={() => {
              if (activeSession) {
                onStopLiveTimer();
              } else {
                onStartLiveTimer('business', 'chargeable');
              }
            }}
          />

          {/* 5. Admin Time */}
          <CategoryArtCard
            type="admin-time"
            title="Admin Time"
            subtitle="Workshop prep, reports, meetings, logistics"
            badge="HRS • Admin"
            isTimerRunning={activeSession?.businessType === 'admin'}
            currentStat={activeSession?.businessType === 'admin' ? `Live: ${timerElapsedText}` : 'Column 0 Hours on Timesheet'}
            onAction={() => {
              if (activeSession) {
                onStopLiveTimer();
              } else {
                onStartLiveTimer('business', 'admin');
              }
            }}
          />

          {/* 6. Private Time */}
          <CategoryArtCard
            type="pvt-time"
            title="Private Break"
            subtitle="Lunch breaks, personal time & non-billable"
            badge="HRS • Break"
            isTimerRunning={activeSession?.category === 'private'}
            currentStat={activeSession?.category === 'private' ? `Live: ${timerElapsedText}` : 'Accurate workday separation'}
            onAction={() => {
              if (activeSession) {
                onStopLiveTimer();
              } else {
                onStartLiveTimer('private', 'admin');
              }
            }}
          />
        </div>
      </div>

      {/* Split Section: Weekly Timesheet Snapshot + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: HR-018 Weekly Timesheet Quick Preview */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                HR-018 Weekly Matrix Snapshot
              </h3>
              <p className="text-xs text-slate-400">
                Week ending {currentWeekDays[6]}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('timesheet')}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
            >
              Open Full Timesheet <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2 font-medium">Day</th>
                  <th className="pb-2 font-medium text-center">Admin (Hrs / Km)</th>
                  {calculation.columns.slice(1, 4).map((col, idx) => (
                    <th key={idx} className="pb-2 font-medium text-center truncate max-w-[120px]">
                      {col.client} ({col.jobNumber || 'Job'})
                    </th>
                  ))}
                  <th className="pb-2 font-medium text-right">Pvt Km</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {currentWeekDays.map((day, idx) => {
                  const dayData = calculation.daily[day] || { cols: [], pvte: 0 };
                  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                  const adminCol = dayData.cols[0] || { hrs: 0, km: 0 };
                  return (
                    <tr key={day} className="hover:bg-slate-800/30">
                      <td className="py-2.5 font-semibold text-slate-200">
                        {dayNames[idx]} <span className="text-[11px] font-normal text-slate-500">{day.slice(5)}</span>
                      </td>
                      <td className="py-2.5 text-center font-mono">
                        {adminCol.hrs > 0 ? `${adminCol.hrs.toFixed(1)}h` : '-'} / {adminCol.km > 0 ? `${adminCol.km}k` : '-'}
                      </td>
                      {calculation.columns.slice(1, 4).map((_, cIdx) => {
                        const colData = dayData.cols[cIdx + 1] || { hrs: 0, km: 0 };
                        return (
                          <td key={cIdx} className="py-2.5 text-center font-mono">
                            {colData.hrs > 0 ? `${colData.hrs.toFixed(1)}h` : '-'} / {colData.km > 0 ? `${colData.km}k` : '-'}
                          </td>
                        );
                      })}
                      <td className="py-2.5 text-right font-mono text-rose-300">
                        {dayData.pvte > 0 ? `${dayData.pvte}` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Recent Activity Log */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 text-sm">Recent Activity</h3>
              <span className="text-xs text-slate-500">Live feed</span>
            </div>

            <div className="mt-3.5 space-y-3">
              {recentItems.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No recent records. Tap any card above to log!</p>
              ) : (
                recentItems.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-2 text-xs">
                    <div>
                      <p className="font-semibold text-slate-200">{item.title}</p>
                      <p className="text-slate-400 text-[11px]">{item.subtitle}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold shrink-0 ${item.color}`}>
                      {item.badge}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onNavigateTab('trips')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              All Trips ({trips.length})
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('time')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
            >
              All Sessions ({sessions.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
