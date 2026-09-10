import React, { useState } from 'react';
import { 
  X, 
  SlidersHorizontal, 
  Play, 
  Calendar, 
  Layers, 
  BarChart3, 
  Filter
} from 'lucide-react';
import { GA4Property } from '../types';
import { GA4_METRICS, GA4_DIMENSIONS, DATE_PRESETS } from '../data/ga4Catalog';

interface QueryBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProperty: GA4Property | null;
  onSubmitQuery: (promptText: string) => void;
}

export const QueryBuilderModal: React.FC<QueryBuilderModalProps> = ({
  isOpen,
  onClose,
  currentProperty,
  onSubmitQuery
}) => {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['activeUsers', 'sessions', 'conversions']);
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>(['sessionDefaultChannelGroup']);
  const [selectedDatePreset, setSelectedDatePreset] = useState<string>('30daysAgo:today');
  const [metricFilter, setMetricFilter] = useState('');
  const [dimensionFilter, setDimensionFilter] = useState('');

  if (!isOpen) return null;

  const toggleMetric = (id: string) => {
    if (selectedMetrics.includes(id)) {
      if (selectedMetrics.length > 1) {
        setSelectedMetrics(selectedMetrics.filter(m => m !== id));
      }
    } else {
      setSelectedMetrics([...selectedMetrics, id]);
    }
  };

  const toggleDimension = (id: string) => {
    if (selectedDimensions.includes(id)) {
      if (selectedDimensions.length > 1) {
        setSelectedDimensions(selectedDimensions.filter(d => d !== id));
      }
    } else {
      setSelectedDimensions([...selectedDimensions, id]);
    }
  };

  const handleExecute = () => {
    const metricNames = selectedMetrics.map(id => GA4_METRICS.find(m => m.id === id)?.name || id).join(', ');
    const dimNames = selectedDimensions.map(id => GA4_DIMENSIONS.find(d => d.id === id)?.name || id).join(', ');
    const dateLabel = DATE_PRESETS.find(dp => `${dp.startDate}:${dp.endDate}` === selectedDatePreset)?.label || 'Selected Period';

    const naturalQuery = `Query ${currentProperty ? currentProperty.displayName : 'GA4'} for ${dateLabel}: Show ${metricNames} broken down by ${dimNames}.`;
    onSubmitQuery(naturalQuery);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">GA4 Visual Query Builder</h2>
              <p className="text-xs text-slate-500">Compose custom GA4 dimensions and metrics for {currentProperty?.displayName || 'your property'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Builder Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs text-slate-700">
          {/* Date Preset Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Date Range
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DATE_PRESETS.map((dp, idx) => {
                const val = `${dp.startDate}:${dp.endDate}`;
                const isSelected = selectedDatePreset === val;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedDatePreset(val)}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {dp.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Metrics Picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                Select Metrics ({selectedMetrics.length} selected)
              </label>
              <input
                type="text"
                value={metricFilter}
                onChange={(e) => setMetricFilter(e.target.value)}
                placeholder="Filter metrics..."
                className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-[11px] w-36"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1.5 bg-slate-50/50 rounded-xl border border-slate-200">
              {GA4_METRICS.filter(m => m.name.toLowerCase().includes(metricFilter.toLowerCase()) || m.id.toLowerCase().includes(metricFilter.toLowerCase())).map((m) => {
                const isSelected = selectedMetrics.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMetric(m.id)}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-semibold text-[11px] truncate">{m.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">{m.id}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dimensions Picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Select Dimensions ({selectedDimensions.length} selected)
              </label>
              <input
                type="text"
                value={dimensionFilter}
                onChange={(e) => setDimensionFilter(e.target.value)}
                placeholder="Filter dimensions..."
                className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-[11px] w-36"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1.5 bg-slate-50/50 rounded-xl border border-slate-200">
              {GA4_DIMENSIONS.filter(d => d.name.toLowerCase().includes(dimensionFilter.toLowerCase()) || d.id.toLowerCase().includes(dimensionFilter.toLowerCase())).map((d) => {
                const isSelected = selectedDimensions.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDimension(d.id)}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-blue-400 text-blue-900'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-semibold text-[11px] truncate">{d.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">{d.id}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Selected: <span className="text-slate-800 font-semibold">{selectedMetrics.length} metrics</span>, <span className="text-slate-800 font-semibold">{selectedDimensions.length} dimensions</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              id="btn-execute-visual-query"
              onClick={handleExecute}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Generate & Query GA4
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
