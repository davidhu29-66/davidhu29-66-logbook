import React, { useState, useEffect } from 'react';
import { Trip, WorkSession, UserSettings, ActivityCategory, BusinessType } from './types';
import {
  loadTrips,
  saveTrips,
  loadWorkSessions,
  saveWorkSessions,
  loadUserSettings,
  saveUserSettings,
  loadActiveSession,
  saveActiveSession,
  loadActiveTrip,
  saveActiveTrip,
  resetToSampleData,
  clearAllTrips,
  clearEntireDatabase,
} from './lib/storage';
import { Layout } from './components/Layout';
import { DashboardView } from './components/DashboardView';
import { TripsView } from './components/TripsView';
import { TimeSessionsView } from './components/TimeSessionsView';
import { TimesheetView } from './components/TimesheetView';
import { SarsLogbookView } from './components/SarsLogbookView';
import { AnalyticsView } from './components/AnalyticsView';
import { SettingsView } from './components/SettingsView';
import { MapsGroundingView } from './components/MapsGroundingView';
import { GeminiChatView } from './components/GeminiChatView';
import { DataImportModal } from './components/DataImportModal';
import { TripModal } from './components/TripModal';
import { SessionModal } from './components/SessionModal';
import { ConfirmModal, ConfirmModalProps } from './components/ConfirmModal';
import { AuthModal } from './components/AuthModal';
import {
  signInWithGoogle,
  signOutUser,
  subscribeToAuth,
  loadUserDataFromFirestore,
  saveTripToFirestore,
  deleteTripFromFirestore,
  syncAllTripsToFirestore,
  saveSessionToFirestore,
  deleteSessionFromFirestore,
  syncAllSessionsToFirestore,
  saveSettingsToFirestore,
  clearFirestoreUserData,
} from './lib/firebase';
import { User } from 'firebase/auth';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [trips, setTrips] = useState<Trip[]>(loadTrips);
  const [sessions, setSessions] = useState<WorkSession[]>(loadWorkSessions);
  const [settings, setSettings] = useState<UserSettings>(loadUserSettings);
  const [activeSession, setActiveSessionState] = useState<WorkSession | null>(loadActiveSession);
  const [activeTrip, setActiveTripState] = useState<Trip | null>(loadActiveTrip);

  // Firebase Auth & Cloud Sync state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  // In-app confirmation modal state (replaces window.confirm which is blocked in iframes)
  const [confirmModal, setConfirmModal] = useState<Omit<ConfirmModalProps, 'isOpen' | 'onCancel'> | null>(null);

  // Timer ticker
  const [timerElapsedText, setTimerElapsedText] = useState('00:00:00');

  // Modals state
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [tripDefaultCat, setTripDefaultCat] = useState<ActivityCategory>('business');
  const [tripDefaultBiz, setTripDefaultBiz] = useState<BusinessType>('chargeable');

  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<WorkSession | null>(null);
  const [sessionDefaultCat, setSessionDefaultCat] = useState<ActivityCategory>('business');
  const [sessionDefaultBiz, setSessionDefaultBiz] = useState<BusinessType>('chargeable');

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialError, setAuthModalInitialError] = useState<string | null>(null);

  const handleOpenAuthModal = (err?: string) => {
    setAuthModalInitialError(err || null);
    setIsAuthModalOpen(true);
  };

  // Firebase Auth Subscription and Cloud Data Sync
  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (user) => {
      setCurrentUser(user);
      if (user) {
        setCloudSyncStatus('syncing');
        try {
          const cloudData = await loadUserDataFromFirestore(user.uid);
          const hasCloudData = cloudData.trips.length > 0 || cloudData.sessions.length > 0 || cloudData.settings !== null;

          if (hasCloudData) {
            if (cloudData.trips.length > 0) {
              setTrips(cloudData.trips);
              saveTrips(cloudData.trips);
            }
            if (cloudData.sessions.length > 0) {
              setSessions(cloudData.sessions);
              saveWorkSessions(cloudData.sessions);
            }
            if (cloudData.settings) {
              setSettings(cloudData.settings);
              saveUserSettings(cloudData.settings);
            }
          } else {
            // First time login with local data: push to Firestore
            const localTrips = loadTrips();
            const localSessions = loadWorkSessions();
            const localSettings = loadUserSettings();
            if (localTrips.length > 0) {
              await syncAllTripsToFirestore(user.uid, localTrips);
            }
            if (localSessions.length > 0) {
              await syncAllSessionsToFirestore(user.uid, localSessions);
            }
            await saveSettingsToFirestore(user.uid, localSettings);
          }
          setCloudSyncStatus('synced');
        } catch (err) {
          console.error('Firestore sync error on login:', err);
          setCloudSyncStatus('error');
        }
      } else {
        setCloudSyncStatus('idle');
      }
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = () => {
    handleOpenAuthModal();
  };

  const handleGoogleSignOut = async () => {
    try {
      await signOutUser();
      setCloudSyncStatus('idle');
    } catch (err) {
      console.error('Sign-out failed:', err);
    }
  };

  const handleManualSyncCloud = async () => {
    if (!currentUser) return;
    setCloudSyncStatus('syncing');
    try {
      await syncAllTripsToFirestore(currentUser.uid, trips);
      await syncAllSessionsToFirestore(currentUser.uid, sessions);
      await saveSettingsToFirestore(currentUser.uid, settings);
      setCloudSyncStatus('synced');
    } catch (err) {
      console.error('Manual sync failed:', err);
      setCloudSyncStatus('error');
    }
  };

  // Live timer interval calculation
  useEffect(() => {
    if (!activeSession) {
      setTimerElapsedText('00:00:00');
      return;
    }

    const updateTimer = () => {
      const startIso = `${activeSession.onDate}T${activeSession.onTime}:00`;
      const startTime = new Date(startIso).getTime();
      const now = Date.now();
      const diffMs = Math.max(0, now - startTime);

      const totalSec = Math.floor(diffMs / 1000);
      const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
      const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
      const s = String(totalSec % 60).padStart(2, '0');

      setTimerElapsedText(`${h}:${m}:${s}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // Persist state changes
  const handleSaveTrip = (newTrip: Trip) => {
    let nextTrips: Trip[];
    if (editingTrip) {
      nextTrips = trips.map((t) => (t.id === newTrip.id ? newTrip : t));
    } else {
      nextTrips = [newTrip, ...trips];
    }
    setTrips(nextTrips);
    saveTrips(nextTrips);

    // Sync to Firestore if authenticated
    if (currentUser) {
      saveTripToFirestore(currentUser.uid, newTrip);
    }

    // Update current odometer baseline if this trip finished higher
    if (newTrip.mileageIn && newTrip.mileageIn > (settings.currentOdometer || 0)) {
      const updatedSettings = { ...settings, currentOdometer: newTrip.mileageIn };
      setSettings(updatedSettings);
      saveUserSettings(updatedSettings);
      if (currentUser) {
        saveSettingsToFirestore(currentUser.uid, updatedSettings);
      }
    }

    if (activeTrip && activeTrip.id === newTrip.id) {
      setActiveTripState(null);
      saveActiveTrip(null);
    }
  };

  const handleDeleteTrip = (id: string) => {
    setConfirmModal({
      title: 'Delete Trip Record',
      message: 'Are you sure you want to delete this trip record? This action will remove the record from your logbook.',
      confirmLabel: 'Delete Trip',
      variant: 'danger',
      onConfirm: () => {
        const nextTrips = trips.filter((t) => t.id !== id);
        setTrips(nextTrips);
        saveTrips(nextTrips);
        if (currentUser) {
          deleteTripFromFirestore(currentUser.uid, id);
        }
        setConfirmModal(null);
      },
    });
  };

  const handleSaveSession = (newSession: WorkSession) => {
    let nextSessions: WorkSession[];
    if (editingSession) {
      nextSessions = sessions.map((s) => (s.id === newSession.id ? newSession : s));
    } else {
      nextSessions = [newSession, ...sessions];
    }
    setSessions(nextSessions);
    saveWorkSessions(nextSessions);

    if (currentUser) {
      saveSessionToFirestore(currentUser.uid, newSession);
    }

    if (activeSession && activeSession.id === newSession.id) {
      setActiveSessionState(null);
      saveActiveSession(null);
    }
  };

  const handleDeleteSession = (id: string) => {
    setConfirmModal({
      title: 'Delete Work Session',
      message: 'Are you sure you want to delete this work session? This action will remove the timesheet entry.',
      confirmLabel: 'Delete Session',
      variant: 'danger',
      onConfirm: () => {
        const nextSessions = sessions.filter((s) => s.id !== id);
        setSessions(nextSessions);
        saveWorkSessions(nextSessions);
        if (currentUser) {
          deleteSessionFromFirestore(currentUser.uid, id);
        }
        setConfirmModal(null);
      },
    });
  };

  // Live Timer Handlers
  const handleStartLiveTimer = (category: ActivityCategory, businessType: BusinessType) => {
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const currentH = String(now.getHours()).padStart(2, '0');
    const currentM = String(now.getMinutes()).padStart(2, '0');

    const newActiveSession: WorkSession = {
      id: `active-sess-${Date.now()}`,
      onDate: today,
      onTime: `${currentH}:${currentM}`,
      category,
      businessType,
      client: businessType === 'admin' ? 'Admin' : (settings.clients[0] || 'Client Site'),
      jobNumber: businessType === 'admin' ? '' : (settings.jobNumbers[0] || ''),
      status: 'active',
    };

    setActiveSessionState(newActiveSession);
    saveActiveSession(newActiveSession);
  };

  const handleStopLiveTimer = () => {
    if (!activeSession) return;
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const currentH = String(now.getHours()).padStart(2, '0');
    const currentM = String(now.getMinutes()).padStart(2, '0');

    const completedSession: WorkSession = {
      ...activeSession,
      offDate: today,
      offTime: `${currentH}:${currentM}`,
      status: 'completed',
    };

    setEditingSession(completedSession);
    setIsSessionModalOpen(true);
  };

  // Open modal handlers
  const handleOpenTripModal = (cat: ActivityCategory = 'business', biz: BusinessType = 'chargeable') => {
    setEditingTrip(null);
    setTripDefaultCat(cat);
    setTripDefaultBiz(biz);
    setIsTripModalOpen(true);
  };

  const handleOpenSessionModal = (cat: ActivityCategory = 'business', biz: BusinessType = 'chargeable') => {
    setEditingSession(null);
    setSessionDefaultCat(cat);
    setSessionDefaultBiz(biz);
    setIsSessionModalOpen(true);
  };

  const handleEditTrip = (trip: Trip) => {
    setEditingTrip(trip);
    setIsTripModalOpen(true);
  };

  const handleEditSession = (session: WorkSession) => {
    setEditingSession(session);
    setIsSessionModalOpen(true);
  };

  const handleCompleteLiveTrip = () => {
    if (!activeTrip) return;
    setEditingTrip(activeTrip);
    setIsTripModalOpen(true);
  };

  const handleSaveSettings = async (newSettings: UserSettings) => {
    setSettings(newSettings);
    saveUserSettings(newSettings);
    if (currentUser) {
      await saveSettingsToFirestore(currentUser.uid, newSettings);
    }
  };

  const handleResetSampleData = () => {
    setConfirmModal({
      title: 'Reset to Blank Clean Slate',
      message: 'Are you sure you want to reset all records to a clean slate? All trips, sessions, and technician settings will be cleared so technicians can configure from scratch.',
      confirmLabel: 'Reset Database Clean',
      variant: 'warning',
      onConfirm: () => {
        const data = resetToSampleData();
        setTrips([]);
        setSessions([]);
        setSettings(data.settings);
        setActiveSessionState(null);
        setActiveTripState(null);
        if (currentUser) {
          syncAllTripsToFirestore(currentUser.uid, []);
          syncAllSessionsToFirestore(currentUser.uid, []);
          saveSettingsToFirestore(currentUser.uid, data.settings);
        }
        setConfirmModal(null);
      },
    });
  };

  const handleClearAllTrips = () => {
    setConfirmModal({
      title: 'Clear All Vehicle Trips',
      message: `Are you sure you want to clear all ${trips.length} vehicle trips? This will empty the logbook database so you can start completely fresh. Your driver credentials and vehicle settings will remain intact.`,
      confirmLabel: 'Clear All Trips',
      variant: 'danger',
      onConfirm: () => {
        clearAllTrips();
        setTrips([]);
        if (activeTrip) {
          setActiveTripState(null);
          saveActiveTrip(null);
        }
        if (currentUser) {
          syncAllTripsToFirestore(currentUser.uid, []);
        }
        setConfirmModal(null);
      },
    });
  };

  const handleClearEntireDatabase = (keepSettings: boolean = false) => {
    setConfirmModal({
      title: 'Wipe Entire Database',
      message: 'Are you sure you want to wipe the entire database? This removes all trips, timesheet work sessions, and active timers for a 100% clean slate.',
      confirmLabel: 'Wipe Everything Clean',
      variant: 'danger',
      onConfirm: () => {
        const result = clearEntireDatabase(keepSettings);
        setTrips(result.trips);
        setSessions(result.sessions);
        setSettings(result.settings);
        setActiveSessionState(null);
        setActiveTripState(null);
        if (currentUser) {
          clearFirestoreUserData(currentUser.uid, !keepSettings);
        }
        setConfirmModal(null);
      },
    });
  };

  const handleRestoreData = (newTrips: Trip[], newSessions: WorkSession[], newSettings: UserSettings) => {
    setTrips(newTrips);
    saveTrips(newTrips);
    setSessions(newSessions);
    saveWorkSessions(newSessions);
    setSettings(newSettings);
    saveUserSettings(newSettings);
    if (currentUser) {
      syncAllTripsToFirestore(currentUser.uid, newTrips);
      syncAllSessionsToFirestore(currentUser.uid, newSessions);
      saveSettingsToFirestore(currentUser.uid, newSettings);
    }
  };

  // Calculate highest recorded odometer for start suggestions
  const maxLoggedOdometer = trips.reduce(
    (max, t) => Math.max(max, t.mileageIn || 0, t.mileageOut || 0),
    settings.currentOdometer || 0
  );

  return (
    <Layout
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      activeSession={activeSession}
      timerElapsedText={timerElapsedText}
      onOpenQuickTrip={() => handleOpenTripModal('business', 'chargeable')}
      onOpenQuickSession={() => handleOpenSessionModal('business', 'chargeable')}
      onStopActiveTimer={handleStopLiveTimer}
      onOpenImportModal={() => setIsImportModalOpen(true)}
      currentUser={currentUser}
      onSignInWithGoogle={handleGoogleSignIn}
      onSignOut={handleGoogleSignOut}
    >
      {currentTab === 'dashboard' && (
        <DashboardView
          trips={trips}
          sessions={sessions}
          settings={settings}
          activeSession={activeSession}
          activeTrip={activeTrip}
          onOpenTripModal={handleOpenTripModal}
          onOpenSessionModal={handleOpenSessionModal}
          onStartLiveTimer={handleStartLiveTimer}
          onStopLiveTimer={handleStopLiveTimer}
          onCompleteLiveTrip={handleCompleteLiveTrip}
          onNavigateTab={setCurrentTab}
          timerElapsedText={timerElapsedText}
        />
      )}

      {currentTab === 'trips' && (
        <TripsView
          trips={trips}
          settings={settings}
          onAddTrip={() => handleOpenTripModal('business', 'chargeable')}
          onEditTrip={handleEditTrip}
          onDeleteTrip={handleDeleteTrip}
          onOpenImportModal={() => setIsImportModalOpen(true)}
          onOpenMapsView={() => setCurrentTab('maps')}
          onClearAllTrips={handleClearAllTrips}
          onResetSampleData={handleResetSampleData}
        />
      )}

      {currentTab === 'time' && (
        <TimeSessionsView
          sessions={sessions}
          settings={settings}
          activeSession={activeSession}
          timerElapsedText={timerElapsedText}
          onAddSession={() => handleOpenSessionModal('business', 'chargeable')}
          onStartLiveTimer={handleStartLiveTimer}
          onStopLiveTimer={handleStopLiveTimer}
          onEditSession={handleEditSession}
          onDeleteSession={handleDeleteSession}
        />
      )}

      {currentTab === 'timesheet' && (
        <TimesheetView
          trips={trips}
          sessions={sessions}
          settings={settings}
          onUpdateSettings={handleSaveSettings}
        />
      )}

      {currentTab === 'sars' && (
        <SarsLogbookView
          trips={trips}
          settings={settings}
          onOpenSettings={() => setCurrentTab('settings')}
        />
      )}

      {currentTab === 'maps' && (
        <MapsGroundingView
          settings={settings}
          onLogTripWithRoute={(routeData) => {
            const now = new Date();
            const h = String(now.getHours()).padStart(2, '0');
            const m = String(now.getMinutes()).padStart(2, '0');
            const odoOut = maxLoggedOdometer;
            const odoIn = odoOut + Math.round(routeData.distanceKm);

            const newTrip: Trip = {
              id: `trip-${Date.now()}`,
              date: new Date().toISOString().slice(0, 10),
              timeOut: `${h}:${m}`,
              timeIn: `${h}:${m}`,
              mileageOut: odoOut,
              mileageIn: odoIn,
              category: 'business',
              businessType: 'chargeable',
              client: settings.clients[0] || 'Client',
              jobNumber: settings.jobNumbers[0] || '',
              notes: routeData.notes,
              origin: routeData.origin,
              destination: routeData.destination,
              vehicle: settings.vehicleName || '',
              status: 'completed',
              splits: [],
            };
            setEditingTrip(newTrip);
            setIsTripModalOpen(true);
          }}
        />
      )}

      {currentTab === 'chat' && (
        <GeminiChatView
          trips={trips}
          sessions={sessions}
          settings={settings}
        />
      )}

      {currentTab === 'analytics' && <AnalyticsView trips={trips} sessions={sessions} />}

      {currentTab === 'settings' && (
        <SettingsView
          settings={settings}
          trips={trips}
          sessions={sessions}
          onSaveSettings={handleSaveSettings}
          onRestoreData={handleRestoreData}
          onResetSampleData={handleResetSampleData}
          onClearAllTrips={handleClearAllTrips}
          onClearEntireDatabase={handleClearEntireDatabase}
          currentUser={currentUser}
          cloudSyncStatus={cloudSyncStatus}
          onSignInWithGoogle={handleGoogleSignIn}
          onSignOut={handleGoogleSignOut}
          onManualSyncCloud={handleManualSyncCloud}
          onOpenDomainGuide={() => handleOpenAuthModal('auth/unauthorized-domain')}
        />
      )}

      {/* Auth & Domain Setup Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialError={authModalInitialError}
      />

      {/* Data Import Modal */}
      <DataImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={(updatedTrips, updatedSettings) => {
          setTrips(updatedTrips);
          if (updatedSettings) {
            setSettings(updatedSettings);
          }
        }}
        currentTripCount={trips.length}
        onClearAllTrips={handleClearAllTrips}
      />

      {/* Trip Modal */}
      <TripModal
        isOpen={isTripModalOpen}
        onClose={() => setIsTripModalOpen(false)}
        onSave={handleSaveTrip}
        initialTrip={editingTrip}
        suggestedOdometerOut={maxLoggedOdometer}
        settings={settings}
        defaultCategory={tripDefaultCat}
        defaultBusinessType={tripDefaultBiz}
        trips={trips}
        sessions={sessions}
      />

      {/* Session Modal */}
      <SessionModal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        onSave={handleSaveSession}
        initialSession={editingSession}
        settings={settings}
        defaultCategory={sessionDefaultCat}
        defaultBusinessType={sessionDefaultBiz}
        trips={trips}
        sessions={sessions}
      />

      {/* In-App Confirmation Modal (Safe for Sandboxed Iframes) */}
      {confirmModal && (
        <ConfirmModal
          isOpen={true}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          cancelLabel={confirmModal.cancelLabel}
          variant={confirmModal.variant}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </Layout>
  );
}
