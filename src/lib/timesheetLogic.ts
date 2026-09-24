import { Trip, WorkSession, WeeklyTimesheetCalculation, TimesheetColumn } from '../types';

export function sortKey(t: { date: string; timeOut?: string }): string {
  return `${t.date}T${t.timeOut || '00:00'}`;
}

// Returns [mon, tue, wed, thu, fri, sat, sun] as YYYY-MM-DD strings for the
// week containing anyDateStr. Uses UTC throughout deliberately — mixing
// local-time Date construction with toISOString() (always UTC) causes a
// timezone-dependent off-by-one-day bug in any timezone ahead of UTC (e.g.
// SAST, UTC+2): local midnight becomes 22:00 the *previous* day once
// converted to UTC, silently shifting the whole week back by a day. Working
// entirely in UTC sidesteps that regardless of what timezone this runs in.
export function weekRange(anyDateStr: string): string[] {
  const [y, m, d] = anyDateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay(); // 0=Sun..6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(dt);
  monday.setUTCDate(dt.getUTCDate() + diffToMonday);
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(monday);
    dd.setUTCDate(monday.getUTCDate() + i);
    days.push(dd.toISOString().slice(0, 10));
  }
  return days;
}

export function hoursBetween(
  dateA?: string,
  timeA?: string,
  dateB?: string,
  timeB?: string
): number {
  if (!dateA || !dateB) return 0;
  const a = new Date(`${dateA}T${timeA || '00:00'}`);
  const b = new Date(`${dateB}T${timeB || '00:00'}`);
  const diffHours = (b.getTime() - a.getTime()) / 3600000;
  return isNaN(diffHours) ? 0 : Math.max(0, diffHours);
}

export const keyOf = (x: { client?: string; jobNumber?: string }): string =>
  `${x.client || ''}\u0000${x.jobNumber || ''}`;

// The (businessType, client, jobNumber) allocations an entry actually
// resolves to — its splits if it has any, otherwise its own single tag.
export function allocationsOf(entry: {
  category: string;
  businessType?: 'admin' | 'chargeable';
  client?: string;
  jobNumber?: string;
  splits?: Array<{ businessType: 'admin' | 'chargeable'; client: string; jobNumber: string; amount: number }>;
}): Array<{ businessType: 'admin' | 'chargeable'; client: string; jobNumber: string; amount: number | null }> {
  if (entry.splits && entry.splits.length > 0) {
    return entry.splits.map((s) => ({
      businessType: s.businessType,
      client: s.client || '',
      jobNumber: s.jobNumber || '',
      amount: Number(s.amount) || 0,
    }));
  }
  return [
    {
      businessType: entry.businessType || 'admin',
      client: entry.client || '',
      jobNumber: entry.jobNumber || '',
      amount: null,
    },
  ];
}

