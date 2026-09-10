import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Layers, 
  BarChart2,
  Terminal,
  Activity,
  Calendar,
  Download,
  Filter,
  ArrowRight,
  Square
} from 'lucide-react';
import { ChatMessage, GA4Property } from '../types';
import { AnalyticsCharts } from './AnalyticsCharts';
import { DataTable } from './DataTable';
import { KPICards } from './KPICards';
import { MCPProtocolAccordion } from './MCPProtocolAccordion';
import { QuickPrompts } from './QuickPrompts';
import { FormattedMessage } from './FormattedMessage';

interface ChatAreaProps {
  messages: ChatMessage[];
  currentProperty: GA4Property | null;
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  onStopProcessing?: () => void;
  onOpenQueryBuilder: () => void;
  onOpenAuthModal?: () => void;
  isAuthenticated?: boolean;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  currentProperty,
  isLoading,
  onSendMessage,
  onStopProcessing,
  onOpenQueryBuilder,
  onOpenAuthModal,
  isAuthenticated = false
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const propName = currentProperty?.displayName || 'Google Analytics 4';

  return (
    <section className="flex-1 flex flex-col bg-white relative overflow-hidden h-full">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {!isAuthenticated && onOpenAuthModal && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Connect your Google Analytics 4 Properties
                </div>
                <p className="text-xs text-slate-300">
                  Authenticate securely to run queries and AI explorations directly against live GA4 Data API without sample data.
                </p>
              </div>
              <button
                onClick={onOpenAuthModal}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-xl text-xs font-bold shadow-xs shrink-0 cursor-pointer transition-all"
              >
                Sign in with Google
              </button>
            </div>
          )}

          {messages.length === 0 ? (
            <QuickPrompts 
              onSelectPrompt={onSendMessage} 
              propertyName={propName} 
            />
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col gap-2 ${
                  msg.role === 'user'
                    ? 'max-w-2xl self-start'
                    : 'max-w-4xl self-end items-end w-full'
                } animate-fadeIn`}
              >
                {/* Role Header indicator */}
                <div className={`flex items-center gap-2 text-xs font-semibold tracking-wider ${
                  msg.role === 'user' ? 'text-slate-400' : 'text-slate-400 self-start'
                }`}>
                  {msg.role === 'user' ? (
                    <>
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      USER
                    </>
                  ) : (
                    <>
                      <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></div>
                      TRKKN ASSISTANT
                      {msg.propertyContext && (
                        <span className="font-normal text-slate-400">
                          • {msg.propertyContext.name}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Message Box */}
                <div
                  className={`w-full ${
                    msg.role === 'user'
                      ? 'bg-slate-100 p-4 rounded-2xl rounded-tl-none text-sm text-slate-800 leading-relaxed shadow-2xs'
                      : 'bg-white border border-slate-200/90 p-5 rounded-2xl rounded-tr-none shadow-xs text-sm text-slate-700'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed text-slate-800 font-medium">
                      {msg.content}
                    </p>
                  ) : (
                    <FormattedMessage content={msg.content} />
                  )}

                  {/* KPI Cards */}
                  {msg.kpis && msg.kpis.length > 0 && (
                    <KPICards kpis={msg.kpis} />
                  )}

                  {/* Visual Chart */}
                  {msg.chart && (
                    <AnalyticsCharts config={msg.chart} />
                  )}

                  {/* Data Table */}
                  {msg.tableData && msg.tableData.rows.length > 0 && (
                    <DataTable data={msg.tableData} />
                  )}

                  {/* MCP Tool Call Logs Accordion */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <MCPProtocolAccordion toolCalls={msg.toolCalls} />
                  )}
                </div>
              </div>
            ))
          )}

          {/* Loading Skeleton & Stop Button */}
          {isLoading && (
            <div className="flex flex-col gap-2 max-w-4xl self-end items-end w-full">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2 text-xs text-blue-600 font-bold self-start">
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-ping"></div>
                  <span>EXECUTING MCP GA4 DATA QUERY...</span>
                </div>
                {onStopProcessing && (
                  <button
                    type="button"
                    id="chat-stop-processing-status-btn"
                    onClick={onStopProcessing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 hover:border-red-300 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                  >
                    <Square className="w-3 h-3 fill-red-600 text-red-600" />
                    <span>Stop Processing</span>
                  </button>
                )}
              </div>
              <div className="w-full bg-white border border-slate-200 p-5 rounded-2xl rounded-tr-none shadow-xs space-y-3 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-2/3"></div>
                <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                <div className="h-32 bg-slate-50 border border-slate-100 rounded-xl"></div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Form Bar */}
      <div className="p-4 sm:p-6 bg-white border-t border-slate-200/90 shrink-0">
        <div className="max-w-4xl mx-auto">
          {/* Main Input Box */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 focus-within:bg-white transition-all shadow-2xs"
          >
            <textarea
              ref={textareaRef}
              id="chat-input-textarea"
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isLoading ? "Query is currently executing..." : `Ask a question about your GA4 data in ${propName}...`}
              disabled={isLoading}
              className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-hidden text-sm px-3 text-slate-900 resize-none max-h-32 placeholder-slate-400 font-normal disabled:opacity-60"
            />
            {isLoading ? (
              <button
                type="button"
                id="chat-stop-btn"
                onClick={onStopProcessing}
                title="Stop processing current query"
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 animate-pulse"
              >
                <Square className="w-3.5 h-3.5 fill-white text-white" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                id="chat-send-btn"
                disabled={!inputText.trim()}
                className="bg-slate-900 hover:bg-slate-800 text-white p-2.5 rounded-xl transition-all shrink-0 disabled:opacity-30 disabled:cursor-not-allowed shadow-xs cursor-pointer flex items-center justify-center group"
              >
                <Send className="w-4 h-4 text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            )}
          </form>

          {/* Quick Action Footer Buttons */}
          <div className="mt-3 flex flex-wrap justify-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <button
              type="button"
              onClick={() => onSendMessage('Compare active users and sessions between this month vs last month')}
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              Compare Periods
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => onSendMessage('Show top 10 landing pages with views, users, and average session duration')}
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              Top Landing Pages
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={onOpenQueryBuilder}
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              Query Builder
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
