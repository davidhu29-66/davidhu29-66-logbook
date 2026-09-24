import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  updateProfile,
  signOut,
  onAuthStateChanged,
  User,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  onSnapshot,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Trip, WorkSession, UserSettings } from '../types';

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const FIREBASE_AUTH_DOMAIN = firebaseConfig.authDomain;
export const FIREBASE_AUTHORIZED_DOMAINS_URL = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`;

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp({
    apiKey: firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId,
  });
} else {
  app = getApp();
}

export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore with specific database ID if provided, otherwise default
export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Helper to save or update user doc in Firestore
async function recordUserProfile(user: User, customName?: string) {
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(
      userRef,
      {
        id: user.uid,
        email: user.email || '',
        displayName: customName || user.displayName || (user.isAnonymous ? 'Guest Driver' : 'User'),
        photoURL: user.photoURL || '',
        isAnonymous: Boolean(user.isAnonymous),
        lastLoginAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Could not record user profile to Firestore:', err);
  }
}

// Authentication helpers
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user) {
      await recordUserProfile(result.user);
    }
    return result.user;
  } catch (error: any) {
    console.error('Firebase Google Sign-in error:', error);
    throw error;
  }
}

export async function signInWithEmail(email: string, pass: string): Promise<User> {
  try {
    const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
    if (result.user) {
      await recordUserProfile(result.user);
    }
    return result.user;
  } catch (error: any) {
    console.error('Firebase Email sign-in error:', error);
    throw error;
  }
}

export async function signUpWithEmail(email: string, pass: string, displayName?: string): Promise<User> {
  try {
    const result = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (result.user) {
      if (displayName) {
        await updateProfile(result.user, { displayName });
      }
      await recordUserProfile(result.user, displayName);
    }
    return result.user;
  } catch (error: any) {
    console.error('Firebase Email sign-up error:', error);
    throw error;
  }
}

export async function signInAsGuest(): Promise<User> {
  try {
    const result = await signInAnonymously(auth);
    if (result.user) {
      await recordUserProfile(result.user, 'Guest Driver');
    }
    return result.user;
  } catch (error: any) {
    console.error('Firebase Anonymous sign-in error:', error);
    throw error;
  }
}

export function isUnauthorizedDomainError(error: any): boolean {
  if (!error) return false;
  const code = error.code || '';
  const message = error.message || '';
  return code === 'auth/unauthorized-domain' || message.includes('unauthorized-domain');
}

export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Firebase sign out error:', error);
    throw error;
  }
}

export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

// Firestore Persistence helpers
export async function loadUserDataFromFirestore(userId: string): Promise<{
  trips: Trip[];
  sessions: WorkSession[];
  settings: UserSettings | null;
}> {
  try {
    // 1. Load Trips
    const tripsColl = collection(db, 'users', userId, 'trips');
    const tripsSnap = await getDocs(tripsColl);
    const trips: Trip[] = [];
    tripsSnap.forEach((docSnap) => {
      trips.push(docSnap.data() as Trip);
    });

    // 2. Load Work Sessions
    const sessionsColl = collection(db, 'users', userId, 'sessions');
    const sessionsSnap = await getDocs(sessionsColl);
    const sessions: WorkSession[] = [];
    sessionsSnap.forEach((docSnap) => {
      sessions.push(docSnap.data() as WorkSession);
    });

    // 3. Load Settings
    const settingsDocRef = doc(db, 'users', userId, 'settings', 'config');
    const settingsSnap = await getDoc(settingsDocRef);
    const settings = settingsSnap.exists() ? (settingsSnap.data() as UserSettings) : null;

    return { trips, sessions, settings };
  } catch (err) {
    console.error('Error loading data from Firestore:', err);
    return { trips: [], sessions: [], settings: null };
  }
}

export async function saveTripToFirestore(userId: string, trip: Trip): Promise<void> {
  try {
    const tripRef = doc(db, 'users', userId, 'trips', trip.id);
    await setDoc(tripRef, trip, { merge: true });
  } catch (err) {
    console.error('Error saving trip to Firestore:', err);
  }
}

export async function deleteTripFromFirestore(userId: string, tripId: string): Promise<void> {
  try {
    const tripRef = doc(db, 'users', userId, 'trips', tripId);
    await deleteDoc(tripRef);
  } catch (err) {
    console.error('Error deleting trip from Firestore:', err);
  }
}

export async function syncAllTripsToFirestore(userId: string, trips: Trip[]): Promise<void> {
  try {
    // Get existing to delete removed ones
    const tripsColl = collection(db, 'users', userId, 'trips');
    const existing = await getDocs(tripsColl);
    const batch = writeBatch(db);

    const tripIds = new Set(trips.map((t) => t.id));
    existing.forEach((docSnap) => {
      if (!tripIds.has(docSnap.id)) {
        batch.delete(docSnap.ref);
      }
    });

    for (const trip of trips) {
      const tripRef = doc(db, 'users', userId, 'trips', trip.id);
      batch.set(tripRef, trip, { merge: true });
    }

    await batch.commit();
  } catch (err) {
    console.error('Error syncing trips to Firestore:', err);
  }
}

export async function saveSessionToFirestore(userId: string, session: WorkSession): Promise<void> {
  try {
    const sessionRef = doc(db, 'users', userId, 'sessions', session.id);
    await setDoc(sessionRef, session, { merge: true });
  } catch (err) {
    console.error('Error saving session to Firestore:', err);
  }
}

export async function deleteSessionFromFirestore(userId: string, sessionId: string): Promise<void> {
  try {
    const sessionRef = doc(db, 'users', userId, 'sessions', sessionId);
    await deleteDoc(sessionRef);
  } catch (err) {
    console.error('Error deleting session from Firestore:', err);
  }
}

export async function syncAllSessionsToFirestore(userId: string, sessions: WorkSession[]): Promise<void> {
  try {
    const sessionsColl = collection(db, 'users', userId, 'sessions');
    const existing = await getDocs(sessionsColl);
    const batch = writeBatch(db);

    const sessionIds = new Set(sessions.map((s) => s.id));
    existing.forEach((docSnap) => {
      if (!sessionIds.has(docSnap.id)) {
        batch.delete(docSnap.ref);
      }
    });

    for (const session of sessions) {
      const sessionRef = doc(db, 'users', userId, 'sessions', session.id);
      batch.set(sessionRef, session, { merge: true });
    }

    await batch.commit();
  } catch (err) {
    console.error('Error syncing sessions to Firestore:', err);
  }
}

export async function saveSettingsToFirestore(userId: string, settings: UserSettings): Promise<void> {
  try {
    const settingsDocRef = doc(db, 'users', userId, 'settings', 'config');
    await setDoc(settingsDocRef, settings, { merge: true });
  } catch (err) {
    console.error('Error saving settings to Firestore:', err);
  }
}

export async function clearFirestoreUserData(userId: string, clearSettings: boolean = false): Promise<void> {
  try {
    // Delete all trips
    const tripsColl = collection(db, 'users', userId, 'trips');
    const tripsSnap = await getDocs(tripsColl);
    const batch = writeBatch(db);
    tripsSnap.forEach((d) => batch.delete(d.ref));

    // Delete all sessions
    const sessionsColl = collection(db, 'users', userId, 'sessions');
    const sessionsSnap = await getDocs(sessionsColl);
    sessionsSnap.forEach((d) => batch.delete(d.ref));

    if (clearSettings) {
      const settingsRef = doc(db, 'users', userId, 'settings', 'config');
      batch.delete(settingsRef);
    }

    await batch.commit();
  } catch (err) {
    console.error('Error clearing Firestore user data:', err);
  }
}
