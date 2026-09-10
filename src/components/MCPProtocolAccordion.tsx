import React, { useState } from 'react';
import { 
  Terminal, 
  ChevronDown, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check 
} from 'lucide-react';
import { MCPToolCallInfo } from '../types';

interface MCPProtocolAccordionProps {
  toolCalls: MCPToolCallInfo[];
}

export const MCPProtocolAccordion: React.FC<MCPProtocolAccordionProps> = ({ toolCalls }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  if (!toolCalls || toolCalls.length === 0) return null;

  const copyJSON = (obj: any, idx: number) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="my-2.5 rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden text-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2 flex items-center justify-between bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Terminal className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-semibold text-slate-800">MCP Protocol Invocations</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-white border border-slate-200 text-slate-500 font-mono">
            {toolCalls.length} {toolCalls.length === 1 ? 'tool call' : 'tool calls'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <span className="text-[11px] hidden sm:inline">
            {isOpen ? 'Hide MCP payloads' : 'Inspect JSON-RPC protocol'}
          </span>
          {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-600" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-600" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-3 divide-y divide-slate-200 space-y-3 bg-white font-mono text-[11px]">
          {toolCalls.map((tc, idx) => (
            <div key={idx} className="pt-2 first:pt-0 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <div className="flex items-center gap-2">
                  {tc.status === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : tc.status === 'error' ? (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                  )}
                  <span className="font-bold text-blue-700">{tc.toolName}</span>
                  {tc.durationMs !== undefined && (
                    <span className="text-slate-400 text-[10px]">({tc.durationMs}ms)</span>
                  )}
                </div>

                <button
                  onClick={() => copyJSON(tc, idx)}
                  className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-slate-900 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200"
                >
                  {copiedIdx === idx ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  {copiedIdx === idx ? 'Copied' : 'Copy JSON'}
                </button>
              </div>

              {/* Arguments */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-700 overflow-x-auto">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-sans font-bold">
                  Tool Arguments (Schema Input)
                </div>
                <pre className="text-[11px] leading-relaxed whitespace-pre-wrap">
                  {JSON.stringify(tc.arguments, null, 2)}
                </pre>
              </div>

              {/* Response summary */}
              {tc.error ? (
                <div className="bg-rose-50 border border-rose-200 p-2 rounded text-rose-700 text-[11px]">
                  Error: {tc.error}
                </div>
              ) : tc.response ? (
                <div className="bg-slate-50/80 p-2 rounded border border-slate-200 text-slate-600 max-h-36 overflow-y-auto">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5 font-sans font-bold">
                    MCP Output
                  </div>
                  <pre className="text-[10px] text-slate-700 whitespace-pre-wrap">
                    {JSON.stringify(tc.response, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
