import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Copy,
  CheckCircle2,
  Mail,
  Lock,
  User,
  ArrowRight,
  Sparkles,
  Globe,
  Github,
  HelpCircle,
} from 'lucide-react';
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signInAsGuest,
  FIREBASE_PROJECT_ID,
  FIREBASE_AUTHORIZED_DOMAINS_URL,
  isUnauthorizedDomainError,
} from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialError?: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialError }) => {
  const [activeTab, setActiveTab] = useState<'google' | 'email' | 'domains'>('google');
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const isUnauthorized = error && (error.includes('unauthorized-domain') || error.includes('auth/unauthorized-domain'));

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDomain(text);
    setTimeout(() => setCopiedDomain(null), 2500);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      if (isUnauthorizedDomainError(err)) {
        setError(`auth/unauthorized-domain: This domain (${currentHost}) is not yet whitelisted in Firebase Console.`);
        setActiveTab('domains');
      } else {
        setError(err.message || 'Failed to sign in with Google');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (isRegister) {
        await signUpWithEmail(email, password, displayName || undefined);
      } else {
        await signInWithEmail(email, password);
      }
      onClose();
    } catch (err: any) {
      console.error('Email auth failed:', err);
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInAsGuest();
      onClose();
    } catch (err: any) {
      console.error('Guest login failed:', err);
      setError(err.message || 'Guest sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const commonDomains = [
    { label: 'Current App Domain', value: currentHost },
    { label: 'Cloud Run / Dev Preview', value: 'run.app' },
    { label: 'Vercel Deployment', value: 'vercel.app' },
    { label: 'GitHub Pages', value: 'github.io' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Firebase Cloud Sign-In</h3>
              <p className="text-xs text-slate-400">Sync logbook, timesheets & fleet settings to Firestore</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('google')}
            className={`flex-1 py-2 px-3 rounded-lg text-center transition-all ${
              activeTab === 'google'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            Google Sign-In
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`flex-1 py-2 px-3 rounded-lg text-center transition-all ${
              activeTab === 'email'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            Email & Password
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('domains')}
            className={`flex-1 py-2 px-3 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'domains'
                ? 'bg-blue-600 text-white shadow-sm'
                : isUnauthorized
                ? 'text-amber-400 hover:bg-slate-900 bg-amber-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Vercel / GitHub Domain Fix</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Error Notice */}
          {error && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">{error}</p>
                  {isUnauthorized && (
                    <p className="text-[11px] text-amber-300/80 mt-1">
                      Firebase requires custom domains (like <code>run.app</code>, <code>vercel.app</code>, or <code>github.io</code>) to be added to Authorized Domains in the Firebase Console.
                    </p>
                  )}
                </div>
              </div>
              {isUnauthorized && activeTab !== 'domains' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('domains')}
                  className="w-full text-center py-1.5 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold transition-colors"
                >
                  View 30-Second Domain Whitelist Guide →
                </button>
              )}
            </div>
          )}

          {/* TAB 1: Google Sign-In */}
          {activeTab === 'google' && (
            <div className="space-y-4">
              <div className="text-center py-2">
                <p className="text-xs text-slate-300">
                  Authenticate securely using your Google account to automatically store trips and timesheets in your persistent Firestore database.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold py-3 px-4 text-sm shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                <span>{loading ? 'Opening Google Sign-In...' : 'Continue with Google'}</span>
              </button>

              <div className="flex items-center gap-3 my-3">
                <div className="h-px bg-slate-800 flex-1" />
                <span className="text-[11px] text-slate-500 font-medium">OR FAST ALTERNATIVE</span>
                <div className="h-px bg-slate-800 flex-1" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setActiveTab('email');
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 py-2.5 px-3 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  <Mail className="w-4 h-4 text-blue-400" />
                  <span>Use Email / Password</span>
                </button>

                <button
                  type="button"
                  onClick={handleGuestLogin}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 py-2.5 px-3 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors disabled:opacity-50"
                  title="Sign in anonymously to sync cloud data immediately without Google popup"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Instant Guest Cloud Sync</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Email & Password */}
          {activeTab === 'email' && (
            <form onSubmit={handleEmailAuth} className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-semibold text-slate-300">
                  {isRegister ? 'Create Cloud Account' : 'Sign In with Email'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsRegister(!isRegister)}
                  className="text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  {isRegister ? 'Already have an account? Sign in' : 'New user? Create account'}
                </button>
              </div>

              {isRegister && (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Your Full Name / Driver Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Alex Morgan / Technician Name"
                      className="w-full rounded-xl border border-slate-700 bg-slate-800/90 pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="driver@company.co.za"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/90 pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/90 pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 text-xs shadow-md transition-all disabled:opacity-50 mt-2"
              >
                {loading ? 'Authenticating...' : isRegister ? 'Register & Enable Cloud Sync' : 'Sign In'}
              </button>
            </form>
          )}

          {/* TAB 3: Domain Whitelist Guide for Vercel, GitHub, Cloud Run */}
          {activeTab === 'domains' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3.5 text-xs text-blue-200">
                <p className="font-semibold text-blue-100 mb-1">
                  Why does "auth/unauthorized-domain" occur?
                </p>
                <p className="text-[11px] leading-relaxed text-blue-200/90">
                  Firebase protects your Google OAuth client by rejecting sign-ins from domains not listed in your project’s Authorized Domains list. To use Google Sign-in on AI Studio, Vercel, or GitHub Pages, add your host domain below to Firebase Console.
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300 block">
                  1. Copy the domain you want to authorize:
                </span>
                <div className="space-y-1.5">
                  {commonDomains.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                    >
                      <div>
                        <span className="text-[10px] text-slate-400 block">{item.label}</span>
                        <code className="text-xs font-mono text-emerald-300">{item.value}</code>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.value)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                      >
                        {copiedDomain === item.value ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-xs font-semibold text-slate-300 block">
                  2. Add to Firebase Console:
                </span>
                <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside leading-relaxed">
                  <li>Click the button below to open Firebase Authentication Settings.</li>
                  <li>Scroll to the <strong className="text-slate-200">Authorized domains</strong> section.</li>
                  <li>Click <strong className="text-slate-200">Add domain</strong> and paste your domain (e.g. <code>run.app</code>, <code>vercel.app</code>, or <code>github.io</code>).</li>
                  <li>Click <strong className="text-slate-200">Save</strong>. Google Sign-In will work immediately!</li>
                </ol>

                <a
                  href={FIREBASE_AUTHORIZED_DOMAINS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 text-xs shadow-md transition-all"
                >
                  <span>Open Firebase Authorized Domains Settings</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="border-t border-slate-800 bg-slate-950/70 p-3.5 sm:px-6 flex items-center justify-between text-[11px] text-slate-500">
          <span className="font-mono">Project: {FIREBASE_PROJECT_ID}</span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
