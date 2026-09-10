import React from 'react';
import { 
  Plus, 
  MessageSquare, 
  TrendingUp, 
  Users, 
  Globe, 
  ShoppingBag, 
  Activity, 
  SlidersHorizontal,
  ChevronRight,
  Terminal,
  ShieldCheck,
  Zap,
  Database,
  Code2
} from 'lucide-react';
import { GA4Property } from '../types';

interface SidebarProps {
  onNewChat: () => void;
  onSelectPrompt: (promptText: string) => void;
  currentProperty: GA4Property | null;
  isBigQueryEnabled?: boolean;
  onOpenQueryBuilder: () => void;
  onOpenBigQueryStudio?: () => void;
  onOpenMCPModal: () => void;
  onOpenAuthModal: () => void;
  isSidebarOpen: boolean;
  onCloseSidebar?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onNewChat,
  onSelectPrompt,
  currentProperty,
  isBigQueryEnabled = false,
  onOpenQueryBuilder,
  onOpenBigQueryStudio,
  onOpenMCPModal,
  onOpenAuthModal,
  isSidebarOpen,
  onCloseSidebar,
}) => {
  const recentExplorations = [
    {
      title: 'Traffic Source Breakdown',
      icon: <TrendingUp className="w-4 h-4 text-blue-600" />,
      query: 'Break down sessions and conversions by Default Channel Group (Organic, Paid, Direct, Referral)'
    },
    {
      title: 'Real-time Active Pulse',
      icon: <Activity className="w-4 h-4 text-emerald-600" />,
      query: 'Who is on the site right now in real-time? Show minute-by-minute active users.'
    },
    {
      title: '30-Day User Trend',
      icon: <Users className="w-4 h-4 text-indigo-600" />,
      query: 'Show daily active users, sessions, and screen pageviews for the last 30 days.'
    },
    {
      title: 'Top Countries & Revenue',
      icon: <Globe className="w-4 h-4 text-amber-600" />,
      query: 'What are our top 10 countries by active users and total revenue?'
    }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <div 
          onClick={onCloseSidebar} 
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-20 md:hidden"
        />
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-20
        w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0
        transition-transform duration-200 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* New Exploration Button with TRKKN styling */}
        <div className="p-4 border-b border-slate-200/80 bg-white">
          <button
            id="sidebar-new-query-btn"
            onClick={() => {
              onNewChat();
              onCloseSidebar?.();
            }}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer group"
          >
            <Plus className="w-4 h-4 text-cyan-400 group-hover:rotate-90 transition-transform duration-200" />
            <span>New Exploration</span>
          </button>
        </div>

        {/* Explorations List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 px-3 mb-2 mt-2">
            TRKKN Presets
          </p>

          {recentExplorations.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                onSelectPrompt(item.query);
                onCloseSidebar?.();
              }}
              className="w-full text-left flex items-center gap-3 px-3 py-2 text-slate-700 hover:bg-white hover:text-blue-600 hover:shadow-2xs rounded-lg text-xs font-semibold transition-all group"
            >
              <span className="shrink-0 p-1 rounded-md bg-slate-100 group-hover:bg-blue-50 transition-colors">{item.icon}</span>
              <span className="truncate">{item.title}</span>
            </button>
          ))}

          <div className="pt-4 mt-4 border-t border-slate-200/80">
            <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 px-3 mb-2">
              Power Tools
            </p>

            {isBigQueryEnabled && onOpenBigQueryStudio && (
              <button
                onClick={() => {
                  onOpenBigQueryStudio();
                  onCloseSidebar?.();
                }}
                className="w-full text-left flex items-center justify-between px-3 py-2 text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition-all mb-1 shadow-2xs cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Database className="w-4 h-4 text-indigo-600" />
                  <span>BigQuery SQL Studio</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
              </button>
            )}

            <button
              onClick={() => {
                onOpenQueryBuilder();
                onCloseSidebar?.();
              }}
              className="w-full text-left flex items-center justify-between px-3 py-2 text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-2xs rounded-lg text-xs font-medium transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                <span>Visual Query Builder</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              onClick={() => {
                onOpenMCPModal();
                onCloseSidebar?.();
              }}
              className="w-full text-left flex items-center justify-between px-3 py-2 text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-2xs rounded-lg text-xs font-medium transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Terminal className="w-4 h-4 text-slate-500" />
                <span>MCP Protocol Inspector</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              onClick={() => {
                onOpenAuthModal();
                onCloseSidebar?.();
              }}
              className="w-full text-left flex items-center justify-between px-3 py-2 text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-2xs rounded-lg text-xs font-medium transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Google Auth Settings</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* TRKKN Corporate Footer info */}
        <div className="p-3 border-t border-slate-200/80 bg-white text-[11px] text-slate-500 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{isBigQueryEnabled ? 'TRKKN GA4 & BQ Engine' : 'TRKKN GA4 Engine'}</span>
            </div>
            <span className="text-[10px] font-semibold text-slate-400">v2024.11</span>
          </div>
          <p className="text-[9px] text-slate-400 font-medium">
            Omnicom Media Group Partner
          </p>
        </div>
      </aside>
    </>
  );
};
