import React, { useState } from 'react';
import { 
  Sparkles, 
  Activity, 
  TrendingUp, 
  Globe2, 
  DollarSign, 
  ArrowRight,
  Database,
  Code2, 
  Table, 
  Layers, 
  Users,
  GitCompare
} from 'lucide-react';
import { TrkknLogo } from './TrkknLogo';

interface QuickPromptsProps {
  onSelectPrompt: (promptText: string) => void;
  propertyName: string;
  isBigQueryEnabled?: boolean;
}

export const QuickPrompts: React.FC<QuickPromptsProps> = ({ 
  onSelectPrompt, 
  propertyName,
  isBigQueryEnabled = false
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'ga4' | 'bigquery' | 'compare'>('all');

  const ga4PromptGroups = [
    {
      icon: <Sparkles className="w-4 h-4 text-purple-600" />,
      title: 'Dynamic Field & Schema Discovery',
      source: 'ga4',
      prompts: [
        'Find every available dimension and metric in GA4 to power the MCP server',
        'Discover all custom dimensions, event parameters, and metrics configured for this property',
        'Show available GA4 dimensions and metrics grouped by category'
      ]
    },
    {
      icon: <TrendingUp className="w-4 h-4 text-blue-600" />,
      title: 'Real-Time & Immediate Trends',
      source: 'ga4',
      prompts: [
        'How many active users are on our website right now and in the last 30 minutes?',
        'What are the top real-time events triggered right now?',
        'Show real-time active users broken down by city'
      ]
    },
    {
      icon: <Users className="w-4 h-4 text-cyan-600" />,
      title: 'Acquisition & User Channels',
      source: 'ga4',
      prompts: [
        'What are our top traffic acquisition channels over the last 30 days?',
        'Show session counts and engagement rate by first user source / medium',
        'Which campaigns drove the most new users this month?'
      ]
    },
    {
      icon: <DollarSign className="w-4 h-4 text-emerald-600" />,
      title: 'Conversions & Value Delivery',
      source: 'ga4',
      prompts: [
        'Show key events (conversions) and total revenue over the last 30 days',
        'What is our overall conversion rate and bounce rate by device?',
        'Show top landing pages ranked by active users and total revenue'
      ]
    },
    {
      icon: <Globe2 className="w-4 h-4 text-indigo-600" />,
      title: 'Audience & Regional Insights',
      source: 'ga4',
      prompts: [
        'What are our top 10 countries by active users and revenue?',
        'Break down desktop, mobile, and tablet users with bounce rates',
        'Compare new users vs returning users over the last 90 days'
      ]
    }
  ];

  const bigQueryPromptGroups = [
    {
      icon: <Database className="w-4 h-4 text-indigo-600" />,
      title: 'BigQuery Datasets & Tables',
      source: 'bigquery',
      prompts: [
        'List all available BigQuery datasets in my connected Google Cloud Project',
        'Show all tables and row counts in my selected BigQuery dataset',
        'Find the largest tables by storage size and row count in my project'
      ]
    },
    {
      icon: <Layers className="w-4 h-4 text-indigo-600" />,
      title: 'Table Schema & Data Discovery',
      source: 'bigquery',
      prompts: [
        'Inspect the column schema, data types, and field descriptions of a table',
        'Preview the first 10 rows of data from a BigQuery table',
        'Run a standard SQL count query to verify the total records in my table'
      ]
    }
  ];

  const comparisonPromptGroups = [
    {
      icon: <GitCompare className="w-4 h-4 text-cyan-600" />,
      title: 'Cross-Source Reconciliation (GA4 vs BQ)',
      source: 'comparison',
      prompts: [
        'Compare active users and sessions between GA4 API and BigQuery raw events for the last 7 days',
        'Reconcile total event counts between BigQuery events_* tables and GA4 report and diagnose discrepancies',
        'Compare top traffic acquisition channels between GA4 UI reports and BigQuery SQL'
      ]
    },
    {
      icon: <TrendingUp className="w-4 h-4 text-indigo-600" />,
      title: 'Discrepancy & Variance Analysis',
      source: 'comparison',
      prompts: [
        'Why do active users in GA4 UI differ from COUNT(DISTINCT user_pseudo_id) in BigQuery?',
        'Compare conversion counts and session totals between GA4 and BigQuery with delta percentage',
        'Check data consistency and export latency between GA4 live report and BigQuery partition tables'
      ]
    },
    {
      icon: <Layers className="w-4 h-4 text-purple-600" />,
      title: 'MCP Specifications & Protocol Security',
      source: 'comparison',
      prompts: [
        'Explain how the Model Context Protocol (MCP) securely proxies GA4 and BigQuery',
        'Explain the 4-tier system architecture: Client, Gemini, MCP Server & Google Cloud',
        'How does the Model Context Protocol handle authentication with zero-storage?'
      ]
    }
  ];

  const displayedGroups = isBigQueryEnabled 
    ? (activeTab === 'bigquery' 
        ? bigQueryPromptGroups 
        : activeTab === 'compare' 
          ? comparisonPromptGroups 
          : activeTab === 'ga4' 
            ? ga4PromptGroups 
            : [...comparisonPromptGroups.slice(0, 1), ...ga4PromptGroups.slice(0, 2), ...bigQueryPromptGroups.slice(0, 1)])
    : ga4PromptGroups;

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4">
      <div className="text-center mb-8 space-y-4 flex flex-col items-center">
        {/* Main Brand Logo Header */}
        <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200/80 inline-flex items-center justify-center">
          <TrkknLogo variant="full" size="lg" />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-xs">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
          <span>Enterprise Intelligence</span>
          <span className="text-slate-400">•</span>
          <span className="text-cyan-300">{isBigQueryEnabled ? 'GA4 & BigQuery MCP (Cross-Reconciliation)' : 'GA4 MCP Active'}</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Explore Analytics for <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">{propertyName}</span>
        </h2>
        
        <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
          {isBigQueryEnabled && activeTab === 'compare'
            ? 'Reconcile GA4 aggregated API reports directly against BigQuery raw event export tables, computing delta variances and diagnosing thresholding or sessionization causes.'
            : isBigQueryEnabled && activeTab === 'bigquery'
              ? 'Discover datasets, inspect table schemas, and run standard BigQuery SQL queries with natural language.'
              : 'Ask questions in natural language. Powered by TRKKN\'s enterprise GA4 framework and Model Context Protocol to fetch verified dimensions, metrics, and interactive charts.'}
        </p>

        {/* Engine Tabs (Only displayed when BigQuery is enabled) */}
        {isBigQueryEnabled && (
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 gap-1 mt-3 flex-wrap justify-center">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Explorations
            </button>
            <button
              onClick={() => setActiveTab('compare')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'compare' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitCompare className="w-3 h-3" />
              Reconcile (GA4 vs BQ)
            </button>
            <button
              onClick={() => setActiveTab('ga4')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'ga4' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3 h-3" />
              GA4 Reports
            </button>
            <button
              onClick={() => setActiveTab('bigquery')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'bigquery' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database className="w-3 h-3" />
              BigQuery SQL
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayedGroups.map((group, gIdx) => (
          <div 
            key={gIdx} 
            className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-300 hover:shadow-sm transition-all space-y-2.5 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <span className="p-1 rounded-md bg-slate-100">{group.icon}</span>
                {group.title}
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                group.source === 'comparison'
                  ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                  : group.source === 'bigquery' 
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {group.source === 'comparison' ? 'GA4 vs BigQuery' : group.source === 'bigquery' ? 'BigQuery SQL' : 'GA4 Data API'}
              </span>
            </div>

            <div className="space-y-1.5">
              {group.prompts.map((p, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => onSelectPrompt(p)}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/70 hover:border-blue-200 text-xs font-medium transition-all flex items-center justify-between group cursor-pointer"
                >
                  <span className="truncate mr-2 font-medium">{p}</span>
                  <span className="text-slate-400 group-hover:text-blue-600 text-[11px] shrink-0 font-bold flex items-center gap-0.5">
                    Explore <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