// Main calculation entry point
export function computeWeeklyTimesheet(
  allTrips: Trip[],
  allSessions: WorkSession[],
  weekDays: string[]
): WeeklyTimesheetCalculation {
  const weekSet = new Set(weekDays);

  // Trips with valid odometer in the week
  const weekTrips = allTrips
    .filter((t) => t.mileageIn !== null && t.mileageIn !== undefined && weekSet.has(t.date))
    .sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : 1));

  // Sessions starting in this week (completed only or with offTime)
  const weekSessions = allSessions
    .filter((s) => weekSet.has(s.onDate) && s.status === 'completed' && s.offTime)
    .sort((a, b) => (`${a.onDate}T${a.onTime}` < `${b.onDate}T${b.onTime}` ? -1 : 1));

  // Chargeable events collection
  const chargeableEvents: Array<{ at: string; client: string; jobNumber: string }> = [];

  for (const t of weekTrips) {
    if (t.category !== 'business') continue;
    const at = `${t.date}T${t.timeOut || '00:00'}`;
    for (const a of allocationsOf(t)) {
      if (a.businessType === 'chargeable') {
        chargeableEvents.push({ at, client: a.client, jobNumber: a.jobNumber });
      }
    }
  }

  for (const s of weekSessions) {
    if (s.category !== 'business') continue;
    const at = `${s.onDate}T${s.onTime || '00:00'}`;
    for (const a of allocationsOf(s)) {
      if (a.businessType === 'chargeable') {
        chargeableEvents.push({ at, client: a.client, jobNumber: a.jobNumber });
      }
    }
  }

  chargeableEvents.sort((a, b) => (a.at < b.at ? -1 : 1));

  const chargeablePairs: Array<{ client: string; jobNumber: string; key: string }> = [];
  for (const e of chargeableEvents) {
    const k = keyOf(e);
    if (!chargeablePairs.some((c) => c.key === k)) {
      chargeablePairs.push({ client: e.client || '(no client)', jobNumber: e.jobNumber || '', key: k });
    }
  }

  const overflowClients = chargeablePairs.slice(9); // template has 9 dynamic slots + Admin = 10
  const columns: TimesheetColumn[] = [
    { type: 'admin', client: 'Admin', jobNumber: '' },
    ...chargeablePairs.slice(0, 9).map((c) => ({
      type: 'chargeable' as const,
      client: c.client,
      jobNumber: c.jobNumber,
      key: c.key,
    })),
  ];

  function colIndexForAllocation(a: { businessType: 'admin' | 'chargeable'; client: string; jobNumber: string }): number {
    if (a.businessType === 'admin') return 0;
    if (a.businessType === 'chargeable') {
      return columns.findIndex((c) => c.type === 'chargeable' && c.key === keyOf(a));
    }
    return -1;
  }

  const daily: Record<string, { cols: { hrs: number; km: number }[]; pvte: number }> = {};
  for (const day of weekDays) {
    daily[day] = {
      cols: columns.map(() => ({ hrs: 0, km: 0 })),
      pvte: 0,
    };
  }

  // KM: from trips, by odometer — split across a trip's allocations if it has any.
  for (const t of weekTrips) {
    const km = Math.max(0, (t.mileageIn || 0) - (t.mileageOut || 0));
    if (t.category === 'private') {
      if (daily[t.date]) {
        daily[t.date].pvte += km;
      }
      continue;
    }

    if (t.splits && t.splits.length > 0) {
      for (const a of allocationsOf(t)) {
        const idx = colIndexForAllocation(a);
        if (idx === -1 || !daily[t.date]) continue;
        daily[t.date].cols[idx].km += a.amount ?? 0;
      }
    } else {
      const idx = colIndexForAllocation({
        businessType: t.businessType,
        client: t.client,
        jobNumber: t.jobNumber,
      });
      if (idx === -1 || !daily[t.date]) continue;
      daily[t.date].cols[idx].km += km;
    }
  }

  // HRS: from explicit Time On/Off sessions only — split across a session's allocations if it has any.
  for (const s of weekSessions) {
    if (!daily[s.onDate]) continue;

    if (s.splits && s.splits.length > 0) {
      for (const a of allocationsOf(s)) {
        const idx = colIndexForAllocation(a);
        if (idx === -1) continue;
        daily[s.onDate].cols[idx].hrs += a.amount ?? 0;
      }
    } else {
      const idx = colIndexForAllocation({
        businessType: s.businessType,
        client: s.client,
        jobNumber: s.jobNumber,
      });
      if (idx === -1) continue;
      const hrs = hoursBetween(s.onDate, s.onTime, s.offDate, s.offTime);
      if (hrs > 0) {
        daily[s.onDate].cols[idx].hrs += hrs;
      }
    }
  }

  // Opening/closing odometer for the week
  const weekMileageOuts = allTrips.filter((t) => weekSet.has(t.date) && t.mileageOut != null);
  const openingKm = weekMileageOuts.length ? Math.min(...weekMileageOuts.map((t) => t.mileageOut)) : null;
  const closingKm = weekTrips.length ? Math.max(...weekTrips.map((t) => t.mileageIn)) : null;

  return { columns, daily, openingKm, closingKm, overflowClients, weekDays };
}

// Helper to get anchor date for last week
export function lastWeekAnchor(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const dt = new Date(Date.UTC(y, m, d));
  dt.setUTCDate(dt.getUTCDate() - 7);
  return dt.toISOString().slice(0, 10);
}

// Helper to get anchor date for current week
export function currentWeekAnchor(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const dt = new Date(Date.UTC(y, m, d));
  return dt.toISOString().slice(0, 10);
}

