import React from 'react';
import { ActionCategoryType } from '../types';
import { Car, Clock, ShieldCheck, Briefcase, User, Sparkles, ArrowRight, Play } from 'lucide-react';

interface CategoryArtCardProps {
  type: ActionCategoryType;
  title: string;
  subtitle: string;
  badge: string;
  currentStat?: string;
  isTimerRunning?: boolean;
  onAction: () => void;
}

export const CategoryArtCard: React.FC<CategoryArtCardProps> = ({
  type,
  title,
  subtitle,
  badge,
  currentStat,
  isTimerRunning = false,
  onAction,
}) => {
  // Theme styling mapping based on the user's 6 uploaded thematic artworks
  const theme = {
    'charge-mileage': {
      gradient: 'from-red-950/80 via-slate-900 to-black',
      border: 'border-red-500/40 hover:border-red-400',
      badgeBg: 'bg-red-500/20 text-red-300 border-red-500/30',
      glow: 'shadow-red-950/50 hover:shadow-red-700/20',
      btnBg: 'bg-red-600 hover:bg-red-500 text-white',
      accentColor: '#ef4444',
      icon: <Briefcase className="w-5 h-5 text-red-400" />,
      actionText: 'Log Chargeable Trip',
      renderArt: () => (
        <svg viewBox="0 0 240 140" className="w-full h-full opacity-60 transition-opacity duration-300 group-hover:opacity-85" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="riftGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8"/>
              <stop offset="40%" stopColor="#b91c1c" stopOpacity="0.4"/>
              <stop offset="100%" stopColor="#000000" stopOpacity="0"/>
            </radialGradient>
          </defs>
          <rect width="240" height="140" fill="#050508"/>
          {/* Spatial vortex concentric rings */}
          <circle cx="120" cy="70" r="60" fill="url(#riftGlow)"/>
          <ellipse cx="120" cy="70" rx="50" ry="25" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.7"/>
          <ellipse cx="120" cy="70" rx="75" ry="38" fill="none" stroke="#dc2626" strokeWidth="1" strokeDasharray="8 6" opacity="0.5"/>
          <ellipse cx="120" cy="70" rx="100" ry="50" fill="none" stroke="#991b1b" strokeWidth="0.8" opacity="0.3"/>
          {/* Lightning arcs */}
          <path d="M 120,70 L 145,40 L 160,50 L 190,20" stroke="#fca5a5" strokeWidth="1.8" fill="none" opacity="0.8"/>
          <path d="M 120,70 L 95,95 L 80,85 L 45,120" stroke="#fca5a5" strokeWidth="1.8" fill="none" opacity="0.8"/>
          <path d="M 120,70 L 155,100 L 175,90 L 210,115" stroke="#f87171" strokeWidth="1.5" fill="none" opacity="0.7"/>
          {/* Spaceship silhouette boosting in */}
          <g transform="translate(140, 75) rotate(-25) scale(0.65)">
            <polygon points="0,-12 30,0 0,12 8,0" fill="#fecaca"/>
            <polygon points="-8,-6 -2,0 -8,6" fill="#ef4444"/>
            <path d="M -8,0 L -25,-4 L -15,0 L -25,4 Z" fill="#f87171"/>
          </g>
          {/* Central dark core */}
          <circle cx="120" cy="70" r="14" fill="#020205"/>
        </svg>
      ),
    },
    'admin-mileage': {
      gradient: 'from-amber-950/80 via-slate-900 to-black',
      border: 'border-amber-500/40 hover:border-amber-400',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      glow: 'shadow-amber-950/50 hover:shadow-amber-700/20',
      btnBg: 'bg-amber-600 hover:bg-amber-500 text-white',
      accentColor: '#f59e0b',
      icon: <Car className="w-5 h-5 text-amber-400" />,
      actionText: 'Log Admin Travel',
      renderArt: () => (
        <svg viewBox="0 0 240 140" className="w-full h-full opacity-60 transition-opacity duration-300 group-hover:opacity-85" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="amberSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#78350f" stopOpacity="0.7"/>
              <stop offset="100%" stopColor="#050508" stopOpacity="1"/>
            </linearGradient>
          </defs>
          <rect width="240" height="140" fill="url(#amberSky)"/>
          {/* Classical Colosseum silhouette arches */}
          <g opacity="0.35" fill="#d97706">
            <rect x="50" y="55" width="140" height="45" rx="4"/>
            <circle cx="70" cy="70" r="8" fill="#020617"/>
            <circle cx="95" cy="70" r="8" fill="#020617"/>
            <circle cx="120" cy="70" r="8" fill="#020617"/>
            <circle cx="145" cy="70" r="8" fill="#020617"/>
            <circle cx="170" cy="70" r="8" fill="#020617"/>
            <circle cx="82" cy="90" r="9" fill="#020617"/>
            <circle cx="107" cy="90" r="9" fill="#020617"/>
            <circle cx="132" cy="90" r="9" fill="#020617"/>
            <circle cx="157" cy="90" r="9" fill="#020617"/>
          </g>
          {/* Golden storm lightning bolts */}
          <path d="M 120,5 L 110,40 L 130,55 L 115,85 L 135,95 L 125,130" stroke="#fde68a" strokeWidth="2" fill="none" opacity="0.85"/>
          <path d="M 60,10 L 75,45 L 65,65 L 85,95" stroke="#f59e0b" strokeWidth="1.2" fill="none" opacity="0.6"/>
          <path d="M 180,15 L 165,45 L 180,70 L 160,110" stroke="#f59e0b" strokeWidth="1.2" fill="none" opacity="0.6"/>
          {/* Heavy craft ascension */}
          <g transform="translate(170, 70) rotate(-35) scale(0.6)">
            <polygon points="0,-10 25,0 0,10 5,0" fill="#fef08a"/>
            <polygon points="-8,-4 -2,0 -8,4" fill="#d97706"/>
          </g>
        </svg>
      ),
    },
    'pvt-mileage': {
      gradient: 'from-rose-950/80 via-slate-900 to-black',
      border: 'border-rose-500/40 hover:border-rose-400',
      badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      glow: 'shadow-rose-950/50 hover:shadow-rose-700/20',
      btnBg: 'bg-rose-700 hover:bg-rose-600 text-white',
      accentColor: '#e11d48',
      icon: <User className="w-5 h-5 text-rose-400" />,
      actionText: 'Log Private Drive',
      renderArt: () => (
        <svg viewBox="0 0 240 140" className="w-full h-full opacity-60 transition-opacity duration-300 group-hover:opacity-85" preserveAspectRatio="xMidYMid slice">
          <rect width="240" height="140" fill="#050508"/>
          {/* Feathers silhouette overlay */}
          <g opacity="0.4" stroke="#4c0519" strokeWidth="1.5">
            <path d="M 50,140 Q 90,80 120,20 Q 130,50 110,140" fill="#1e1b4b"/>
            <path d="M 90,140 Q 140,70 170,10 Q 180,50 150,140" fill="#31101e"/>
            <path d="M 130,140 Q 180,80 210,30 Q 215,60 190,140" fill="#1c1917"/>
          </g>
          {/* Crimson root network */}
          <g stroke="#f43f5e" strokeWidth="1.5" fill="none" opacity="0.75">
            <path d="M 120,135 Q 115,105 100,85 Q 85,70 70,60 M 100,85 Q 115,65 110,40 M 110,40 Q 125,25 140,15"/>
            <path d="M 120,135 Q 130,100 150,80 Q 170,65 185,45 M 150,80 Q 145,55 160,35"/>
            <circle cx="120" cy="130" r="7" fill="#881337" stroke="#f43f5e"/>
            <circle cx="100" cy="85" r="3.5" fill="#f43f5e"/>
            <circle cx="150" cy="80" r="3.5" fill="#f43f5e"/>
          </g>
        </svg>
      ),
    },
    'time-onsite': {
      gradient: 'from-emerald-950/80 via-slate-900 to-black',
      border: 'border-emerald-500/40 hover:border-emerald-400',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      glow: 'shadow-emerald-950/50 hover:shadow-emerald-700/20',
      btnBg: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      accentColor: '#10b981',
      icon: <Clock className="w-5 h-5 text-emerald-400" />,
      actionText: isTimerRunning ? 'Stop Active Timer' : 'Clock In On-Site',
      renderArt: () => (
        <svg viewBox="0 0 240 140" className="w-full h-full opacity-65 transition-opacity duration-300 group-hover:opacity-90" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="greenEye" cx="65%" cy="45%" r="40%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="1"/>
              <stop offset="40%" stopColor="#059669" stopOpacity="0.7"/>
              <stop offset="100%" stopColor="#022c22" stopOpacity="0"/>
            </radialGradient>
          </defs>
          <rect width="240" height="140" fill="#040b07"/>
          {/* Cybernetic mask silhouette */}
          <path d="M 120,20 L 190,30 L 210,90 L 160,130 L 120,115 Z" fill="#062016" stroke="#047857" strokeWidth="1.5" opacity="0.7"/>
          {/* Glowing Green Eye */}
          <circle cx="155" cy="65" r="28" fill="url(#greenEye)"/>
          <circle cx="155" cy="65" r="10" fill="#ecfdf5"/>
          <circle cx="155" cy="65" r="4" fill="#064e3b"/>
          {/* Shattered green energy fractures */}
          <g stroke="#6ee7b7" strokeWidth="1.8" fill="none" opacity="0.85">
            <path d="M 155,65 L 125,40 L 95,50 L 60,30 M 125,40 L 110,15"/>
            <path d="M 155,65 L 130,95 L 90,110 L 40,125 M 130,95 L 120,135"/>
            <path d="M 155,65 L 195,50 L 230,40 M 155,65 L 185,100 L 220,120"/>
            <path d="M 95,50 L 80,80 L 45,75"/>
          </g>
          {/* Floating shards */}
          <polygon points="50,45 65,50 60,62" fill="#10b981" opacity="0.6"/>
          <polygon points="75,90 90,100 80,108" fill="#10b981" opacity="0.5"/>
        </svg>
      ),
    },
    'admin-time': {
      gradient: 'from-yellow-950/80 via-slate-900 to-black',
      border: 'border-yellow-500/40 hover:border-yellow-400',
      badgeBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      glow: 'shadow-yellow-950/50 hover:shadow-yellow-700/20',
      btnBg: 'bg-yellow-600 hover:bg-yellow-500 text-white',
      accentColor: '#eab308',
      icon: <Sparkles className="w-5 h-5 text-yellow-400" />,
      actionText: isTimerRunning ? 'Stop Active Timer' : 'Clock In Admin Time',
      renderArt: () => (
        <svg viewBox="0 0 240 140" className="w-full h-full opacity-60 transition-opacity duration-300 group-hover:opacity-85" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="phoenixBurst" cx="40%" cy="40%" r="50%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="1"/>
              <stop offset="35%" stopColor="#eab308" stopOpacity="0.8"/>
              <stop offset="70%" stopColor="#854d0e" stopOpacity="0.4"/>
              <stop offset="100%" stopColor="#000000" stopOpacity="0"/>
            </radialGradient>
          </defs>
          <rect width="240" height="140" fill="#0a0701"/>
          {/* Phoenix burst rays */}
          <g stroke="#fde047" strokeWidth="1.2" opacity="0.8">
            <line x1="90" y1="55" x2="20" y2="15" strokeWidth="2"/>
            <line x1="90" y1="55" x2="10" y2="45" strokeWidth="1.8"/>
            <line x1="90" y1="55" x2="15" y2="75" strokeWidth="1.5"/>
            <line x1="90" y1="55" x2="35" y2="105"/>
            <line x1="90" y1="55" x2="65" y2="125"/>
            <line x1="90" y1="55" x2="140" y2="20"/>
            <line x1="90" y1="55" x2="170" y2="40"/>
            <line x1="90" y1="55" x2="190" y2="70"/>
            <line x1="90" y1="55" x2="185" y2="110"/>
          </g>
          {/* Fractal wing swirls */}
          <path d="M 90,55 Q 120,70 140,105 Q 155,130 170,120 Q 150,90 120,75 Z" fill="#ca8a04" opacity="0.6"/>
          <path d="M 90,55 Q 105,80 120,115 Q 130,135 140,125 Q 125,95 105,75 Z" fill="#eab308" opacity="0.5"/>
          {/* Blinding golden heart */}
          <circle cx="90" cy="55" r="30" fill="url(#phoenixBurst)"/>
          <circle cx="90" cy="55" r="8" fill="#ffffff"/>
        </svg>
      ),
    },
    'pvt-time': {
      gradient: 'from-purple-950/80 via-slate-900 to-black',
      border: 'border-purple-500/40 hover:border-purple-400',
      badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      glow: 'shadow-purple-950/50 hover:shadow-purple-700/20',
      btnBg: 'bg-purple-700 hover:bg-purple-600 text-white',
      accentColor: '#a855f7',
      icon: <ShieldCheck className="w-5 h-5 text-purple-400" />,
      actionText: isTimerRunning ? 'Stop Active Timer' : 'Clock In Private Break',
      renderArt: () => (
        <svg viewBox="0 0 240 140" className="w-full h-full opacity-60 transition-opacity duration-300 group-hover:opacity-85" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="purpleEye" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e9d5ff" stopOpacity="1"/>
              <stop offset="40%" stopColor="#a855f7" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#3b0764" stopOpacity="0"/>
            </radialGradient>
          </defs>
          <rect width="240" height="140" fill="#07020d"/>
          {/* Shattered violet shards */}
          <polygon points="40,20 85,35 65,70" fill="#581c87" opacity="0.4" stroke="#c084fc" strokeWidth="1"/>
          <polygon points="150,15 195,30 175,65" fill="#581c87" opacity="0.4" stroke="#c084fc" strokeWidth="1"/>
          <polygon points="70,95 125,110 95,135" fill="#3b0764" opacity="0.5" stroke="#c084fc" strokeWidth="1"/>
          {/* Central alien mask feature with glowing eye */}
          <path d="M 105,40 L 135,40 L 145,85 L 120,110 L 95,85 Z" fill="#2e1065" stroke="#9333ea" strokeWidth="1.5"/>
          <circle cx="120" cy="65" r="14" fill="url(#purpleEye)"/>
          <circle cx="120" cy="65" r="4" fill="#ffffff"/>
          {/* Violet energy rays */}
          <g stroke="#d8b4fe" strokeWidth="1.5" fill="none" opacity="0.8">
            <line x1="120" y1="65" x2="60" y2="40"/>
            <line x1="120" y1="65" x2="180" y2="40"/>
            <line x1="120" y1="65" x2="160" y2="105"/>
            <line x1="120" y1="65" x2="75" y2="105"/>
          </g>
        </svg>
      ),
    },
  }[type];

  return (
    <div
      onClick={onAction}
      className={`group relative overflow-hidden rounded-xl border bg-gradient-to-b ${theme.gradient} ${theme.border} p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${theme.glow} cursor-pointer flex flex-col justify-between min-h-[220px]`}
    >
      {/* Background artwork */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {theme.renderArt()}
        {/* Soft vignette overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
      </div>

      {/* Top Header */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900/90 border border-slate-700/60 shadow-inner">
            {theme.icon}
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-base leading-tight group-hover:text-white transition-colors">
              {title}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        </div>

        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full border ${theme.badgeBg}`}>
          {badge}
        </span>
      </div>

      {/* Bottom Content & Action Trigger */}
      <div className="relative z-10 mt-6 pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <div>
          {currentStat && (
            <p className="text-xs font-medium text-slate-300">
              {currentStat}
            </p>
          )}
        </div>

        <button
          type="button"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all duration-200 group-hover:scale-105 ${theme.btnBg}`}
        >
          {isTimerRunning ? <Clock className="w-3.5 h-3.5 animate-pulse" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>{theme.actionText}</span>
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
