import { Trip, WorkSession, UserSettings } from '../types';
import { currentWeekAnchor, weekRange } from './timesheetLogic';
import { getDefaultUserTrips } from './csvParser';

const STORAGE_KEYS = {
  TRIPS: 'mileage_logbook_trips_v1',
  SESSIONS: 'mileage_logbook_sessions_v1',
  SETTINGS: 'mileage_logbook_settings_v1',
  ACTIVE_SESSION: 'mileage_logbook_active_session_v1',
  ACTIVE_TRIP: 'mileage_logbook_active_trip_v1',
  INITIALIZED_V2: 'mileage_logbook_initialized_v2',
  DATABASE_CLEARED: 'mileage_logbook_cleared_clean_slate_v1',
};

export const DEFAULT_SETTINGS: UserSettings = {
  driverName: 'David Hu',
  region: 'Western Cape Operations',
  vehicleRego: 'CA 842-195',
  vehicleName: 'Toyota Hilux 4x4',
  currentOdometer: 437884,
  taxReferenceNo: '9482716304',
  idNumber: '8804125089083',
  vehicleCostPrice: 385000,
  employerName: 'Field Operations Pty Ltd',
  clients: ['Artscape', 'CCPOA', 'Eskom', 'SBM', 'SBSA', 'Tru Cape', 'Unisa', 'Uwc'],
  jobNumbers: ['74120', '74125', '78100', '78253', '78769', '78903', '78912', '78957', '78959', '80002'],
};

// Seed realistic test data from the user's authentic trips and generate matching work sessions
export function createSampleData(): { trips: Trip[]; sessions: WorkSession[]; settings: UserSettings } {
  const userTrips = getDefaultUserTrips();

  // Create corresponding work sessions based on chargeable trips
  const sessions: WorkSession[] = [
    {
      id: 'sess-gen-1',
      onDate: '2026-07-20',
      onTime: '10:15',
      offDate: '2026-07-20',
      offTime: '16:11',
      category: 'business',
      businessType: 'chargeable',
      client: 'Uwc',
      jobNumber: '78253',
      notes: 'Head end maintenance 6hrs on-site 11km',
      status: 'completed',
    },
    {
      id: 'sess-gen-2',
      onDate: '2026-07-31',
      onTime: '14:00',
      offDate: '2026-07-31',
      offTime: '15:13',
      category: 'business',
      businessType: 'chargeable',
      client: 'SBSA',
      jobNumber: '78912',
      notes: 'Atm que IP Encoder and screen maintenance',
      status: 'completed',
    },
    {
      id: 'sess-gen-3',
      onDate: '2026-08-03',
      onTime: '13:18',
      offDate: '2026-08-03',
      offTime: '18:25',
      category: 'business',
      businessType: 'chargeable',
      client: 'SBSA',
      jobNumber: '78903',
      notes: 'Review pc slow on playback & network failure investigation',
      status: 'completed',
    },
    {
      id: 'sess-gen-4',
      onDate: '2026-08-04',
      onTime: '09:33',
      offDate: '2026-08-04',
      offTime: '17:17',
      category: 'business',
      businessType: 'chargeable',
      client: 'SBSA',
      jobNumber: '78903',
      notes: 'Restructure of network topology and failover test',
      status: 'completed',
    },
    {
      id: 'sess-gen-5',
      onDate: '2026-08-05',
      onTime: '11:47',
      offDate: '2026-08-05',
      offTime: '14:29',
      category: 'business',
      businessType: 'chargeable',
      client: 'SBM',
      jobNumber: '74125',
      notes: 'Depot Installation and rack mount configuration',
      status: 'completed',
    },
    {
      id: 'sess-gen-6',
      onDate: '2026-08-18',
      onTime: '08:43',
      offDate: '2026-08-18',
      offTime: '16:31',
      category: 'business',
      businessType: 'chargeable',
      client: 'Tru Cape',
      jobNumber: '78959',
      notes: 'Install 4 cables, CCTV Repair, system restored, signed off',
      status: 'completed',
    },
    {
      id: 'sess-gen-7',
      onDate: '2026-08-26',
      onTime: '12:35',
      offDate: '2026-08-26',
      offTime: '13:44',
      category: 'business',
      businessType: 'chargeable',
      client: 'Artscape',
      jobNumber: '78769',
      notes: 'Site survey and stage access control inspection',
      status: 'completed',
    },
    {
      id: 'sess-gen-8',
      onDate: '2026-08-27',
      onTime: '09:51',
      offDate: '2026-08-27',
      offTime: '15:29',
      category: 'business',
      businessType: 'chargeable',
      client: 'Artscape',
      jobNumber: '78769',
      notes: 'Access Control system commission and door strikes',
      status: 'completed',
    },
    {
      id: 'sess-gen-9',
      onDate: '2026-09-03',
      onTime: '11:00',
      offDate: '2026-09-03',
      offTime: '15:24',
      category: 'business',
      businessType: 'chargeable',
      client: 'Eskom',
      jobNumber: '78100',
      notes: 'NuGen Site Inspection and high-voltage perimeter check',
      status: 'completed',
    },
    {
      id: 'sess-gen-10',
      onDate: '2026-09-10',
      onTime: '08:27',
      offDate: '2026-09-10',
      offTime: '15:30',
      category: 'business',
      businessType: 'chargeable',
      client: 'Eskom',
      jobNumber: '78100',
      notes: 'Substation security automation and communications alignment',
      status: 'completed',
    },
  ];

  const settings: UserSettings = {
    ...DEFAULT_SETTINGS,
    currentOdometer: 437884,
  };

  return { trips: userTrips, sessions, settings };
}

