import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 36, className = '', showText = false }) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        viewBox="0 0 512 512"
        width={size}
        height={size}
        className="shrink-0 drop-shadow-md transition-transform duration-300 hover:scale-105"
        style={{ width: size, height: size }}
      >
        <rect width="512" height="512" rx="110" fill="#020617" />
        <g transform="translate(256, 256)">
          {/* Top-Left Royal Blue Arm */}
          <path
            d="M -15,-20 C -40,-95 -85,-155 -135,-155 C -170,-155 -195,-125 -180,-85 C -165,-45 -110,-35 -70,-10 C -40,10 -25,12 -12,2 Z"
            fill="#1e3a8a"
            transform="rotate(-25)"
          />
          <path
            d="M -5,-15 C -25,-85 -70,-145 -118,-158 C -150,-165 -178,-138 -165,-102 C -145,-55 -95,-38 -45,-8 Z"
            fill="#2563eb"
          />

          {/* Top-Right Emerald Green Arm */}
          <path
            d="M 20,-10 C 70,-45 125,-75 150,-125 C 170,-165 142,-192 105,-182 C 60,-170 25,-120 15,-65 C 8,-35 10,-12 18,-2 Z"
            fill="#16a34a"
            transform="rotate(65)"
          />
          <path
            d="M 12,-5 C 68,-35 120,-68 152,-115 C 172,-152 148,-178 115,-170 C 75,-158 35,-112 15,-60 Z"
            fill="#22c55e"
            transform="rotate(72)"
          />

          {/* Bottom-Right Coral Red Arm */}
          <path
            d="M 15,15 C 65,50 110,95 130,145 C 150,185 120,210 80,195 C 40,180 15,125 -2,70 C -12,35 -5,15 8,10 Z"
            fill="#dc2626"
            transform="rotate(158)"
          />
          <path
            d="M 10,12 C 55,60 98,118 115,162 C 130,202 96,218 65,202 C 28,182 5,125 -8,72 Z"
            fill="#ef4444"
            transform="rotate(168)"
          />

          {/* Bottom-Left Amber/Yellow Arm */}
          <path
            d="M -15,15 C -65,50 -120,85 -150,135 C -175,175 -142,205 -105,192 C -65,178 -25,125 -5,68 C 5,35 0,15 -10,8 Z"
            fill="#d97706"
            transform="rotate(250)"
          />
          <path
            d="M -12,12 C -58,45 -110,92 -138,138 C -162,172 -132,198 -98,188 C -58,172 -20,122 -2,68 Z"
            fill="#f59e0b"
            transform="rotate(260)"
          />

          {/* Dark Center Interlock */}
          <circle cx="0" cy="0" r="16" fill="#020617" />
        </g>
      </svg>
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
