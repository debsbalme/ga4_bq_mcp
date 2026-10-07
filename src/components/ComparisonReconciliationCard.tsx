import React, { useState } from 'react';
import { 
  GitCompare, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Code2, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Database, 
  Sparkles,
  Layers,
  ArrowRight,
  TrendingUp,
  Info
} from 'lucide-react';
import { GA4BQComparisonResult } from '../types';

interface ComparisonReconciliationCardProps {
  data: GA4BQComparisonResult;
}

export const ComparisonReconciliationCard: React.FC<ComparisonReconciliationCardProps> = ({ data }) => {
  const [showSql, setShowSql] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(true);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleCopySql = () => {
    if (!data.generatedSql) return;
    navigator.clipboard.writeText(data.generatedSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const getStatusBadge = (status: 'match' | 'minor_variance' | 'discrepancy', variancePercent: number) => {
    const formattedPct = `${variancePercent > 0 ? '+' : ''}${variancePercent.toFixed(2)}%`;
    if (status === 'match') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" />
          Consistent ({formattedPct})
        </span>
      );
    }
    if (status === 'minor_variance') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <Info className="w-3 h-3" />
          Normal Variance ({formattedPct})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <AlertTriangle className="w-3 h-3" />
        Divergence ({formattedPct})
      </span>
    );
  };

  return (
    <div className="my-4 rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/10 text-cyan-400 border border-white/10 backdrop-blur-xs">
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold tracking-tight text-white">
                GA4 & BigQuery Cross-Source Reconciliation
              </h4>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-cyan-400/20 text-cyan-200 border border-cyan-400/30">
                MCP Dual Engine
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Comparing GA4 Data API ({data.propertyId}) with BigQuery ({data.projectId})
            </p>
          </div>
        </div>

        {data.isProjected && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 text-xs self-start sm:self-auto">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
            <span>Projected Export Model</span>
          </div>
        )}
      </div>

      {/* Reconciliation Totals Overview Cards */}
      {data.totals && data.totals.length > 0 && (
        <div className="p-4 bg-slate-50/60 border-b border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {data.totals.map((tot, idx) => (
              <div 
                key={idx}
                className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-slate-700">
                    {tot.metricLabel}
                  </span>
                  {getStatusBadge(tot.status, tot.variancePercent)}
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">GA4 API:</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      {tot.ga4Total.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">BigQuery SQL:</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      {tot.bigQueryTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-400">Delta (BQ - GA4):</span>
                    <span className={`font-mono font-medium ${tot.delta >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                      {tot.delta >= 0 ? `+${tot.delta.toLocaleString()}` : tot.delta.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discrepancy Diagnostics */}
      {data.diagnostics && data.diagnostics.length > 0 && (
        <div className="p-4 border-b border-slate-100">
          <button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="w-full flex items-center justify-between text-left text-xs font-bold text-slate-800 hover:text-blue-600 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              <span>Technical Reconciliation Factors & Known Divergence Causes</span>
            </div>
            {showDiagnostics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showDiagnostics && (
            <div className="mt-3 space-y-2.5">
              {data.diagnostics.map((diag, i) => (
                <div 
                  key={i} 
                  className="p-3 rounded-xl bg-slate-50/90 border border-slate-200/80 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                      {diag.factor}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200/70 text-slate-700">
                      Impact: {diag.impact}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed pl-3 border-l-2 border-indigo-200">
                    {diag.explanation}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BigQuery SQL Used */}
      {data.generatedSql && (
        <div className="p-4 bg-slate-900 text-slate-200 text-xs">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setShowSql(!showSql)}
              className="flex items-center gap-2 font-mono font-medium text-cyan-300 hover:text-cyan-200 cursor-pointer"
            >
              <Code2 className="w-4 h-4" />
              <span>BigQuery Standard SQL Query</span>
              {showSql ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handleCopySql}
              className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono cursor-pointer transition-colors"
            >
              {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedSql ? 'Copied' : 'Copy SQL'}</span>
            </button>
          </div>

          {showSql && (
            <pre className="p-3 rounded-lg bg-slate-950 font-mono text-[11px] text-emerald-400 overflow-x-auto leading-relaxed border border-slate-800">
              {data.generatedSql}
            </pre>
          )}
        </div>
      )}

      {/* Informative Footer Note */}
      {data.notes && (
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{data.notes}</span>
        </div>
      )}
    </div>
  );
};
