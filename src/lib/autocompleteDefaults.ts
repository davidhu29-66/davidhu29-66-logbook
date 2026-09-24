import { Trip, WorkSession, UserSettings } from '../types';

export const DEFAULT_CLIENT_SUGGESTIONS: string[] = [
  'Standard Bank (SBSA)',
  'Nedbank',
  'Absa Bank',
  'First National Bank (FNB)',
  'Vodacom',
  'MTN',
  'City of Cape Town',
  'Eskom',
  'UWC Main Campus',
  'Artscape Theatre Centre',
  'Tru Cape Fruit Marketing',
  'Century City CCPOA',
  'Admin',
];

export const DEFAULT_JOB_SUGGESTIONS: string[] = [
  'J-2024-001',
  'J-2024-002',
  'J-2024-088',
  'WO-4481',
  'WO-5510',
  'MAINT-01',
  'INSP-2024',
  'SHOP-ADMIN',
];

export const DEFAULT_SITE_SUGGESTIONS: string[] = [
  'Home / Residence',
  'Depot / Main Office',
  'UWC Main Campus, Bellville',
  'SBSA Caledon Branch',
  'SBSA Hermanus Branch',
  'Nedbank Foreshore, Cape Town',
  'Absa Century City',
  'Paarl Substation',
  'Tygerberg Hospital',
  'SBM-LBN Depot, Langebaan',
  'Artscape Theatre Centre, Foreshore',
  'Century City CCPOA',
  'Cape Town CBD Office',
];

/**
 * Returns a deduplicated, clean list of all clients available from settings,
 * existing logged trips, sessions, and curated suggestions.
 */
export function getClientOptions(
  settings?: UserSettings | null,
  trips: Trip[] = [],
  sessions: WorkSession[] = []
): string[] {
  const set = new Set<string>();

  // 1. User configured presets in Settings
  if (settings?.clients && Array.isArray(settings.clients)) {
    settings.clients.forEach((c) => {
      const trimmed = c.trim();
      if (trimmed) set.add(trimmed);
    });
  }

  // 2. Previously logged trips
  trips.forEach((t) => {
    if (t.client && t.client.trim()) set.add(t.client.trim());
    if (t.splits) {
      t.splits.forEach((sp) => {
        if (sp.client && sp.client.trim()) set.add(sp.client.trim());
      });
    }
  });

  // 3. Previously logged sessions
  sessions.forEach((s) => {
    if (s.client && s.client.trim()) set.add(s.client.trim());
    if (s.splits) {
      s.splits.forEach((sp) => {
        if (sp.client && sp.client.trim()) set.add(sp.client.trim());
      });
    }
  });

  // 4. Default suggestions if pool has few entries
  DEFAULT_CLIENT_SUGGESTIONS.forEach((c) => set.add(c));

  return Array.from(set);
}

/**
 * Returns a deduplicated list of all job numbers from settings,
 * trips, sessions, and curated suggestions.
 */
export function getJobNumberOptions(
  settings?: UserSettings | null,
  trips: Trip[] = [],
  sessions: WorkSession[] = []
): string[] {
  const set = new Set<string>();

  if (settings?.jobNumbers && Array.isArray(settings.jobNumbers)) {
    settings.jobNumbers.forEach((j) => {
      const trimmed = j.trim();
      if (trimmed) set.add(trimmed);
    });
  }

  trips.forEach((t) => {
    if (t.jobNumber && t.jobNumber.trim()) set.add(t.jobNumber.trim());
    if (t.splits) {
      t.splits.forEach((sp) => {
        if (sp.jobNumber && sp.jobNumber.trim()) set.add(sp.jobNumber.trim());
      });
    }
  });

  sessions.forEach((s) => {
    if (s.jobNumber && s.jobNumber.trim()) set.add(s.jobNumber.trim());
    if (s.splits) {
      s.splits.forEach((sp) => {
        if (sp.jobNumber && sp.jobNumber.trim()) set.add(sp.jobNumber.trim());
      });
    }
  });

  DEFAULT_JOB_SUGGESTIONS.forEach((j) => set.add(j));

  return Array.from(set);
}

/**
 * Returns a deduplicated list of all work sites and destinations from settings,
 * trips (origin & destination), and curated common sites.
 */
export function getSiteOptions(
  settings?: UserSettings | null,
  trips: Trip[] = []
): string[] {
  const set = new Set<string>();

  if (settings?.sites && Array.isArray(settings.sites)) {
    settings.sites.forEach((s) => {
      const trimmed = s.trim();
      if (trimmed) set.add(trimmed);
    });
  }

  if (settings?.region && settings.region.trim()) {
    set.add(settings.region.trim());
  }

  trips.forEach((t) => {
    if (t.origin && t.origin.trim()) set.add(t.origin.trim());
    if (t.destination && t.destination.trim()) set.add(t.destination.trim());
  });

  DEFAULT_SITE_SUGGESTIONS.forEach((s) => set.add(s));

  return Array.from(set);
}

/**
 * Returns a deduplicated list of vehicle names/registrations from settings and trips.
 */
export function getVehicleOptions(
  settings?: UserSettings | null,
  trips: Trip[] = []
): string[] {
  const set = new Set<string>();

  if (settings?.vehicleName && settings.vehicleRego) {
    set.add(`${settings.vehicleName} (${settings.vehicleRego})`);
  }
  if (settings?.vehicleName && settings.vehicleName.trim()) {
    set.add(settings.vehicleName.trim());
  }
  if (settings?.vehicleRego && settings.vehicleRego.trim()) {
    set.add(settings.vehicleRego.trim());
  }

  trips.forEach((t) => {
    if (t.vehicle && t.vehicle.trim()) set.add(t.vehicle.trim());
  });

  return Array.from(set);
}
