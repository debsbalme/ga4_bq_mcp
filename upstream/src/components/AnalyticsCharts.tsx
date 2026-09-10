import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { ChartVisualizationConfig } from '../types';
import { BarChart3, TrendingUp, Layers } from 'lucide-react';

interface AnalyticsChartsProps {
  config: ChartVisualizationConfig;
}

// Helper function to sort chart data chronologically if the xAxis is date or time bound
function sortChartDataChronologically(data: Record<string, any>[], xAxisKey: string): Record<string, any>[] {
  if (!data || data.length <= 1) return data;

  const keyLower = xAxisKey.toLowerCase();
  const isDateKey = 
    keyLower.includes('date') ||
    keyLower.includes('time') ||
    keyLower.includes('hour') ||
    keyLower.includes('minute') ||
    keyLower.includes('month') ||
    keyLower.includes('year') ||
    keyLower.includes('day') ||
    keyLower.includes('period') ||
    keyLower.includes('week');

  // Check if data is real-time minutesAgo (timeline flows from past ~30m ago to present 0m/now)
  if (keyLower === 'minutesago') {
    return [...data].sort((a, b) => Number(b[xAxisKey] || 0) - Number(a[xAxisKey] || 0));
  }

  // Check if values are GA4 8-digit date strings YYYYMMDD
  const isYYYYMMDD = data.every(item => {
    const v = String(item[xAxisKey] ?? '').trim();
    return /^\d{8}$/.test(v);
  });

  if (isYYYYMMDD) {
    return [...data].sort((a, b) => String(a[xAxisKey] || '').localeCompare(String(b[xAxisKey] || '')));
  }

  // Check if values are ISO format (e.g. YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
  const isISODate = data.every(item => {
    const v = String(item[xAxisKey] ?? '').trim();
    return /^\d{4}-\d{2}-\d{2}/.test(v);
  });

  if (isISODate) {
    return [...data].sort((a, b) => new Date(a[xAxisKey]).getTime() - new Date(b[xAxisKey]).getTime());
  }

  // Check if values are 10-digit dateHour (YYYYMMDDHH) or 12-digit dateHourMinute (YYYYMMDDHHMM)
  const isDateHour = data.every(item => {
    const v = String(item[xAxisKey] ?? '').trim();
    return /^\d{10,12}$/.test(v);
  });

  if (isDateHour) {
    return [...data].sort((a, b) => String(a[xAxisKey] || '').localeCompare(String(b[xAxisKey] || '')));
  }

  // If the key is explicitly a date/time dimension
  if (isDateKey) {
    const allNumeric = data.every(item => item[xAxisKey] !== undefined && !isNaN(Number(item[xAxisKey])));
    if (allNumeric) {
      return [...data].sort((a, b) => Number(a[xAxisKey]) - Number(b[xAxisKey]));
    }
    const allParseable = data.every(item => item[xAxisKey] && !isNaN(Date.parse(String(item[xAxisKey]))));
    if (allParseable) {
      return [...data].sort((a, b) => new Date(a[xAxisKey]).getTime() - new Date(b[xAxisKey]).getTime());
    }
    return [...data].sort((a, b) => String(a[xAxisKey] || '').localeCompare(String(b[xAxisKey] || '')));
  }

  return data;
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ config }) => {
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>(config.type === 'pie' ? 'bar' : config.type);
  const [visibleKeys, setVisibleKeys] = useState<string[]>(config.dataKeys.map(d => d.key));

  if (!config.data || config.data.length === 0) {
    return null;
  }

  // Ensure data is chronologically sorted on the X-axis for all time/date dimensions
  const sortedData = sortChartDataChronologically(config.data, config.xAxisKey);

  const toggleKey = (key: string) => {
    if (visibleKeys.includes(key)) {
      if (visibleKeys.length > 1) {
        setVisibleKeys(visibleKeys.filter(k => k !== key));
      }
    } else {
      setVisibleKeys([...visibleKeys, key]);
    }
  };

  const formatXAxis = (tickItem: any) => {
    if (typeof tickItem === 'string' || typeof tickItem === 'number') {
      const str = String(tickItem).trim();
      
      // GA4 Date: YYYYMMDD
      if (str.length === 8 && /^\d{8}$/.test(str)) {
        const m = str.substring(4, 6);
        const d = str.substring(6, 8);
        return `${m}/${d}`;
      }

      // GA4 DateHour: YYYYMMDDHH
      if (str.length === 10 && /^\d{10}$/.test(str)) {
        const m = str.substring(4, 6);
        const d = str.substring(6, 8);
        const h = str.substring(8, 10);
        return `${m}/${d} ${h}:00`;
      }

      // GA4 Minutes Ago: '0' -> 'Now', '5' -> '5m ago'
      if (config.xAxisKey.toLowerCase() === 'minutesago') {
        if (str === '0' || str === '00') return 'Now';
        return `${str}m ago`;
      }

      // Standard ISO Date: YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const parts = str.split('-');
        return `${parts[1]}/${parts[2]}`;
      }

      if (str.length > 16) {
        return str.substring(0, 15) + '...';
      }
    }
    return tickItem;
  };

  const formatTooltipValue = (value: any, name: any) => {
    if (typeof value === 'number') {
      if (name.toLowerCase().includes('revenue')) {
        return [`$${value.toLocaleString()}`, name];
      }
      if (name.toLowerCase().includes('rate')) {
        return [`${(value * 100).toFixed(1)}%`, name];
      }
      return [value.toLocaleString(), name];
    }
    return [value, name];
  };

  const colors = ['#0062FF', '#00C2FF', '#10B981', '#6366F1', '#F59E0B', '#EC4899'];

  return (
    <div className="my-4 p-4 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs">
      {/* Chart Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200">
        <div>
          <h4 className="text-xs sm:text-sm font-semibold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            {config.title || 'GA4 Performance Visualizer'}
          </h4>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 self-start sm:self-auto shadow-2xs">
          <button
            onClick={() => setChartType('line')}
            className={`p-1.5 rounded text-xs font-medium transition-colors ${
              chartType === 'line' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Line Trend Chart"
          >
            <TrendingUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`p-1.5 rounded text-xs font-medium transition-colors ${
              chartType === 'bar' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Bar Chart"
          >
            <BarChart3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setChartType('area')}
            className={`p-1.5 rounded text-xs font-medium transition-colors ${
              chartType === 'area' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Area Chart"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Metric Selector Pills */}
      <div className="flex items-center gap-2 mb-3 flex-wrap text-xs">
        <span className="text-[11px] text-slate-500 font-medium">Active Metrics:</span>
        {config.dataKeys.map((dk, idx) => {
          const isActive = visibleKeys.includes(dk.key);
          const color = dk.color || colors[idx % colors.length];
          return (
            <button
              key={dk.key}
              onClick={() => toggleKey(dk.key)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 border transition-all ${
                isActive
                  ? 'bg-white border-slate-300 text-slate-800 shadow-2xs'
                  : 'bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-600'
              }`}
            >
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: isActive ? color : '#94a3b8' }} 
              />
              {dk.label}
            </button>
          );
        })}
      </div>

      {/* Responsive Chart Stage */}
      <div className="w-full h-64 sm:h-72 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart data={sortedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey={config.xAxisKey} tickFormatter={formatXAxis} stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip 
                formatter={formatTooltipValue}
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: '#0f172a' }}
              />
              {config.dataKeys.filter(dk => visibleKeys.includes(dk.key)).map((dk, idx) => (
                <Line
                  key={dk.key}
                  type="monotone"
                  dataKey={dk.key}
                  name={dk.label}
                  stroke={dk.color || colors[idx % colors.length]}
                  strokeWidth={2.5}
                  dot={{ r: 3, strokeWidth: 1, fill: '#ffffff' }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          ) : chartType === 'bar' ? (
            <BarChart data={sortedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey={config.xAxisKey} tickFormatter={formatXAxis} stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip 
                formatter={formatTooltipValue}
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: '#0f172a' }}
              />
              {config.dataKeys.filter(dk => visibleKeys.includes(dk.key)).map((dk, idx) => (
                <Bar
                  key={dk.key}
                  dataKey={dk.key}
                  name={dk.label}
                  fill={dk.color || colors[idx % colors.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          ) : (
            <AreaChart data={sortedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey={config.xAxisKey} tickFormatter={formatXAxis} stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip 
                formatter={formatTooltipValue}
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: '#0f172a' }}
              />
              {config.dataKeys.filter(dk => visibleKeys.includes(dk.key)).map((dk, idx) => (
                <Area
                  key={dk.key}
                  type="monotone"
                  dataKey={dk.key}
                  name={dk.label}
                  stroke={dk.color || colors[idx % colors.length]}
                  fill={dk.color || colors[idx % colors.length]}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
