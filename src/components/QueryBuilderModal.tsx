import React, { useState, useEffect } from 'react';
import { 
  X, 
  SlidersHorizontal, 
  Play, 
  Calendar, 
  Layers, 
  BarChart3, 
  Search,
  RefreshCw,
  Sparkles,
  Database,
  Info,
  Check
} from 'lucide-react';
import { GA4Property, GA4DimensionMetadata, GA4MetricMetadata } from '../types';

export const DATE_PRESETS = [
  { label: 'Today', startDate: 'today', endDate: 'today' },
  { label: 'Yesterday', startDate: 'yesterday', endDate: 'yesterday' },
  { label: 'Last 7 Days', startDate: '7daysAgo', endDate: 'yesterday' },
  { label: 'Last 28 Days', startDate: '28daysAgo', endDate: 'yesterday' },
  { label: 'Last 30 Days', startDate: '30daysAgo', endDate: 'today' },
  { label: 'Last 90 Days', startDate: '90daysAgo', endDate: 'today' },
  { label: 'Year to Date', startDate: '365daysAgo', endDate: 'today' },
];

const DEFAULT_DIMENSIONS: GA4DimensionMetadata[] = [
  { apiName: 'sessionDefaultChannelGroup', uiName: 'Default Channel Group', category: 'Traffic source', description: 'Rule-based classification of traffic sources.' },
  { apiName: 'sessionSourceMedium', uiName: 'Source / Medium', category: 'Traffic source', description: 'The source and medium that initiated the session.' },
  { apiName: 'date', uiName: 'Date', category: 'Time', description: 'The date in YYYYMMDD format.' },
  { apiName: 'country', uiName: 'Country', category: 'Geography', description: 'Country from which user activity originated.' },
  { apiName: 'city', uiName: 'City', category: 'Geography', description: 'City from which user activity originated.' },
  { apiName: 'deviceCategory', uiName: 'Device Category', category: 'Device', description: 'Device category (desktop, mobile, tablet).' },
  { apiName: 'pageTitle', uiName: 'Page Title', category: 'Page / screen', description: 'Web page title or screen name.' },
  { apiName: 'eventName', uiName: 'Event Name', category: 'Event', description: 'Name of the triggered event.' }
];

const DEFAULT_METRICS: GA4MetricMetadata[] = [
  { apiName: 'activeUsers', uiName: 'Active Users', category: 'User', description: 'Number of distinct active users.' },
  { apiName: 'sessions', uiName: 'Sessions', category: 'Traffic', description: 'Number of sessions that began on your site or app.' },
  { apiName: 'screenPageViews', uiName: 'Views (Pageviews)', category: 'Page / screen', description: 'Total number of screens and web pages viewed.' },
  { apiName: 'conversions', uiName: 'Key Events (Conversions)', category: 'Ecommerce', description: 'Count of key conversion events triggered.' },
  { apiName: 'totalRevenue', uiName: 'Total Revenue', category: 'Ecommerce', description: 'Total revenue from purchases and ads.' },
  { apiName: 'eventCount', uiName: 'Event Count', category: 'Event', description: 'Count of all triggered events.' },
  { apiName: 'bounceRate', uiName: 'Bounce Rate', category: 'Engagement', description: 'Percentage of sessions that were not engaged.' },
  { apiName: 'averageSessionDuration', uiName: 'Avg Session Duration', category: 'Engagement', description: 'Average session length in seconds.' }
];

interface QueryBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProperty: GA4Property | null;
  accessToken?: string;
  onSubmitQuery: (promptText: string) => void;
}