// Storage helpers
export function loadTrips(): Trip[] {
  try {
    const isCleared = localStorage.getItem(STORAGE_KEYS.DATABASE_CLEARED) === 'true';
    const raw = localStorage.getItem(STORAGE_KEYS.TRIPS);

    if (isCleared) {
      return raw ? JSON.parse(raw) : [];
    }

    if (raw !== null) {
      return JSON.parse(raw);
    }

    const isInitialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED_V2);
    if (isInitialized) {
      return [];
    }

    // First time launch initial seed
    const userTrips = getDefaultUserTrips();
    saveTrips(userTrips);
    localStorage.setItem(STORAGE_KEYS.INITIALIZED_V2, 'true');
    return userTrips;
  } catch (err) {
    console.error('Error loading trips from storage:', err);
    return [];
  }
}

export function saveTrips(trips: Trip[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips));
  } catch (err) {
    console.error('Error saving trips to storage:', err);
  }
}

export function loadSessions(): WorkSession[] {
  try {
    const isCleared = localStorage.getItem(STORAGE_KEYS.DATABASE_CLEARED) === 'true';
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);

    if (isCleared) {
      return raw ? JSON.parse(raw) : [];
    }

    if (raw !== null) {
      return JSON.parse(raw);
    }

    const isInitialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED_V2);
    if (isInitialized) {
      return [];
    }

    const sample = createSampleData();
    saveSessions(sample.sessions);
    localStorage.setItem(STORAGE_KEYS.INITIALIZED_V2, 'true');
    return sample.sessions;
  } catch (err) {
    console.error('Error loading sessions from storage:', err);
    return [];
  }
}

export function saveSessions(sessions: WorkSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  } catch (err) {
    console.error('Error saving sessions to storage:', err);
  }
}

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      const sample = createSampleData();
      saveSettings(sample.settings);
      return sample.settings;
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Error loading settings from storage:', err);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving settings to storage:', err);
  }
}

// Aliases
export const loadWorkSessions = loadSessions;
export const saveWorkSessions = saveSessions;
export const loadUserSettings = loadSettings;
export const saveUserSettings = saveSettings;

// Active session storage
export function loadActiveSession(): WorkSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Error loading active session:', err);
    return null;
  }
}

export function saveActiveSession(session: WorkSession | null): void {
  try {
    if (session) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
    }
  } catch (err) {
    console.error('Error saving active session:', err);
  }
}

// Active trip storage
export function loadActiveTrip(): Trip | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_TRIP);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Error loading active trip:', err);
    return null;
  }
}

export function saveActiveTrip(trip: Trip | null): void {
  try {
    if (trip) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TRIP, JSON.stringify(trip));
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_TRIP);
    }
  } catch (err) {
    console.error('Error saving active trip:', err);
  }
}

