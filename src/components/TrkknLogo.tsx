import React from 'react';

interface TrkknLogoProps {
  className?: string;
  variant?: 'full' | 'compact' | 'icon' | 'mark-only';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Official TRKKN Logo Mark
 * Featuring the signature 4-quadrant design:
 * 3 precision dark corner brackets with the iconic top-right red accent square.
 */
export const TrkknMark: React.FC<{ size?: string; className?: string }> = ({ 
  size = 'w-8 h-8', 
  className = '' 
}) => {
  return (
    <svg 
      className={`${size} aspect-square shrink-0 ${className}`} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      aria-label="TRKKN Logo"
    >
      {/* Top-Left Bracket */}
      <path 
        d="M 12 12 H 46 V 23 H 23 V 46 H 12 Z" 
        fill="#2D3139" 
      />

      {/* Top-Right Red Accent Square */}
      <rect 
        x="54" 
        y="12" 
        width="34" 
        height="34" 
        fill="#E5001A" 
      />

      {/* Bottom-Left Bracket */}
      <path 
        d="M 12 54 H 23 V 77 H 46 V 88 H 12 Z" 
        fill="#2D3139" 
      />

      {/* Bottom-Right Bracket */}
      <path 
        d="M 77 54 H 88 V 88 H 54 V 77 H 77 Z" 
        fill="#2D3139" 
      />
    </svg>
  );
};

export const TrkknLogo: React.FC<TrkknLogoProps> = ({ 
  className = '', 
  variant = 'full',
  size = 'md' 
}) => {
  const markSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12'
  };

  const titleSizes = {
    sm: 'text-base',
    md: 'text-lg sm:text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  if (variant === 'icon' || variant === 'mark-only') {
    return <TrkknMark size={markSizes[size]} className={className} />;
  }

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* TRKKN Symbol Mark */}
      <div className="relative shrink-0 flex items-center justify-center p-1 bg-white rounded-lg shadow-2xs border border-slate-100">
        <TrkknMark size={markSizes[size]} />
      </div>

      {/* TRKKN Typography */}
      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-center gap-2">
          <span className={`font-black tracking-[-0.03em] ${titleSizes[size]} text-slate-900 font-sans`}>
            TRKKN
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-slate-900 text-white shadow-2xs">
            GA4 MCP
          </span>
        </div>
        {variant === 'full' && (
          <span className="text-[9px] tracking-tight font-medium text-slate-500 mt-1 whitespace-nowrap">
            An Omnicom Media Group Company
          </span>
        )}
      </div>
    </div>
  );
};