export const QueryBuilderModal: React.FC<QueryBuilderModalProps> = ({
  isOpen,
  onClose,
  currentProperty,
  accessToken,
  onSubmitQuery
}) => {
  const [dimensions, setDimensions] = useState<GA4DimensionMetadata[]>(DEFAULT_DIMENSIONS);
  const [metrics, setMetrics] = useState<GA4MetricMetadata[]>(DEFAULT_METRICS);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveMetadata, setIsLiveMetadata] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['activeUsers', 'sessions', 'conversions']);
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>(['sessionDefaultChannelGroup']);
  const [selectedDatePreset, setSelectedDatePreset] = useState<string>('30daysAgo:today');
  const [metricFilter, setMetricFilter] = useState('');
  const [dimensionFilter, setDimensionFilter] = useState('');

  const fetchMetadata = async () => {
    const propId = currentProperty?.propertyId || '318492041';
    setIsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (accessToken && accessToken !== 'demo_token') {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      const res = await fetch(`/api/ga4/metadata?propertyId=${propId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.dimensions && data.dimensions.length > 0) {
          setDimensions(data.dimensions);
        }
        if (data.metrics && data.metrics.length > 0) {
          setMetrics(data.metrics);
        }
        setIsLiveMetadata(Boolean(data.isLive));
      }
    } catch (err) {
      console.warn('Could not fetch dynamic GA4 metadata, falling back to cached standard list:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMetadata();
    }
  }, [isOpen, currentProperty?.propertyId, accessToken]);

  if (!isOpen) return null;

  const categories = ['All', ...Array.from(new Set([
    ...dimensions.map(d => d.category || 'Standard'),
    ...metrics.map(m => m.category || 'Standard')
  ])).filter(Boolean)].sort((a, b) => {
    if (a === 'All') return -1;
    if (b === 'All') return 1;
    if (a === 'Custom') return -1;
    if (b === 'Custom') return 1;
    return a.localeCompare(b);
  });

  const toggleMetric = (apiName: string) => {
    if (selectedMetrics.includes(apiName)) {
      if (selectedMetrics.length > 1) {
        setSelectedMetrics(selectedMetrics.filter(m => m !== apiName));
      }
    } else {
      setSelectedMetrics([...selectedMetrics, apiName]);
    }
  };

  const toggleDimension = (apiName: string) => {
    if (selectedDimensions.includes(apiName)) {
      if (selectedDimensions.length > 1) {
        setSelectedDimensions(selectedDimensions.filter(d => d !== apiName));
      }
    } else {
      setSelectedDimensions([...selectedDimensions, apiName]);
    }
  };

  const handleExecute = () => {
    const metricNames = selectedMetrics.map(id => {
      const m = metrics.find(item => item.apiName === id);
      return m ? `${m.uiName} (\`${m.apiName}\`)` : `\`${id}\``;
    }).join(', ');

    const dimNames = selectedDimensions.map(id => {
      const d = dimensions.find(item => item.apiName === id);
      return d ? `${d.uiName} (\`${d.apiName}\`)` : `\`${id}\``;
    }).join(', ');

    const dateLabel = DATE_PRESETS.find(dp => `${dp.startDate}:${dp.endDate}` === selectedDatePreset)?.label || 'Selected Period';

    const naturalQuery = `Query ${currentProperty ? currentProperty.displayName : 'GA4'} for ${dateLabel}: Show ${metricNames} broken down by ${dimNames}.`;
    onSubmitQuery(naturalQuery);
    onClose();
  };

  const filteredMetrics = metrics.filter(m => {
    const matchesCategory = activeCategory === 'All' || m.category === activeCategory || (activeCategory === 'Custom' && m.customDefinition);
    const matchesSearch = !metricFilter || 
      m.uiName.toLowerCase().includes(metricFilter.toLowerCase()) || 
      m.apiName.toLowerCase().includes(metricFilter.toLowerCase()) ||
      m.description.toLowerCase().includes(metricFilter.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredDimensions = dimensions.filter(d => {
    const matchesCategory = activeCategory === 'All' || d.category === activeCategory || (activeCategory === 'Custom' && d.customDefinition);
    const matchesSearch = !dimensionFilter || 
      d.uiName.toLowerCase().includes(dimensionFilter.toLowerCase()) || 
      d.apiName.toLowerCase().includes(dimensionFilter.toLowerCase()) ||
      d.description.toLowerCase().includes(dimensionFilter.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">GA4 Dynamic Query Builder</h2>
                {isLiveMetadata ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">
                    <Sparkles className="w-3 h-3 text-emerald-500" />
                    Live API Discovery ({dimensions.length} dims, {metrics.length} metrics)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 border border-blue-200 text-blue-700">
                    <Database className="w-3 h-3 text-blue-500" />
                    GA4 Discovery Engine
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Directly inspects every dimension and metric from the GA4 API for <span className="font-semibold text-slate-700">{currentProperty?.displayName || 'Active Property'}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchMetadata}
              disabled={isLoading}
              title="Refresh available GA4 dimensions and metrics"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Category Filter Toolbar */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1">Category:</span>
          {categories.map((cat) => {
            const isSelected = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {cat}
                {cat === 'Custom' && (
                  <span className="ml-1.5 px-1 py-0.2 rounded text-[9px] bg-purple-100 text-purple-800 font-bold">
                    Custom
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Builder Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs text-slate-700">
          {/* Date Preset Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Date Range
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {DATE_PRESETS.map((dp, idx) => {
                const val = `${dp.startDate}:${dp.endDate}`;
                const isSelected = selectedDatePreset === val;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedDatePreset(val)}
                    className={`py-2 px-2.5 rounded-lg border text-xs font-medium transition-all text-center cursor-pointer ${
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
                Select Metrics ({selectedMetrics.length} selected, {filteredMetrics.length} available)
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={metricFilter}
                  onChange={(e) => setMetricFilter(e.target.value)}
                  placeholder="Search all metrics..."
                  className="pl-8 pr-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-[11px] w-48 focus:outline-hidden focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-44 overflow-y-auto p-2 bg-slate-50/50 rounded-xl border border-slate-200">
              {filteredMetrics.length === 0 ? (
                <div className="col-span-full py-6 text-center text-slate-400 text-xs">
                  No metrics match your search criteria
                </div>
              ) : (
                filteredMetrics.map((m) => {
                  const isSelected = selectedMetrics.includes(m.apiName);
                  return (
                    <button
                      key={m.apiName}
                      type="button"
                      onClick={() => toggleMetric(m.apiName)}
                      title={m.description || m.uiName}
                      className={`p-2.5 rounded-lg border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <div className="font-semibold text-[11px] truncate flex-1">{m.uiName}</div>
                        {m.customDefinition ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 shrink-0">
                            Custom
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-400 font-mono shrink-0">
                            {m.category || 'Standard'}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate">{m.apiName}</div>
                      {m.description && (
                        <div className="text-[9.5px] text-slate-400 line-clamp-1 mt-0.5">{m.description}</div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Dimensions Picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Select Dimensions ({selectedDimensions.length} selected, {filteredDimensions.length} available)
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={dimensionFilter}
                  onChange={(e) => setDimensionFilter(e.target.value)}
                  placeholder="Search all dimensions..."
                  className="pl-8 pr-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-[11px] w-48 focus:outline-hidden focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-44 overflow-y-auto p-2 bg-slate-50/50 rounded-xl border border-slate-200">
              {filteredDimensions.length === 0 ? (
                <div className="col-span-full py-6 text-center text-slate-400 text-xs">
                  No dimensions match your search criteria
                </div>
              ) : (
                filteredDimensions.map((d) => {
                  const isSelected = selectedDimensions.includes(d.apiName);
                  return (
                    <button
                      key={d.apiName}
                      type="button"
                      onClick={() => toggleDimension(d.apiName)}
                      title={d.description || d.uiName}
                      className={`p-2.5 rounded-lg border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 border-blue-400 text-blue-950 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <div className="font-semibold text-[11px] truncate flex-1">{d.uiName}</div>
                        {d.customDefinition ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 shrink-0">
                            Custom
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-400 font-mono shrink-0">
                            {d.category || 'Standard'}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate">{d.apiName}</div>
                      {d.description && (
                        <div className="text-[9.5px] text-slate-400 line-clamp-1 mt-0.5">{d.description}</div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <div>
              Selected: <span className="text-slate-800 font-semibold">{selectedMetrics.length} metrics</span>, <span className="text-slate-800 font-semibold">{selectedDimensions.length} dimensions</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 text-xs font-medium cursor-pointer"
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