// Reset data to sample set
export function resetToSampleData(): { trips: Trip[]; sessions: WorkSession[]; settings: UserSettings } {
  localStorage.removeItem(STORAGE_KEYS.DATABASE_CLEARED);
  localStorage.setItem(STORAGE_KEYS.INITIALIZED_V2, 'true');
  const userTrips = getDefaultUserTrips();
  const sample = createSampleData();
  saveTrips(userTrips);
  saveSessions(sample.sessions);
  saveSettings(sample.settings);
  return {
    trips: userTrips,
    sessions: sample.sessions,
    settings: sample.settings,
  };
}

// Clear all logged trips (leaves settings and work sessions intact)
export function clearAllTrips(): void {
  localStorage.setItem(STORAGE_KEYS.DATABASE_CLEARED, 'true');
  localStorage.setItem(STORAGE_KEYS.INITIALIZED_V2, 'true');
  saveTrips([]);
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_TRIP);
}

// Wipe entire database (trips, sessions, and active tracking)
export function clearEntireDatabase(keepSettings: boolean = false): {
  trips: Trip[];
  sessions: WorkSession[];
  settings: UserSettings;
} {
  localStorage.setItem(STORAGE_KEYS.DATABASE_CLEARED, 'true');
  localStorage.setItem(STORAGE_KEYS.INITIALIZED_V2, 'true');
  saveTrips([]);
  saveSessions([]);
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_TRIP);

  let updatedSettings: UserSettings;
  if (keepSettings) {
    const current = loadSettings();
    updatedSettings = {
      ...current,
      currentOdometer: 0,
    };
    saveSettings(updatedSettings);
  } else {
    updatedSettings = {
      ...DEFAULT_SETTINGS,
      currentOdometer: 0,
      clients: [],
      jobNumbers: [],
    };
    saveSettings(updatedSettings);
  }

  return {
    trips: [],
    sessions: [],
    settings: updatedSettings,
  };
}

export function importCsvTripsIntoStorage(
  parsedTrips: Trip[],
  uniqueClients: string[],
  uniqueJobNumbers: string[],
  mode: 'merge' | 'replace'
): { totalCount: number; newAdded: number } {
  const currentTrips = mode === 'replace' ? [] : loadTrips();
  const currentSettings = loadSettings();

  if (mode === 'replace') {
    localStorage.removeItem(STORAGE_KEYS.DATABASE_CLEARED);
  }

  const existingKeys = new Set(
    currentTrips.map((t) => `${t.date}_${t.timeOut}_${t.mileageOut}_${t.mileageIn}_${(t.destination || '').toLowerCase()}`)
  );

  let newAdded = 0;
  const mergedTrips = [...currentTrips];

  for (const trip of parsedTrips) {
    const key = `${trip.date}_${trip.timeOut}_${trip.mileageOut}_${trip.mileageIn}_${(trip.destination || '').toLowerCase()}`;
    if (!existingKeys.has(key)) {
      existingKeys.add(key);
      mergedTrips.push(trip);
      newAdded++;
    }
  }

  // Sort chronologically
  mergedTrips.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.timeOut.localeCompare(b.timeOut);
  });

  saveTrips(mergedTrips);

  // Update clients & job numbers in settings if new ones found
  const clientSet = new Set([...currentSettings.clients, ...uniqueClients]);
  const jobSet = new Set([...currentSettings.jobNumbers, ...uniqueJobNumbers]);
  const maxOdo = Math.max(currentSettings.currentOdometer, ...mergedTrips.map((t) => t.mileageIn));

  saveSettings({
    ...currentSettings,
    clients: Array.from(clientSet).sort(),
    jobNumbers: Array.from(jobSet).sort(),
    currentOdometer: maxOdo,
  });

  localStorage.setItem(STORAGE_KEYS.INITIALIZED_V2, 'true');

  return {
    totalCount: mergedTrips.length,
    newAdded,
  };
}

export function clearAllData(): void {
  localStorage.setItem(STORAGE_KEYS.DATABASE_CLEARED, 'true');
  localStorage.setItem(STORAGE_KEYS.INITIALIZED_V2, 'true');
  saveTrips([]);
  saveSessions([]);
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_TRIP);
}
