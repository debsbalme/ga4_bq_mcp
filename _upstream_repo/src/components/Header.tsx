import React from 'react';
import { 
  ChevronDown, 
  Terminal, 
  SlidersHorizontal, 
  ShieldCheck, 
  Menu,
  Sparkles,
  Award
} from 'lucide-react';
import { GA4Property, UserProfile } from '../types';
import { TrkknLogo } from './TrkknLogo';

interface HeaderProps {
  currentProperty: GA4Property | null;
  user: UserProfile | null;
  onOpenAuthModal: () => void;
  onOpenPropertyModal: () => void;
  onOpenMCPModal: () => void;
  onOpenQueryBuilder: () => void;
  onNewChat: () => void;
  isLiveLoading?: boolean;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentProperty,
  user,
  onOpenAuthModal,
  onOpenPropertyModal,
  onOpenMCPModal,
  onOpenQueryBuilder,
  onNewChat,
  isLiveLoading = false,
  onToggleSidebar
}) => {
  // Initials for avatar
  const initials = user?.name
    ? user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : user?.email ? user.email.substring(0, 2).toUpperCase() : 'TR';

  return (
    <nav className="h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between shadow-2xs shrink-0 z-30">
      {/* Left Branding with Official TRKKN Logo */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            title="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-3">
          <TrkknLogo variant="full" size="md" />
          
          <div className="hidden xl:flex items-center gap-1.5 pl-3 border-l border-slate-200 text-[11px] font-medium text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
            <span>Google Premier Partner</span>
          </div>
        </div>
      </div>

      {/* Center/Right Actions */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Property Selector */}
        <div className="relative">
          <button
            id="header-property-selector"
            onClick={onOpenPropertyModal}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg text-xs sm:text-sm font-medium transition-colors text-slate-800 group shadow-2xs cursor-pointer"
          >
            <span className="text-slate-500 font-normal hidden sm:inline">Property:</span>
            <span className="font-semibold text-slate-900 truncate max-w-[140px] sm:max-w-[220px]">
              {currentProperty ? currentProperty.displayName : 'Select GA4 Property'}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0" />
          </button>
        </div>

        {/* Quick Tools */}
        <div className="hidden lg:flex items-center gap-1.5">
          <button
            onClick={onOpenQueryBuilder}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
            Query Builder
          </button>
          <button
            onClick={onOpenMCPModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5 text-slate-500" />
            MCP Protocol
          </button>
        </div>

        <div className="h-7 w-[1px] bg-slate-200 hidden sm:block"></div>

        {/* User Auth Profile */}
        <button
          id="header-auth-btn"
          onClick={onOpenAuthModal}
          className="flex items-center gap-2.5 hover:opacity-95 transition-opacity text-left cursor-pointer"
        >
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-900 truncate max-w-[120px]">
              {user ? (user.name || 'Connected User') : 'Sign In'}
            </p>
            <p className="text-[10px] text-slate-500 truncate max-w-[120px]">
              {user?.email || 'Google Analytics 4'}
            </p>
          </div>

          {user?.picture ? (
            <img 
              src={user.picture} 
              alt={user.name || 'User'} 
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border border-slate-200 ring-2 ring-blue-500/20"
            />
          ) : (
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full ${user?.accessToken ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20' : 'bg-slate-900 text-white border-slate-800'} border flex items-center justify-center font-bold text-xs sm:text-sm shadow-2xs`}>
              {user ? initials : <ShieldCheck className="w-4 h-4 text-cyan-400" />}
            </div>
          )}
        </button>
      </div>
    </nav>
  );
};
