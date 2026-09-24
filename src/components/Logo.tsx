import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  withBackground?: boolean;
}

// Canonical petal path:
// Extends from inner corner (-12, -12) out along the white cross channels
// Featuring the authentic tall crest, U-saddle scoop, and rounded outer hook.
const PETAL_PATH =
  'M -12 -12 L -12 -205 C -12 -235 -32 -252 -60 -246 C -88 -240 -115 -212 -135 -172 C -155 -132 -170 -112 -190 -112 C -208 -112 -224 -96 -226 -76 C -228 -54 -215 -32 -190 -22 C -168 -12 -142 -12 -115 -12 L -12 -12 Z';

export const Logo: React.FC<LogoProps> = ({
  size = 36,
  className = '',
  showText = false,
  withBackground = false,
}) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`relative flex items-center justify-center shrink-0 transition-transform duration-300 hover:scale-105 ${
          withBackground
            ? 'p-1.5 rounded-2xl bg-white/5 border border-white/10 shadow-sm backdrop-blur-sm'
            : ''
        }`}
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 512 512"
          width="100%"
          height="100%"
          className="shrink-0 drop-shadow-sm select-none"
        >
          <g transform="translate(256, 256) rotate(-25)">
            {/* Top Petal: Deep Navy Blue */}
            <path d={PETAL_PATH} fill="#0a1274" />

            {/* Right Petal: Emerald Green */}
            <path d={PETAL_PATH} fill="#009626" transform="rotate(90)" />

            {/* Bottom Petal: Crimson Red */}
            <path d={PETAL_PATH} fill="#d60a16" transform="rotate(180)" />

            {/* Left Petal: Warm Golden Yellow */}
            <path d={PETAL_PATH} fill="#fab400" transform="rotate(270)" />
          </g>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className="font-bold text-lg leading-tight tracking-tight text-slate-100 flex items-center gap-1.5">
            Mileage <span className="text-blue-500 font-extrabold">&</span> Time
          </span>
          <span className="text-[11px] font-medium tracking-wider text-slate-400 uppercase">
            Logbook & HR-018
          </span>
        </div>
      )}
    </div>
  );
};
