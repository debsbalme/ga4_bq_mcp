import React from 'react';
import { TrendingUp, TrendingDown, Minus, DollarSign, Users, MousePointer, Activity } from 'lucide-react';
import { KPICardData } from '../types';

interface KPICardsProps {
  kpis: KPICardData[];
}

export const KPICards: React.FC<KPICardsProps> = ({ kpis }) => {
  if (!kpis || kpis.length === 0) return null;

  const getIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('revenue') || t.includes('purchase')) return <DollarSign className="w-4 h-4 text-emerald-600" />;
    if (t.includes('user')) return <Users className="w-4 h-4 text-blue-600" />;
    if (t.includes('session') || t.includes('click')) return <MousePointer className="w-4 h-4 text-indigo-600" />;
    return <Activity className="w-4 h-4 text-slate-600" />;
  };

  return (
    <div className="my-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
      {kpis.map((kpi, idx) => (
        <div 
          key={idx} 
          className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-1 text-slate-500 text-xs font-medium mb-1">
            <span className="truncate">{kpi.title}</span>
            <div className="p-1 rounded-md bg-white border border-slate-200/80 shrink-0">
              {getIcon(kpi.title)}
            </div>
          </div>

          <div className="my-1">
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              {kpi.value}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200/80 mt-1">
            {kpi.change && (
              <span className={`flex items-center gap-0.5 font-semibold ${
                kpi.changeType === 'positive' ? 'text-emerald-600' :
                kpi.changeType === 'negative' ? 'text-rose-600' : 'text-slate-500'
              }`}>
                {kpi.changeType === 'positive' ? <TrendingUp className="w-3 h-3" /> :
                 kpi.changeType === 'negative' ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                {kpi.change}
              </span>
            )}
            {kpi.subtitle && (
              <span className="text-slate-400 text-[10px] truncate max-w-[100px]" title={kpi.subtitle}>
                {kpi.subtitle}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