// Current month string (YYYY-MM)
export function currentMonthAnchor(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// Shift month string by delta months (+1 or -1)
export function shiftMonth(monthStr: string, deltaMonths: number): string {
  const [yStr, mStr] = monthStr.split('-');
  let y = parseInt(yStr, 10);
  let m = parseInt(mStr, 10) - 1 + deltaMonths;
  const d = new Date(Date.UTC(y, m, 1));
  const newY = d.getUTCFullYear();
  const newM = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${newY}-${newM}`;
}

// Format YYYY-MM as readable English (e.g. "September 2026")
export function formatMonthLabel(monthStr: string): string {
  const [yStr, mStr] = monthStr.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10) - 1;
  const date = new Date(Date.UTC(y, m, 1));
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export interface SarsTripItem {
  id: string;
  date: string;
  timeOut: string;
  timeIn: string;
  mileageOut: number;
  mileageIn: number;
  totalKm: number;
  businessKm: number;
  privateKm: number;
  origin: string;
  destination: string;
  client: string;
  jobNumber: string;
  reason: string;
  category: 'business' | 'private';
  businessType: 'admin' | 'chargeable';
  hasOdometerGap?: boolean;
  gapKm?: number;
}

export interface MonthlySarsSummary {
  monthStr: string;
  monthLabel: string;
  trips: SarsTripItem[];
  tripCount: number;
  openingKm: number | null;
  closingKm: number | null;
  totalRecordedKm: number;
  odometerDiffKm: number;
  totalBusinessKm: number;
  totalPrivateKm: number;
  businessPercentage: number;
  gapCount: number;
  totalGapKm: number;
  missingReasonCount: number;
}

// Compute comprehensive SARS monthly trip sheet breakdown
export function computeMonthlySarsSummary(
  allTrips: Trip[],
  monthStr: string
): MonthlySarsSummary {
  // Filter for trips in this month and sort chronologically
  const monthTrips = allTrips
    .filter((t) => t.date && t.date.startsWith(monthStr))
    .slice()
    .sort((a, b) => {
      const dtA = `${a.date}T${a.timeOut || '00:00'}`;
      const dtB = `${b.date}T${b.timeOut || '00:00'}`;
      if (dtA !== dtB) return dtA.localeCompare(dtB);
      return (a.mileageOut || 0) - (b.mileageOut || 0);
    });

  let totalRecordedKm = 0;
  let totalBusinessKm = 0;
  let totalPrivateKm = 0;
  let gapCount = 0;
  let totalGapKm = 0;
  let missingReasonCount = 0;

  const items: SarsTripItem[] = [];
  let prevClosingKm: number | null = null;

  for (let i = 0; i < monthTrips.length; i++) {
    const t = monthTrips[i];
    const mOut = Number(t.mileageOut) || 0;
    const mIn = Number(t.mileageIn) || 0;
    const dist = Math.max(0, mIn - mOut);
    totalRecordedKm += dist;

    // Check odometer continuity gap with previous trip
    let hasGap = false;
    let gapKm = 0;
    if (prevClosingKm !== null && mOut > prevClosingKm) {
      hasGap = true;
      gapKm = mOut - prevClosingKm;
      gapCount++;
      totalGapKm += gapKm;
    }
    prevClosingKm = mIn;

    // Business vs Private
    let bKm = 0;
    let pKm = 0;
    if (t.category === 'private') {
      pKm = dist;
    } else {
      bKm = dist;
    }
    totalBusinessKm += bKm;
    totalPrivateKm += pKm;

    // Resolve Origin & Destination
    const origin = t.origin || 'Depot / Office';
    const destination =
      t.destination ||
      (t.category === 'private'
        ? 'Personal'
        : t.client
        ? `${t.client} Site`
        : 'Operations Depot');

    // Reason for business travel (SARS requires specific description)
    let reason = t.notes?.trim() || '';
    if (!reason) {
      if (t.category === 'private') {
        reason = 'Private / Personal travel';
      } else if (t.businessType === 'admin') {
        reason = 'Depot dispatch, logistics & administration';
      } else {
        reason = t.client ? `On-site work & delivery for ${t.client}` : 'Client technical service';
      }
    }

    if (t.category === 'business' && (!t.notes || t.notes.trim().length === 0)) {
      missingReasonCount++;
    }

    items.push({
      id: t.id,
      date: t.date,
      timeOut: t.timeOut || '',
      timeIn: t.timeIn || '',
      mileageOut: mOut,
      mileageIn: mIn,
      totalKm: dist,
      businessKm: bKm,
      privateKm: pKm,
      origin,
      destination,
      client: t.category === 'private' ? 'Private' : t.client || 'Admin',
      jobNumber: t.jobNumber || '-',
      reason,
      category: t.category,
      businessType: t.businessType || 'chargeable',
      hasOdometerGap: hasGap,
      gapKm,
    });
  }

  const openingKm = items.length > 0 ? items[0].mileageOut : null;
  const closingKm = items.length > 0 ? items[items.length - 1].mileageIn : null;
  const odometerDiffKm =
    openingKm !== null && closingKm !== null ? Math.max(0, closingKm - openingKm) : totalRecordedKm;

  const businessPercentage =
    totalRecordedKm > 0 ? (totalBusinessKm / totalRecordedKm) * 100 : 0;

  return {
    monthStr,
    monthLabel: formatMonthLabel(monthStr),
    trips: items,
    tripCount: items.length,
    openingKm,
    closingKm,
    totalRecordedKm,
    odometerDiffKm,
    totalBusinessKm,
    totalPrivateKm,
    businessPercentage,
    gapCount,
    totalGapKm,
    missingReasonCount,
  };
}
