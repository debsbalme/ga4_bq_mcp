import React, { useState, useEffect } from 'react';
import { 
  X, 
  Terminal, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Layers, 
  Check, 
  RefreshCw,
  Code,
  Sliders,
  Sparkles
} from 'lucide-react';
import { GA4Property } from '../types';

interface MCPInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProperty: GA4Property | null;
  accessToken?: string;
}

export const MCPInspectorModal: React.FC<MCPInspectorModalProps> = ({
  isOpen,
  onClose,
  currentProperty,
  accessToken
}) => {
  const [tools, setTools] = useState<any[]>([]);
  const [selectedTool, setSelectedTool] = useState<string>('ga4_run_report');
  const [toolParamsJson, setToolParamsJson] = useState<string>('');
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [isLoadingTools, setIsLoadingTools] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingTools(true);
      fetch('/api/mcp/tools')
        .then(res => res.json())
        .then(data => {
          if (data.tools) {
            setTools(data.tools);
          }
        })
        .catch(err => console.warn('Could not load MCP tools list:', err))
        .finally(() => setIsLoadingTools(false));
    }
  }, [isOpen]);

  useEffect(() => {
    const propId = currentProperty?.propertyId || '318492041';
    if (selectedTool === 'ga4_run_report') {
      setToolParamsJson(JSON.stringify({
        propertyId: propId,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'conversions' }],
        limit: 10
      }, null, 2));
    } else if (selectedTool === 'ga4_run_realtime_report') {
      setToolParamsJson(JSON.stringify({
        propertyId: propId,
        metrics: [{ name: 'activeUsers' }],
        dimensions: [{ name: 'country' }],
        limit: 10
      }, null, 2));
    } else if (selectedTool === 'ga4_list_accounts_and_properties') {
      setToolParamsJson(JSON.stringify({}, null, 2));
    } else if (selectedTool === 'ga4_get_metadata') {
      setToolParamsJson(JSON.stringify({
        propertyId: propId
      }, null, 2));
    }
  }, [selectedTool, currentProperty]);

  if (!isOpen) return null;

  const handleExecute = async () => {
    setIsExecuting(true);
    setExecutionResult(null);

    try {
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(toolParamsJson);
      } catch (err: any) {
        setExecutionResult({ error: `JSON Parse Error: ${err.message}` });
        setIsExecuting(false);
        return;
      }

      const res = await fetch('/api/mcp/call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
          name: selectedTool,
          arguments: parsedArgs
        })
      });

      const data = await res.json();
      setExecutionResult(data);
    } catch (err: any) {
      setExecutionResult({ error: err.message || 'Execution failed' });
    } finally {
      setIsExecuting(false);
    }
  };

  const copyResult = () => {
    navigator.clipboard.writeText(JSON.stringify(executionResult, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">MCP Protocol Inspector</h2>
              <p className="text-xs text-slate-500">Model Context Protocol server schema & direct tool execution console</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200 overflow-hidden">
          {/* Left Sidebar: Tool Selector */}
          <div className="md:col-span-4 p-4 overflow-y-auto space-y-2 bg-slate-50">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Registered MCP Tools
            </div>
            {tools.map((t) => (
              <button
                key={t.name}
                onClick={() => { setSelectedTool(t.name); setExecutionResult(null); }}
                className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                  selectedTool === t.name
                    ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-2xs'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <div className="font-semibold font-mono text-xs text-blue-700">{t.name}</div>
                <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{t.description}</div>
              </button>
            ))}
          </div>

          {/* Right Panel: Tool Payload & Exec Result */}
          <div className="md:col-span-8 p-5 flex flex-col overflow-y-auto space-y-4 bg-white text-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-blue-600" />
                  JSON-RPC Arguments Payload
                </label>
                <span className="text-[11px] text-slate-400 font-mono">Target: {currentProperty.displayName}</span>
              </div>
              <textarea
                rows={7}
                value={toolParamsJson}
                onChange={(e) => setToolParamsJson(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-900 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[11px]">Direct execution invokes Express MCP route <code>/api/mcp/call</code></span>
              <button
                id="btn-execute-mcp-tool"
                disabled={isExecuting}
                onClick={handleExecute}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isExecuting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                Execute MCP Tool
              </button>
            </div>

            {/* Execution Result Box */}
            {executionResult && (
              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    {executionResult.error ? <AlertCircle className="w-4 h-4 text-rose-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    MCP Output Stream
                  </span>
                  <button
                    onClick={copyResult}
                    className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900 px-2 py-0.5 rounded bg-slate-100 border border-slate-200"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-800 max-h-56 overflow-y-auto">
                  <pre className="whitespace-pre-wrap leading-relaxed">
                    {JSON.stringify(executionResult, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Protocol standard: <span className="font-mono text-slate-700">modelcontextprotocol/spec 2024-11</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-md text-slate-600 hover:text-slate-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
