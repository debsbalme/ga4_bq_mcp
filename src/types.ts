export type AuthMode = 'google_gsi' | 'custom_oauth' | 'custom_token' | 'demo_mode';

export interface UserProfile {
  name: string;
  email: string;
  picture?: string;
  accessToken?: string;
  tokenExpiry?: number;
  authMode: AuthMode;
  customClientId?: string;
  isBigQueryEnabled?: boolean;
}

export interface GA4Property {
  id: string; // e.g. "properties/318492041" or "318492041"
  propertyId: string; // numeric ID
  displayName: string;
  accountName?: string;
  accountId?: string;
  industryCategory?: string;
  timeZone: string;
  currencyCode: string;
  propertyType?: string;
  createTime?: string;
  isDemo?: boolean;
}

export interface GA4Account {
  id: string;
  account: string;
  displayName: string;
  properties: GA4Property[];
}

export interface GA4DateRange {
  startDate: string; // '2025-01-01' or '30daysAgo' or 'yesterday'
  endDate: string; // 'today' or '2025-01-31'
  name?: string;
}

export interface GA4Dimension {
  name: string; // e.g. 'date', 'sessionSourceMedium', 'country', 'deviceCategory'
}

export interface GA4Metric {
  name: string; // e.g. 'activeUsers', 'sessions', 'screenPageViews', 'conversions'
}

export interface GA4OrderBy {
  metric?: { metricName: string };
  dimension?: { dimensionName: string };
  desc?: boolean;
}

export interface GA4ReportRequest {
  propertyId: string;
  dateRanges: GA4DateRange[];
  dimensions?: GA4Dimension[];
  metrics: GA4Metric[];
  orderBys?: GA4OrderBy[];
  limit?: number;
  offset?: number;
  keepEmptyRows?: boolean;
}

export interface GA4RealtimeRequest {
  propertyId: string;
  dimensions?: GA4Dimension[];
  metrics: GA4Metric[];
  limit?: number;
}

export interface DimensionHeader {
  name: string;
}

export interface MetricHeader {
  name: string;
  type: string;
}

export interface DimensionValue {
  value: string;
}

export interface MetricValue {
  value: string;
}

export interface RowItem {
  dimensionValues?: DimensionValue[];
  metricValues?: MetricValue[];
}

export interface GA4ReportResponse {
  dimensionHeaders?: DimensionHeader[];
  metricHeaders?: MetricHeader[];
  rows?: RowItem[];
  totals?: Array<{ metricValues: MetricValue[] }>;
  maximums?: Array<{ metricValues: MetricValue[] }>;
  minimums?: Array<{ metricValues: MetricValue[] }>;
  rowCount?: number;
  metadata?: {
    currencyCode?: string;
    timeZone?: string;
    samplingMetadatas?: unknown[];
  };
  kind?: string;
}

// BigQuery Integration Types
export interface BigQueryProject {
  id: string;
  numericId?: string;
  projectReference: {
    projectId: string;
  };
  friendlyName?: string;
}

export interface BigQueryDataset {
  id: string;
  datasetReference: {
    datasetId: string;
    projectId: string;
  };
  friendlyName?: string;
  location?: string;
}

export interface BigQueryTable {
  id: string;
  tableReference: {
    projectId: string;
    datasetId: string;
    tableId: string;
  };
  type?: string;
  numRows?: string;
  numBytes?: string;
  creationTime?: string;
}

export interface BigQuerySchemaField {
  name: string;
  type: string;
  mode?: 'NULLABLE' | 'REQUIRED' | 'REPEATED';
  description?: string;
  fields?: BigQuerySchemaField[];
}

export interface BigQueryQueryResult {
  projectId: string;
  query: string;
  schema?: {
    fields: BigQuerySchemaField[];
  };
  headers: string[];
  rows: (string | number | boolean | null)[][];
  totalRows: number;
  totalBytesProcessed?: number;
  totalBytesBilled?: number;
  cacheHit?: boolean;
  jobComplete?: boolean;
  executionTimeMs?: number;
  dryRun?: boolean;
  error?: string;
}

export interface BigQueryQueryRequest {
  projectId: string;
  query: string;
  dryRun?: boolean;
  maxResults?: number;
  useLegacySql?: boolean;
}

export interface ChartVisualizationConfig {
  type: 'line' | 'bar' | 'area' | 'pie';
  title: string;
  xAxisKey: string;
  dataKeys: {
    key: string;
    label: string;
    color: string;
  }[];
  data: Array<Record<string, string | number>>;
}

export interface KPICardData {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  subtitle?: string;
}

export interface MCPToolCallInfo {
  toolName: string;
  arguments: Record<string, unknown>;
  response?: unknown;
  durationMs?: number;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

export interface ComparisonMetricRow {
  metric: string;
  metricLabel: string;
  dimensionValue: string;
  ga4Value: number;
  bigQueryValue: number;
  delta: number;
  variancePercent: number;
  status: 'match' | 'minor_variance' | 'discrepancy';
}

export interface ComparisonTotalRow {
  metric: string;
  metricLabel: string;
  ga4Total: number;
  bigQueryTotal: number;
  delta: number;
  variancePercent: number;
  status: 'match' | 'minor_variance' | 'discrepancy';
}

export interface ComparisonDiagnostic {
  factor: string;
  impact: string;
  explanation: string;
}

export interface GA4BQComparisonResult {
  propertyId: string;
  propertyName?: string;
  projectId: string;
  datasetId?: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  dimension?: string;
  comparisonRows: ComparisonMetricRow[];
  totals: ComparisonTotalRow[];
  diagnostics: ComparisonDiagnostic[];
  generatedSql?: string;
  isProjected?: boolean;
  notes?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  toolCalls?: MCPToolCallInfo[];
  kpis?: KPICardData[];
  chart?: ChartVisualizationConfig;
  tableData?: {
    headers: string[];
    rows: (string | number)[][];
    totalRows: number;
  };
  comparisonData?: GA4BQComparisonResult;
  rawReportResponse?: GA4ReportResponse;
  rawBigQueryResult?: BigQueryQueryResult;
  sourceType?: 'ga4' | 'bigquery' | 'hybrid' | 'comparison';
  propertyContext?: {
    id: string;
    name: string;
  };
  bigQueryContext?: {
    projectId: string;
    datasetId?: string;
    totalBytesProcessed?: number;
  };
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface GA4DimensionMetadata {
  apiName: string;
  uiName: string;
  description: string;
  deprecatedApiNames?: string[];
  customDefinition?: boolean;
  category?: string;
}

export interface GA4MetricMetadata {
  apiName: string;
  uiName: string;
  description: string;
  deprecatedApiNames?: string[];
  type?: string;
  customDefinition?: boolean;
  category?: string;
  expression?: string;
}

export interface GA4PropertyMetadata {
  name: string;
  dimensions: GA4DimensionMetadata[];
  metrics: GA4MetricMetadata[];
}

