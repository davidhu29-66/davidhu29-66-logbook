import React from 'react';
import { ActionCategoryType } from '../types';
import { Car, Clock, ShieldCheck, Briefcase, User, Sparkles, ArrowRight, Play } from 'lucide-react';

// Imported visual background assets for each of the 6 signature modes
import chargeMileageImg from '../assets/images/charge_mileage_bg_1790239348801.jpg';
import adminMileageImg from '../assets/images/admin_mileage_bg_1790239359386.jpg';
import privateMileageImg from '../assets/images/private_mileage_bg_1790239371360.jpg';
import timeOnsiteImg from '../assets/images/time_onsite_bg_1790239385106.jpg';
import adminTimeImg from '../assets/images/admin_time_bg_1790239396074.jpg';
import privateTimeImg from '../assets/images/private_time_bg_1790239408508.jpg';

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
  // Theme configuration matched to the 6 uploaded artworks and container modes
  const theme = {
    // 1. Chargeable Mileage -> Chargeable_mileage_20260924103504.jpeg (Electric Blue/Cyan Crystal Falcon)
    'charge-mileage': {
      bgImage: chargeMileageImg,
      fileName: 'Chargeable_mileage_20260924103504.jpeg',
      gradient: 'from-sky-950/80 via-slate-900 to-black',
      border: 'border-sky-500/40 hover:border-sky-400',
      badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      glow: 'shadow-sky-950/50 hover:shadow-sky-700/20',
      btnBg: 'bg-sky-600 hover:bg-sky-500 text-white',
      accentColor: '#38bdf8',
      icon: <Briefcase className="w-5 h-5 text-sky-400" />,
      actionText: 'Log Chargeable Trip',
    },
    // 2. Admin Mileage -> Admin_mileage_20260924103457.jpeg (Deep Violet/Purple Crystal Horned Owl)
    'admin-mileage': {
      bgImage: adminMileageImg,
      fileName: 'Admin_mileage_20260924103457.jpeg',
      gradient: 'from-purple-950/80 via-slate-900 to-black',
      border: 'border-purple-500/40 hover:border-purple-400',
      badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      glow: 'shadow-purple-950/50 hover:shadow-purple-700/20',
      btnBg: 'bg-purple-600 hover:bg-purple-500 text-white',
      accentColor: '#c084fc',
      icon: <Car className="w-5 h-5 text-purple-400" />,
      actionText: 'Log Admin Travel',
    },
    // 3. Private Mileage -> Private_Mileage_20260924103509.jpeg (Fiery Crimson Phoenix)
    'pvt-mileage': {
      bgImage: privateMileageImg,
      fileName: 'Private_Mileage_20260924103509.jpeg',
      gradient: 'from-rose-950/80 via-slate-900 to-black',
      border: 'border-rose-500/40 hover:border-rose-400',
      badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      glow: 'shadow-rose-950/50 hover:shadow-rose-700/20',
      btnBg: 'bg-rose-600 hover:bg-rose-500 text-white',
      accentColor: '#f43f5e',
      icon: <User className="w-5 h-5 text-rose-400" />,
      actionText: 'Log Private Drive',
    },
    // 4. Time On-Site -> Time_on_site_20260924103501.jpeg (Emerald Green Crystal Falcon)
    'time-onsite': {
      bgImage: timeOnsiteImg,
      fileName: 'Time_on_site_20260924103501.jpeg',
      gradient: 'from-emerald-950/80 via-slate-900 to-black',
      border: 'border-emerald-500/40 hover:border-emerald-400',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      glow: 'shadow-emerald-950/50 hover:shadow-emerald-700/20',
      btnBg: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      accentColor: '#10b981',
      icon: <Clock className="w-5 h-5 text-emerald-400" />,
      actionText: isTimerRunning ? 'Stop Active Timer' : 'Clock In On-Site',
    },
    // 5. Admin Time -> Admin_time_20260924103454.jpeg (Radiant Golden Amber Horned Owl)
    'admin-time': {
      bgImage: adminTimeImg,
      fileName: 'Admin_time_20260924103454.jpeg',
      gradient: 'from-amber-950/80 via-slate-900 to-black',
      border: 'border-amber-500/40 hover:border-amber-400',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      glow: 'shadow-amber-950/50 hover:shadow-amber-700/20',
      btnBg: 'bg-amber-600 hover:bg-amber-500 text-white',
      accentColor: '#f59e0b',
      icon: <Sparkles className="w-5 h-5 text-amber-400" />,
      actionText: isTimerRunning ? 'Stop Active Timer' : 'Clock In Admin Time',
    },
    // 6. Private Break -> Private_time_20260924103506.jpeg (Obsidian / Shadow Crystal Bird)
    'pvt-time': {
      bgImage: privateTimeImg,
      fileName: 'Private_time_20260924103506.jpeg',
      gradient: 'from-slate-900 via-slate-950 to-black',
      border: 'border-slate-700 hover:border-slate-500',
      badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
      glow: 'shadow-slate-950/60 hover:shadow-slate-800/40',
      btnBg: 'bg-slate-700 hover:bg-slate-600 text-white',
      accentColor: '#94a3b8',
      icon: <ShieldCheck className="w-5 h-5 text-slate-300" />,
      actionText: isTimerRunning ? 'Stop Active Timer' : 'Clock In Private Break',
    },
  }[type];

  return (
    <div
      onClick={onAction}
      className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-b ${theme.gradient} ${theme.border} p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${theme.glow} cursor-pointer flex flex-col justify-between min-h-[230px]`}
    >
      {/* Background container artwork */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
        <img
          src={theme.bgImage}
          alt={title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center scale-100 opacity-55 transition-all duration-500 group-hover:scale-105 group-hover:opacity-80 filter contrast-110 saturate-110"
        />
        {/* Soft vignette & gradient overlay to preserve optimal contrast for text & controls */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/65 to-slate-950/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-transparent to-slate-950/75" />
      </div>

      {/* Top Header */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950/80 border border-slate-700/60 shadow-lg backdrop-blur-sm">
            {theme.icon}
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-base leading-tight group-hover:text-white transition-colors drop-shadow-sm">
              {title}
            </h3>
            <p className="text-xs text-slate-300/80 mt-0.5 drop-shadow-sm">{subtitle}</p>
          </div>
        </div>

        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full border shadow-sm backdrop-blur-sm ${theme.badgeBg}`}>
          {badge}
        </span>
      </div>

      {/* Bottom Content & Action Trigger */}
      <div className="relative z-10 mt-6 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          {currentStat && (
            <p className="text-xs font-medium text-slate-200 truncate drop-shadow-sm">
              {currentStat}
            </p>
          )}
        </div>

        <button
          type="button"
          className={`inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-md transition-all duration-200 group-hover:scale-105 ${theme.btnBg}`}
        >
          {isTimerRunning ? (
            <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
          <span>{theme.actionText}</span>
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
