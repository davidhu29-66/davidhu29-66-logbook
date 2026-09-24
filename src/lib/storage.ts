import { Trip, WorkSession, UserSettings } from '../types';

const STORAGE_KEYS = {
  TRIPS: 'mileage_logbook_trips_v1',
  SESSIONS: 'mileage_logbook_sessions_v1',
  SETTINGS: 'mileage_logbook_settings_v1',
  ACTIVE_SESSION: 'mileage_logbook_active_session_v1',
  ACTIVE_TRIP: 'mileage_logbook_active_trip_v1',
  CLEAN_SLATE_V3: 'mileage_logbook_clean_slate_technician_v3',
};

export const DEFAULT_SETTINGS: UserSettings = {
  driverName: '',
  region: '',
  vehicleRego: '',
  vehicleName: '',
  currentOdometer: 0,
  taxReferenceNo: '',
  idNumber: '',
  vehicleCostPrice: undefined,
  employerName: '',
  baseAddress: '',
  clients: [],
  jobNumbers: [],
  sites: [],
};

// Initialize default settings if not set
function checkAndApplyCleanSlateMigration(): void {
  try {
    const isMigrated = localStorage.getItem(STORAGE_KEYS.CLEAN_SLATE_V3) === 'true';
    if (!isMigrated) {
      const rawSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!rawSettings) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      }
      localStorage.setItem(STORAGE_KEYS.CLEAN_SLATE_V3, 'true');
    }
  } catch (err) {
    console.error('Error applying initialization check:', err);
  }
}

// Storage helpers - Clean slate with no default trips, sessions, or vehicles
export function loadTrips(): Trip[] {
  try {
    checkAndApplyCleanSlateMigration();
    const raw = localStorage.getItem(STORAGE_KEYS.TRIPS);
    if (raw !== null) {
      return JSON.parse(raw);
    }
    return [];
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
    checkAndApplyCleanSlateMigration();
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (raw !== null) {
      return JSON.parse(raw);
    }
    return [];
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
    checkAndApplyCleanSlateMigration();
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      saveSettings(DEFAULT_SETTINGS);
      return { ...DEFAULT_SETTINGS };
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Error loading settings from storage:', err);
    return { ...DEFAULT_SETTINGS };
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

// Reset data to clean slate
export function resetToSampleData(): { trips: Trip[]; sessions: WorkSession[]; settings: UserSettings } {
  saveTrips([]);
  saveSessions([]);
  saveSettings(DEFAULT_SETTINGS);
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_TRIP);
  return {
    trips: [],
    sessions: [],
    settings: DEFAULT_SETTINGS,
  };
}

// Clear all logged trips (leaves settings and work sessions intact)
export function clearAllTrips(): void {
  saveTrips([]);
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_TRIP);
}

// Wipe entire database (trips, sessions, and active tracking)
export function clearEntireDatabase(keepSettings: boolean = false): {
  trips: Trip[];
  sessions: WorkSession[];
  settings: UserSettings;
} {
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

  return {
    totalCount: mergedTrips.length,
    newAdded,
  };
}

export function clearAllData(): void {
  saveTrips([]);
  saveSessions([]);
  saveSettings(DEFAULT_SETTINGS);
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_TRIP);
}
