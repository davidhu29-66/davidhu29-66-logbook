import React from 'react';
import { Logo } from './Logo';
import {
  LayoutDashboard,
  Car,
  Clock,
  FileSpreadsheet,
  FileCheck,
  BarChart3,
  Settings,
  Plus,
  Play,
  Square,
  Sparkles,
  Compass,
  Database,
  Bot,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { WorkSession } from '../types';
import { User } from 'firebase/auth';

interface LayoutProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  activeSession: WorkSession | null;
  timerElapsedText: string;
  onOpenQuickTrip: () => void;
  onOpenQuickSession: () => void;
  onStopActiveTimer: () => void;
  onOpenImportModal: () => void;
  currentUser?: User | null;
  onSignInWithGoogle?: () => void;
  onSignOut?: () => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentTab,
  onSelectTab,
  activeSession,
  timerElapsedText,
  onOpenQuickTrip,
  onOpenQuickSession,
  onStopActiveTimer,
  onOpenImportModal,
  currentUser,
  onSignInWithGoogle,
  onSignOut,
  children,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'trips', label: 'Trips (KM)', icon: Car },
    { id: 'time', label: 'Sessions (HRS)', icon: Clock },
    { id: 'timesheet', label: 'HR-018 Timesheet', icon: FileSpreadsheet },
    { id: 'sars', label: 'SARS Logbook', icon: FileCheck },
    { id: 'maps', label: 'Maps & Routes', icon: Compass },
    { id: 'chat', label: 'AI Advisor', icon: Bot },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white print:bg-white print:text-black">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md print:hidden">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Logo & Brand Title */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectTab('dashboard')}>
            <Logo size={36} />
            <div>
              <span className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                MILEAGE & TIME LOGBOOK
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  HR-018
                </span>
              </span>
              <p className="text-[11px] text-slate-400 hidden sm:block">Automated attribution & client splits</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-900/60 border border-slate-800 p-1 rounded-xl">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenImportModal}
              className="hidden md:flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Import CSV trips"
            >
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span>Import</span>
            </button>

            {activeSession ? (
              <button
                type="button"
                onClick={onStopActiveTimer}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg hover:bg-red-500 transition-all animate-pulse"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span className="font-mono">{timerElapsedText}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenQuickSession}
                className="hidden sm:flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/50 transition-colors"
              >
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Clock In</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenQuickTrip}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-md hover:bg-blue-500 transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span>Log Trip</span>
            </button>

            {/* Firebase Auth & Google Sign-In Status */}
            {currentUser ? (
              <div className="flex items-center gap-2 pl-1 border-l border-slate-800">
                <div
                  className="flex items-center gap-2 px-2 py-1 rounded-xl bg-slate-900 border border-slate-800"
                  title={`Signed in as ${currentUser.displayName || currentUser.email} (Firestore Cloud Sync Active)`}
                >
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'User'}
                      className="w-5 h-5 rounded-full ring-1 ring-emerald-400"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
                      {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs text-slate-200 hidden xl:inline-block max-w-[100px] truncate font-medium">
                    {currentUser.displayName?.split(' ')[0] || 'User'}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" title="Firestore Connected" />
                </div>
                {onSignOut && (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-900 transition-colors"
                    title="Sign Out of Firebase"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : onSignInWithGoogle ? (
              <button
                type="button"
                onClick={onSignInWithGoogle}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition-all shadow-sm"
                title="Sign in with Google to sync your logbook to Firestore"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="hidden sm:inline">Sign in</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="flex lg:hidden overflow-x-auto border-t border-slate-800/60 px-4 py-2 gap-1.5 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 print:p-0 print:m-0 print:max-w-none">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-500 print:hidden">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Mileage & Time Logbook • HR-018 & SARS Section 8(1)(b) Compliant</p>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Monthly Trip Sheet</span>
            <span>•</span>
            <span>SARS Vehicle Logbook</span>
            <span>•</span>
            <span>Print & Excel Export</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
