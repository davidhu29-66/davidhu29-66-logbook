import React from 'react';
import { Trip, WorkSession } from '../types';
import { hoursBetween } from '../lib/timesheetLogic';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { BarChart3, TrendingUp, PieChart as PieIcon, ShieldAlert } from 'lucide-react';

interface AnalyticsViewProps {
  trips: Trip[];
  sessions: WorkSession[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ trips, sessions }) => {
  // Aggregate daily KM and hours over the last 14 days or logged dates
  const dateMap: Record<string, { date: string; km: number; hours: number; businessKm: number; privateKm: number }> = {};

  trips.forEach((t) => {
    const d = t.date;
    if (!dateMap[d]) {
      dateMap[d] = { date: d.slice(5), km: 0, hours: 0, businessKm: 0, privateKm: 0 };
    }
    const dist = Math.max(0, (t.mileageIn || 0) - (t.mileageOut || 0));
    dateMap[d].km += dist;
    if (t.category === 'business') {
      dateMap[d].businessKm += dist;
    } else {
      dateMap[d].privateKm += dist;
    }
  });

  sessions.forEach((s) => {
    if (s.status !== 'completed') return;
    const d = s.onDate;
    if (!dateMap[d]) {
      dateMap[d] = { date: d.slice(5), km: 0, hours: 0, businessKm: 0, privateKm: 0 };
    }
    const dur = hoursBetween(s.onDate, s.onTime, s.offDate, s.offTime);
    dateMap[d].hours += Math.round(dur * 100) / 100;
  });

  const dailyTrendData = Object.keys(dateMap)
    .sort()
    .slice(-10)
    .map((k) => dateMap[k]);

  // Aggregate mileage breakdown: Chargeable, Admin, Private
  let chargeableKm = 0;
  let adminKm = 0;
  let privateKm = 0;

  trips.forEach((t) => {
    const dist = Math.max(0, (t.mileageIn || 0) - (t.mileageOut || 0));
    if (t.category === 'private') {
      privateKm += dist;
    } else if (t.businessType === 'admin') {
      adminKm += dist;
    } else {
      chargeableKm += dist;
    }
  });

  const mileagePieData = [
    { name: 'Chargeable KM', value: chargeableKm, color: '#ef4444' },
    { name: 'Admin KM', value: adminKm, color: '#f59e0b' },
    { name: 'Private KM', value: privateKm, color: '#e11d48' },
  ].filter((d) => d.value > 0);

  // Client hours allocation
  const clientHoursMap: Record<string, number> = {};
  sessions.forEach((s) => {
    if (s.status !== 'completed') return;
    const dur = hoursBetween(s.onDate, s.onTime, s.offDate, s.offTime);
    if (s.splits && s.splits.length > 0) {
      s.splits.forEach((sp) => {
        const c = sp.client || 'Admin';
        clientHoursMap[c] = (clientHoursMap[c] || 0) + Number(sp.amount);
      });
    } else {
      const c = s.category === 'private' ? 'Private' : (s.businessType === 'admin' ? 'Admin' : (s.client || 'Other'));
      clientHoursMap[c] = (clientHoursMap[c] || 0) + dur;
    }
  });

  const CLIENT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
  const clientPieData = Object.entries(clientHoursMap)
    .map(([client, hrs], idx) => ({
      name: client,
      value: Math.round(hrs * 10) / 10,
      color: CLIENT_COLORS[idx % CLIENT_COLORS.length],
    }))
    .filter((d) => d.value > 0);

  const totalKm = chargeableKm + adminKm + privateKm;
  const totalHrs = Object.values(clientHoursMap).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          Fleet & Operational Analytics
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Visual breakdowns of kilometer attribution and billable hours distribution
        </p>
      </div>

      {/* Summary KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-xs text-slate-400">Total KM Logged</span>
          <p className="text-2xl font-bold font-mono text-slate-100 mt-1">{totalKm.toLocaleString()} KM</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {totalKm > 0 ? `${Math.round(((chargeableKm + adminKm) / totalKm) * 100)}% business utilization` : '0%'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-xs text-slate-400">Total Hours Tracked</span>
          <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">{totalHrs.toFixed(1)} HRS</p>
          <p className="text-[11px] text-slate-500 mt-1">Across all work sessions</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-xs text-slate-400">Chargeable KM</span>
          <p className="text-2xl font-bold font-mono text-red-400 mt-1">{chargeableKm.toLocaleString()} KM</p>
          <p className="text-[11px] text-slate-500 mt-1">Billable client mileage</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-xs text-slate-400">Private Distance</span>
          <p className="text-2xl font-bold font-mono text-rose-400 mt-1">{privateKm.toLocaleString()} KM</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {totalKm > 0 ? `${Math.round((privateKm / totalKm) * 100)}% of odometer` : '0%'}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend Chart */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              Daily KM & Hours Trend
            </h3>
            <span className="text-xs text-slate-500">Recent logs</span>
          </div>

          <div className="mt-4 h-64 w-full">
            {dailyTrendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No logs to graph yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="km" name="Total KM" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="hours" name="Work Hours" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Mileage Categorization Donut */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-400" />
              Mileage Allocation (KM)
            </h3>
            <span className="text-xs text-slate-500">By classification</span>
          </div>

          <div className="mt-4 h-64 w-full flex items-center justify-center">
            {mileagePieData.length === 0 ? (
              <div className="text-xs text-slate-500">No mileage data to display</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mileagePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {mileagePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${val} KM`, 'Distance']}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Client Hours Distribution */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
            Work Hours Distribution by Client & Project
          </h3>
          <span className="text-xs text-slate-500">{clientPieData.length} entities tracked</span>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {clientPieData.map((item) => {
            const pct = totalHrs > 0 ? Math.round((item.value / totalHrs) * 100) : 0;
            return (
              <div key={item.name} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <div>
                    <p className="text-xs font-bold text-slate-200">{item.name}</p>
                    <p className="text-[11px] text-slate-400">{pct}% of total hours</p>
                  </div>
                </div>
                <span className="text-sm font-bold font-mono text-emerald-400">{item.value.toFixed(1)}h</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
