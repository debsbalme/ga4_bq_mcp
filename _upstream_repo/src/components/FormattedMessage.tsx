import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  Code2, 
  ChevronDown, 
  ChevronRight, 
  BarChart2, 
  Layers, 
  Table as TableIcon,
  Sparkles,
  TrendingUp,
  FileText
} from 'lucide-react';

interface FormattedMessageProps {
  content: string;
}

export const FormattedMessage: React.FC<FormattedMessageProps> = ({ content }) => {
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<string | null>(null);
  const [isRawJsonExpanded, setIsRawJsonExpanded] = useState(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeIdx(id);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  // Helper to test if a string is valid JSON
  const tryParseJSON = (str: string): any => {
    const trimmed = str.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return null;
      }
    }
    return null;
  };

  // Check if content is exclusively a JSON code block or raw JSON
  const jsonCodeBlockRegex = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;
  const match = content.trim().match(jsonCodeBlockRegex);
  const extractedRawJson = match ? match[1] : content;
  const parsedJson = tryParseJSON(extractedRawJson);

  // If the message is a raw GA4 report or JSON payload, render a rich structured view
  if (parsedJson && typeof parsedJson === 'object') {
    const isGA4Report = (parsedJson.dimensionHeaders || parsedJson.metricHeaders || parsedJson.rows);

    if (isGA4Report) {
      const dimHeaders: string[] = (parsedJson.dimensionHeaders || []).map((d: any) => d.name || String(d));
      const metHeaders: string[] = (parsedJson.metricHeaders || []).map((m: any) => m.name || String(m));
      const rows: any[] = parsedJson.rows || [];
      const rowCount = parsedJson.rowCount || rows.length;

      return (
        <div className="space-y-4 text-slate-800 text-sm">
          {/* Executive Header Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200/80">
            <div className="flex items-center gap-2 font-bold text-blue-900 text-sm mb-1.5">
              <BarChart2 className="w-4 h-4 text-blue-600" />
              <span>Google Analytics 4 Data Report</span>
            </div>
            <p className="text-xs text-blue-800/80">
              Retrieved <strong className="text-blue-950 font-semibold">{rowCount} records</strong> across{' '}
              <strong className="text-blue-950 font-semibold">{metHeaders.length} metrics</strong> and{' '}
              <strong className="text-blue-950 font-semibold">{dimHeaders.length} dimensions</strong>.
            </p>

            {/* Badges for Dimensions and Metrics */}
            <div className="mt-3 flex flex-wrap gap-2">
              {dimHeaders.map((dim, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100/80 text-blue-800 text-[11px] font-medium border border-blue-200">
                  <Layers className="w-3 h-3 text-blue-600" />
                  {dim}
                </span>
              ))}
              {metHeaders.map((met, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100/80 text-emerald-800 text-[11px] font-medium border border-emerald-200">
                  <TrendingUp className="w-3 h-3 text-emerald-600" />
                  {met}
                </span>
              ))}
            </div>
          </div>

          {/* Quick Summary Table if rows exist */}
          {rows.length > 0 && (
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
              <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-1.5">
                  <TableIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span>Formatted GA4 Records ({Math.min(rows.length, 10)} of {rows.length})</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 text-[11px]">
                      {dimHeaders.map((dh, idx) => (
                        <th key={`dh-${idx}`} className="px-3 py-2 font-semibold">
                          {dh}
                        </th>
                      ))}
                      {metHeaders.map((mh, idx) => (
                        <th key={`mh-${idx}`} className="px-3 py-2 font-semibold text-right">
                          {mh}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {rows.slice(0, 10).map((row, rIdx) => {
                      const dVals: string[] = row.dimensionValues ? row.dimensionValues.map((v: any) => v.value) : (row.dimensions || []);
                      const mVals: string[] = row.metricValues ? row.metricValues.map((v: any) => v.value) : (row.metrics || []);
                      return (
                        <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                          {dVals.map((dv, cIdx) => (
                            <td key={`dv-${cIdx}`} className="px-3 py-1.5 text-slate-800 font-sans">
                              {dv || '(not set)'}
                            </td>
                          ))}
                          {mVals.map((mv, cIdx) => {
                            const num = Number(mv);
                            const formatted = !isNaN(num) ? num.toLocaleString() : mv;
                            return (
                              <td key={`mv-${cIdx}`} className="px-3 py-1.5 text-right font-semibold text-blue-700">
                                {formatted}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Expandable Raw JSON Viewer */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setIsRawJsonExpanded(!isRawJsonExpanded)}
              className="w-full px-3.5 py-2 flex items-center justify-between bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Code2 className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-medium">Raw JSON Response</span>
                <span className="text-[10px] text-slate-400 font-mono">({Math.round(JSON.stringify(parsedJson).length / 1024 * 10) / 10} KB)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">
                  {isRawJsonExpanded ? 'Collapse' : 'Expand'}
                </span>
                {isRawJsonExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
              </div>
            </button>

            {isRawJsonExpanded && (
              <div className="p-3 bg-slate-900 text-slate-200 font-mono text-[11px] relative">
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => handleCopy(JSON.stringify(parsedJson, null, 2), 'raw-json')}
                    className="flex items-center gap-1 text-[10px] text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                  >
                    {copiedCodeIdx === 'raw-json' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCodeIdx === 'raw-json' ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>
                <pre className="overflow-x-auto max-h-80 leading-relaxed text-[11px] text-cyan-300">
                  {JSON.stringify(parsedJson, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }
  }

  // General Markdown Splitter and Renderer
  // Splits by markdown blocks: code blocks, tables, lists, headers, blockquotes, paragraphs
  const renderMarkdownBlocks = () => {
    const rawLines = content.split('\n');
    const blocks: React.ReactNode[] = [];
    let i = 0;

    while (i < rawLines.length) {
      const line = rawLines[i];

      // 1. Code Block detection
      if (line.trim().startsWith('```')) {
        const lang = line.trim().replace(/^```/, '') || 'text';
        const codeLines: string[] = [];
        i++;
        while (i < rawLines.length && !rawLines[i].trim().startsWith('```')) {
          codeLines.push(rawLines[i]);
          i++;
        }
        i++; // skip closing ```

        const fullCode = codeLines.join('\n');
        const blockId = `code_${i}`;

        // If code block is JSON, see if we can pretty format it
        let prettyCode = fullCode;
        if (lang.toLowerCase() === 'json') {
          try {
            const parsed = JSON.parse(fullCode);
            prettyCode = JSON.stringify(parsed, null, 2);
          } catch {}
        }

        blocks.push(
          <div key={blockId} className="my-3 rounded-xl border border-slate-800 bg-slate-900 text-slate-100 overflow-hidden shadow-xs">
            <div className="px-3.5 py-1.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span className="uppercase tracking-wider text-[10px] font-bold text-cyan-400">{lang}</span>
              <button
                type="button"
                onClick={() => handleCopy(prettyCode, blockId)}
                className="flex items-center gap-1 text-[10px] text-slate-300 hover:text-white px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {copiedCodeIdx === blockId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCodeIdx === blockId ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-3.5 overflow-x-auto text-[11px] font-mono leading-relaxed text-slate-200">
              {prettyCode}
            </pre>
          </div>
        );
        continue;
      }

      // 2. Markdown Table detection (| Col 1 | Col 2 |)
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const tableLines: string[] = [];
        while (i < rawLines.length && rawLines[i].trim().startsWith('|') && rawLines[i].trim().endsWith('|')) {
          tableLines.push(rawLines[i]);
          i++;
        }

        if (tableLines.length >= 2) {
          const headerCells = tableLines[0].split('|').slice(1, -1).map(c => c.trim());
          const isSeparator = tableLines[1].includes('---');
          const bodyLines = isSeparator ? tableLines.slice(2) : tableLines.slice(1);

          blocks.push(
            <div key={`table_${i}`} className="my-3 rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                      {headerCells.map((h, hIdx) => (
                        <th key={hIdx} className="px-3.5 py-2.5 font-semibold text-[11px] uppercase tracking-wider">
                          <span dangerouslySetInnerHTML={{ __html: formatInline(h) }} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                    {bodyLines.map((rowStr, rIdx) => {
                      const cells = rowStr.split('|').slice(1, -1).map(c => c.trim());
                      return (
                        <tr key={rIdx} className="hover:bg-slate-50/70 transition-colors">
                          {cells.map((cell, cIdx) => (
                            <td key={cIdx} className="px-3.5 py-2">
                              <span dangerouslySetInnerHTML={{ __html: formatInline(cell) }} />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
          continue;
        }
      }

      // 3. Headings
      if (line.startsWith('### ')) {
        const title = line.replace('### ', '');
        blocks.push(
          <h3 key={`h3_${i}`} className="font-bold text-slate-900 text-base mt-4 mb-2 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span dangerouslySetInnerHTML={{ __html: formatInline(title) }} />
          </h3>
        );
        i++;
        continue;
      }

      if (line.startsWith('## ')) {
        const title = line.replace('## ', '');
        blocks.push(
          <h2 key={`h2_${i}`} className="font-bold text-slate-900 text-lg mt-5 mb-2.5 flex items-center gap-2 border-b border-slate-100 pb-1.5">
            <Sparkles className="w-4 h-4 text-cyan-600 shrink-0" />
            <span dangerouslySetInnerHTML={{ __html: formatInline(title) }} />
          </h2>
        );
        i++;
        continue;
      }

      if (line.startsWith('# ')) {
        const title = line.replace('# ', '');
        blocks.push(
          <h1 key={`h1_${i}`} className="font-extrabold text-slate-900 text-xl mt-5 mb-3">
            <span dangerouslySetInnerHTML={{ __html: formatInline(title) }} />
          </h1>
        );
        i++;
        continue;
      }

      // 4. Blockquotes (> ...)
      if (line.startsWith('> ')) {
        const quote = line.replace('> ', '');
        blocks.push(
          <div key={`quote_${i}`} className="my-2.5 pl-3.5 py-2 border-l-3 border-blue-500 bg-blue-50/40 rounded-r-lg text-slate-700 text-xs italic">
            <span dangerouslySetInnerHTML={{ __html: formatInline(quote) }} />
          </div>
        );
        i++;
        continue;
      }

      // 5. Unordered List Items (- ... or * ...)
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const itemText = line.substring(2);
        blocks.push(
          <div key={`li_${i}`} className="flex items-start gap-2 pl-1 my-1 text-slate-700 text-xs sm:text-sm">
            <span className="text-blue-600 mt-1 shrink-0 font-bold">•</span>
            <div className="flex-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInline(itemText) }} />
          </div>
        );
        i++;
        continue;
      }

      // 6. Ordered List Items (1. ... 2. ...)
      const numMatch = line.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        const num = numMatch[1];
        const itemText = numMatch[2];
        blocks.push(
          <div key={`numli_${i}`} className="flex items-start gap-2 pl-1 my-1 text-slate-700 text-xs sm:text-sm">
            <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
              {num}
            </span>
            <div className="flex-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInline(itemText) }} />
          </div>
        );
        i++;
        continue;
      }

      // 7. Empty line spacing
      if (line.trim() === '') {
        blocks.push(<div key={`sp_${i}`} className="h-1" />);
        i++;
        continue;
      }

      // 8. Standard paragraph line
      blocks.push(
        <p key={`p_${i}`} className="text-slate-700 text-xs sm:text-sm leading-relaxed my-1" dangerouslySetInnerHTML={{
          __html: formatInline(line)
        }} />
      );
      i++;
    }

    return blocks;
  };

  return (
    <div className="space-y-1.5 text-slate-800">
      {renderMarkdownBlocks()}
    </div>
  );
};

// Helper for formatting inline markdown: bold, italic, code pills
function formatInline(text: string): string {
  if (!text) return '';
  return text
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900 font-semibold">$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em class="italic text-slate-700">$1</em>')
    // Inline Code
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-100 text-blue-700 font-mono text-[11px] border border-slate-200">$1</code>');
}
