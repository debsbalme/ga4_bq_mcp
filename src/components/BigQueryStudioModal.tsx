import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  Play, 
  Layers, 
  Table as TableIcon, 
  Columns, 
  Check, 
  Copy, 
  RefreshCw, 
  Zap, 
  Sparkles, 
  Code2, 
  AlertCircle, 
  CheckCircle2,
  FileText,
  Search,
  ArrowRight,
  Eye
} from 'lucide-react';
import { BigQueryProject, BigQueryDataset, BigQueryTable, BigQueryQueryResult } from '../types';

interface BigQueryStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken?: string;
  onSendToChat: (queryPrompt: string) => void;
}

export const BigQueryStudioModal: React.FC<BigQueryStudioModalProps> = ({
  isOpen,
  onClose,
  accessToken,
  onSendToChat
}) => {
  const [projectId, setProjectId] = useState<string>('bigquery-public-data');
  const [projects, setProjects] = useState<BigQueryProject[]>([]);
  const [datasets, setDatasets] = useState<BigQueryDataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [tables, setTables] = useState<BigQueryTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableSchema, setTableSchema] = useState<any>(null);
  const [tableFilter, setTableFilter] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'catalog' | 'editor'>('catalog');

  const [sqlQuery, setSqlQuery] = useState<string>('SELECT * FROM `bigquery-public-data.usa_names.usa_1910_current` LIMIT 20;');

  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [isEstimating, setIsEstimating] = useState<boolean>(false);
  const [isLoadingTables, setIsLoadingTables] = useState<boolean>(false);
  const [dryRunEstimate, setDryRunEstimate] = useState<{ bytes: number; mb: string } | null>(null);
  const [queryResult, setQueryResult] = useState<BigQueryQueryResult | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Fetch Projects
  useEffect(() => {
    if (isOpen && accessToken) {
      fetch('/api/bigquery/projects', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.projects && data.projects.length > 0) {
            setProjects(data.projects);
            if (projectId === 'bigquery-public-data' && data.projects[0]?.id) {
              setProjectId(data.projects[0].id);
            }
          }
        })
        .catch(err => console.warn('Could not list GCP projects:', err));
    }
  }, [isOpen, accessToken]);

  // Fetch Datasets when projectId changes
  useEffect(() => {
    if (isOpen && accessToken && projectId) {
      fetch(`/api/bigquery/datasets?projectId=${encodeURIComponent(projectId)}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.datasets && data.datasets.length > 0) {
            setDatasets(data.datasets);
            setSelectedDataset(data.datasets[0].datasetReference?.datasetId || '');
          } else {
            setDatasets([]);
            setSelectedDataset('');
            setTables([]);
            setSelectedTable('');
            setTableSchema(null);
          }
        })
        .catch(err => console.warn('Could not list BigQuery datasets:', err));
    }
  }, [isOpen, accessToken, projectId]);

  // Fetch Tables when selectedDataset changes
  useEffect(() => {
    if (isOpen && accessToken && projectId && selectedDataset) {
      setIsLoadingTables(true);
      fetch(`/api/bigquery/tables?projectId=${encodeURIComponent(projectId)}&datasetId=${encodeURIComponent(selectedDataset)}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.tables && data.tables.length > 0) {
            setTables(data.tables);
            setSelectedTable(data.tables[0].tableReference?.tableId || '');
          } else {
            setTables([]);
            setSelectedTable('');
            setTableSchema(null);
          }
        })
        .catch(err => console.warn('Could not list BigQuery tables:', err))
        .finally(() => setIsLoadingTables(false));
    }
  }, [isOpen, accessToken, projectId, selectedDataset]);

  // Fetch Schema when selectedTable changes
  useEffect(() => {
    if (isOpen && accessToken && projectId && selectedDataset && selectedTable) {
      fetch(`/api/bigquery/schema?projectId=${encodeURIComponent(projectId)}&datasetId=${encodeURIComponent(selectedDataset)}&tableId=${encodeURIComponent(selectedTable)}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.schema) {
            setTableSchema(data);
          } else {
            setTableSchema(data);
          }
        })
        .catch(err => console.warn('Could not get BigQuery table schema:', err));
    }
  }, [isOpen, accessToken, projectId, selectedDataset, selectedTable]);

  if (!isOpen) return null;

  const currentSelectedTableObj = tables.find(t => t.tableReference?.tableId === selectedTable);
  const schemaFields = tableSchema?.schema?.fields || [];

  const filteredTables = tables.filter(t => {
    const tableId = t.tableReference?.tableId || '';
    return tableId.toLowerCase().includes(tableFilter.toLowerCase());
  });

  // Action: Generate Quick Query
  const generatePreviewQuery = (tableId: string) => {
    const fullTableRef = `\`${projectId}.${selectedDataset}.${tableId}\``;
    const query = `SELECT * \nFROM ${fullTableRef} \nLIMIT 20;`;
    setSqlQuery(query);
    setActiveTab('editor');
    setDryRunEstimate(null);
    setQueryResult(null);
    setExecutionError(null);
  };

  const generateCountQuery = (tableId: string) => {
    const fullTableRef = `\`${projectId}.${selectedDataset}.${tableId}\``;
    const query = `SELECT COUNT(1) AS total_row_count \nFROM ${fullTableRef};`;
    setSqlQuery(query);
    setActiveTab('editor');
    setDryRunEstimate(null);
    setQueryResult(null);
    setExecutionError(null);
  };

  // Dry run estimate
  const handleDryRun = async () => {
    if (!sqlQuery.trim()) return;
    setIsEstimating(true);
    setDryRunEstimate(null);
    setExecutionError(null);

    try {
      const res = await fetch('/api/bigquery/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
          projectId,
          query: sqlQuery,
          dryRun: true
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Syntax validation failed');
      }

      const bytes = data.totalBytesProcessed || 0;
      const mb = (bytes / (1024 * 1024)).toFixed(2);
      setDryRunEstimate({ bytes, mb });
    } catch (err: any) {
      setExecutionError(`Dry run failed: ${err.message}`);
    } finally {
      setIsEstimating(false);
    }
  };

  // Run Query
  const handleExecuteQuery = async () => {
    if (!sqlQuery.trim()) return;
    setIsExecuting(true);
    setExecutionError(null);
    setQueryResult(null);

    try {
      const res = await fetch('/api/bigquery/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
          projectId,
          query: sqlQuery,
          maxResults: 100
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Query failed');
      }

      setQueryResult(data);
    } catch (err: any) {
      setExecutionError(err.message || 'BigQuery execution error');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSendToAI = () => {
    let prompt = '';
    if (activeTab === 'catalog' && selectedTable) {
      prompt = `Please inspect the BigQuery table \`${projectId}.${selectedDataset}.${selectedTable}\` and provide an overview of its available columns, row counts, and data structure.`;
    } else {
      prompt = `Please execute and analyze this BigQuery SQL query on project \`${projectId}\`:\n\n\`\`\`sql\n${sqlQuery}\n\`\`\``;
    }
    onSendToChat(prompt);
    onClose();
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 border border-indigo-700 flex items-center justify-center text-white shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">BigQuery Table & Data Catalog</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                  Google Cloud BigQuery
                </span>
              </div>
              <p className="text-xs text-slate-500">Explore datasets, inspect table schemas & metadata, and run custom queries on your warehouse data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Studio Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-white justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'catalog'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Table Schema & Metadata Catalog
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'editor'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              SQL Query Console
            </button>
          </div>

          <button
            onClick={handleSendToAI}
            className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Analyze in Chat
          </button>
        </div>

        {/* Modal Body: Left Hierarchy & Right Inspector */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 overflow-hidden">
          {/* Left Column: Explorer Hierarchy */}
          <div className="lg:col-span-4 p-4 overflow-y-auto space-y-4 bg-slate-50 text-xs">
            {/* GCP Project Config */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-indigo-600" />
                  GCP Project ID
                </span>
                {projects.length > 0 && <span className="text-[10px] text-slate-500">{projects.length} accessible</span>}
              </label>
              <input
                type="text"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="e.g. my-gcp-project"
                className="w-full p-2 rounded-lg bg-white border border-slate-200 font-mono text-xs text-slate-800 shadow-2xs"
              />
              {projects.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {projects.slice(0, 4).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setProjectId(p.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                        projectId === p.id ? 'bg-indigo-100 border-indigo-300 text-indigo-800 font-semibold' : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      {p.id}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Datasets Selector */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200">
              <label className="font-semibold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  Datasets in Project
                </span>
                {datasets.length > 0 && <span className="text-[10px] text-slate-500">{datasets.length} found</span>}
              </label>

              {datasets.length > 0 ? (
                <select
                  value={selectedDataset}
                  onChange={(e) => setSelectedDataset(e.target.value)}
                  className="w-full p-2 rounded-lg bg-white border border-slate-200 text-xs font-mono text-slate-800 shadow-2xs"
                >
                  {datasets.map((d) => (
                    <option key={d.id} value={d.datasetReference?.datasetId}>
                      {d.datasetReference?.datasetId} {d.location ? `(${d.location})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-500 text-[11px]">
                  No datasets loaded. Enter a valid GCP Project with BigQuery enabled.
                </div>
              )}
            </div>

            {/* Tables List */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <TableIcon className="w-3.5 h-3.5 text-indigo-600" />
                  Tables ({filteredTables.length})
                </label>
              </div>

              {/* Table Search Filter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={tableFilter}
                  onChange={(e) => setTableFilter(e.target.value)}
                  placeholder="Filter tables..."
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs placeholder-slate-400"
                />
              </div>

              {isLoadingTables ? (
                <div className="p-4 text-center text-slate-400 text-[11px] flex items-center justify-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Loading tables...
                </div>
              ) : filteredTables.length > 0 ? (
                <div className="max-h-64 overflow-y-auto space-y-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
                  {filteredTables.map((t) => {
                    const tableId = t.tableReference?.tableId || '';
                    const isSelected = selectedTable === tableId;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTable(tableId)}
                        className={`w-full text-left px-2.5 py-2 rounded-md text-xs font-mono flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="truncate mr-1">
                          <div>{tableId}</div>
                          {t.type && <span className="text-[9px] text-slate-400 uppercase font-sans">{t.type}</span>}
                        </div>
                        {t.numRows && (
                          <span className="text-[10px] text-slate-500 shrink-0 font-sans font-normal">
                            {Number(t.numRows).toLocaleString()} rows
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 text-center text-slate-400 text-[11px] bg-white rounded-lg border border-slate-200">
                  {selectedDataset ? 'No tables found in this dataset.' : 'Select a dataset to view tables.'}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Catalog View or SQL Console */}
          <div className="lg:col-span-8 p-5 flex flex-col overflow-y-auto space-y-4 bg-white text-xs">
            {activeTab === 'catalog' ? (
              /* TAB 1: High-Level Table Schema & Data Catalog */
              <div className="space-y-4">
                {selectedTable ? (
                  <>
                    {/* Table Profile Card */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900 font-mono">
                              {selectedTable}
                            </h3>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-800">
                              {currentSelectedTableObj?.type || 'TABLE'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {projectId}.{selectedDataset}.{selectedTable}
                          </p>
                        </div>

                        {/* Quick Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => generatePreviewQuery(selectedTable)}
                            className="px-3 py-1.5 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-indigo-700 font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Preview Rows
                          </button>
                          <button
                            onClick={() => generateCountQuery(selectedTable)}
                            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            Count Rows
                          </button>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/80">
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <div className="text-[10px] text-slate-500 font-medium">Total Rows</div>
                          <div className="text-xs font-bold text-slate-900 font-mono mt-0.5">
                            {currentSelectedTableObj?.numRows 
                              ? Number(currentSelectedTableObj.numRows).toLocaleString() 
                              : tableSchema?.numRows 
                              ? Number(tableSchema.numRows).toLocaleString() 
                              : 'Dynamic/View'}
                          </div>
                        </div>

                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <div className="text-[10px] text-slate-500 font-medium">Size on Disk</div>
                          <div className="text-xs font-bold text-slate-900 font-mono mt-0.5">
                            {currentSelectedTableObj?.numBytes 
                              ? `${(Number(currentSelectedTableObj.numBytes) / (1024 * 1024)).toFixed(2)} MB` 
                              : tableSchema?.numBytes 
                              ? `${(Number(tableSchema.numBytes) / (1024 * 1024)).toFixed(2)} MB`
                              : '0 MB'}
                          </div>
                        </div>

                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <div className="text-[10px] text-slate-500 font-medium">Total Columns</div>
                          <div className="text-xs font-bold text-slate-900 font-mono mt-0.5">
                            {schemaFields.length} Fields
                          </div>
                        </div>

                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <div className="text-[10px] text-slate-500 font-medium">Location</div>
                          <div className="text-xs font-bold text-slate-900 mt-0.5">
                            {tableSchema?.location || 'US (Multi-region)'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Columns & Schema Table */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <Columns className="w-3.5 h-3.5 text-indigo-600" />
                          Schema & Column Definitions ({schemaFields.length})
                        </h4>
                      </div>

                      {schemaFields.length > 0 ? (
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs max-h-72 overflow-y-auto">
                          <table className="w-full text-left border-collapse text-[11px]">
                            <thead className="bg-slate-100 text-slate-700 sticky top-0 font-semibold border-b border-slate-200">
                              <tr>
                                <th className="py-2 px-3 border-r border-slate-200 font-mono">Field Name</th>
                                <th className="py-2 px-3 border-r border-slate-200">Type</th>
                                <th className="py-2 px-3 border-r border-slate-200">Mode</th>
                                <th className="py-2 px-3">Description</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {schemaFields.map((field: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                  <td className="py-2 px-3 border-r border-slate-100 font-mono font-medium text-slate-900">
                                    {field.name}
                                  </td>
                                  <td className="py-2 px-3 border-r border-slate-100 font-mono text-indigo-700">
                                    <span className="px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100 font-semibold text-[10px]">
                                      {field.type}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 border-r border-slate-100 text-slate-500 text-[10px]">
                                    {field.mode || 'NULLABLE'}
                                  </td>
                                  <td className="py-2 px-3 text-slate-600 text-[11px]">
                                    {field.description || <span className="text-slate-300 italic">No description provided</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                          Loading schema fields or schema is empty...
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="p-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <TableIcon className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-semibold text-slate-800">Select a Table from the Left Panel</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Choose any dataset and table to view its row counts, schema columns, data types, and storage statistics.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* TAB 2: Custom Standard SQL Query Console */
              <div className="space-y-4">
                {/* Editor Toolbar */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-indigo-600" />
                      Standard SQL Query
                    </label>
                    <button
                      onClick={handleCopySql}
                      className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900 px-2 py-0.5 rounded bg-slate-100 border border-slate-200"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Copied' : 'Copy SQL'}
                    </button>
                  </div>
                  <textarea
                    rows={8}
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    placeholder="SELECT * FROM `project.dataset.table` LIMIT 100;"
                    className="w-full p-3 rounded-xl bg-slate-900 font-mono text-xs text-emerald-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    spellCheck={false}
                  />
                </div>

                {/* Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isEstimating || !sqlQuery.trim()}
                      onClick={handleDryRun}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium text-xs shadow-2xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      {isEstimating ? 'Estimating...' : 'Dry Run (Estimate Scan)'}
                    </button>

                    {dryRunEstimate && (
                      <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Valid SQL ({dryRunEstimate.mb} MB scanned)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id="btn-run-bigquery-sql"
                      type="button"
                      disabled={isExecuting || !sqlQuery.trim()}
                      onClick={handleExecuteQuery}
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isExecuting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                      Run SQL Query
                    </button>
                  </div>
                </div>

                {/* Execution Error */}
                {executionError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="font-mono whitespace-pre-wrap">{executionError}</div>
                  </div>
                )}

                {/* Results Table Output */}
                {queryResult && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-800 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Query Output: <strong>{queryResult.rows.length} rows</strong></span>
                        {queryResult.totalBytesProcessed !== undefined && (
                          <span className="text-[11px] text-slate-500 font-normal">
                            ({(queryResult.totalBytesProcessed / (1024 * 1024)).toFixed(2)} MB processed)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs max-h-56 overflow-y-auto">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead className="bg-slate-100 text-slate-700 sticky top-0 font-semibold border-b border-slate-200">
                          <tr>
                            {queryResult.headers.map((h, i) => (
                              <th key={i} className="py-2 px-3 border-r border-slate-200 last:border-r-0 font-mono">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {queryResult.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="py-1.5 px-3 border-r border-slate-100 last:border-r-0 font-mono text-slate-800 truncate max-w-xs">
                                  {cell === null || cell === undefined ? <span className="text-slate-300">null</span> : String(cell)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            BigQuery REST API v2 • Table Catalog & Standard SQL (2025)
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1 rounded-md text-slate-600 hover:text-slate-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
