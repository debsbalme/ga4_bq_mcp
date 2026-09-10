import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client lazily
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === 'dummy-key') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasGeminiKey: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY',
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
  });
});

// 2. Auth config info
app.get('/api/auth/config', (req, res) => {
  res.json({
    defaultClientId: process.env.GOOGLE_CLIENT_ID || '',
    appUrl: process.env.APP_URL || '',
  });
});

// 3. MCP Tool Definitions
const MCP_TOOL_DEFINITIONS = [
  // --- GA4 Tools ---
  {
    name: 'ga4_run_report',
    description: 'Query Google Analytics 4 report data for a property with custom dimensions, metrics, date ranges, sorting, and filters.',
    inputSchema: {
      type: 'object',
      properties: {
        propertyId: {
          type: 'string',
          description: 'The GA4 Property ID (numeric, e.g. "318492041" or "properties/318492041").'
        },
        dateRanges: {
          type: 'array',
          description: 'Date ranges to query. Formats: "30daysAgo", "7daysAgo", "yesterday", "today", or "YYYY-MM-DD".',
          items: {
            type: 'object',
            properties: {
              startDate: { type: 'string' },
              endDate: { type: 'string' },
              name: { type: 'string' }
            },
            required: ['startDate', 'endDate']
          }
        },
        dimensions: {
          type: 'array',
          description: 'List of dimensions (e.g. date, sessionSourceMedium, sessionDefaultChannelGroup, country, city, deviceCategory, pageTitle, landingPagePlusQueryString).',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' }
            },
            required: ['name']
          }
        },
        metrics: {
          type: 'array',
          description: 'List of metrics (e.g. activeUsers, newUsers, sessions, screenPageViews, conversions, totalRevenue, eventCount, bounceRate, averageSessionDuration).',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' }
            },
            required: ['name']
          }
        },
        orderBys: {
          type: 'array',
          description: 'Sorting order for metrics or dimensions.',
          items: {
            type: 'object',
            properties: {
              metric: { type: 'object', properties: { metricName: { type: 'string' } } },
              dimension: { type: 'object', properties: { dimensionName: { type: 'string' } } },
              desc: { type: 'boolean' }
            }
          }
        },
        limit: {
          type: 'integer',
          description: 'Maximum number of rows to return (default 50).'
        }
      },
      required: ['propertyId', 'dateRanges', 'metrics']
    }
  },
  {
    name: 'ga4_run_realtime_report',
    description: 'Fetch real-time active users and events on the website/app in the last 30 minutes.',
    inputSchema: {
      type: 'object',
      properties: {
        propertyId: {
          type: 'string',
          description: 'The GA4 Property ID (numeric, e.g. "318492041" or "properties/318492041").'
        },
        dimensions: {
          type: 'array',
          description: 'Dimensions for real-time (e.g. minutesAgo, country, city, unifiedScreenName, deviceCategory).',
          items: {
            type: 'object',
            properties: { name: { type: 'string' } },
            required: ['name']
          }
        },
        metrics: {
          type: 'array',
          description: 'Metrics for real-time (e.g. activeUsers, eventCount, conversions).',
          items: {
            type: 'object',
            properties: { name: { type: 'string' } },
            required: ['name']
          }
        },
        limit: {
          type: 'integer',
          description: 'Limit on rows returned.'
        }
      },
      required: ['propertyId', 'metrics']
    }
  },
  {
    name: 'ga4_list_accounts_and_properties',
    description: 'List all GA4 accounts, property IDs, display names, currencies, and time zones accessible to the user via the Google Analytics Admin API.',
    inputSchema: {
      type: 'object',
      properties: {},
    }
  },
  {
    name: 'ga4_get_metadata',
    description: 'Get custom and standard dimension & metric metadata definitions for a given GA4 property.',
    inputSchema: {
      type: 'object',
      properties: {
        propertyId: { type: 'string', description: 'GA4 Property ID' }
      },
      required: ['propertyId']
    }
  },
  // --- BigQuery Tools ---
  {
    name: 'bigquery_run_query',
    description: 'Execute standard SQL queries on Google Cloud BigQuery (e.g. querying GA4 raw event export tables analytics_*.events_* or public sample datasets).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'The Google Cloud Project ID to execute the query in (or bill to).'
        },
        query: {
          type: 'string',
          description: 'The standard SQL query text to run on BigQuery.'
        },
        dryRun: {
          type: 'boolean',
          description: 'If true, validates SQL syntax and calculates estimated bytes scanned without running the query.'
        },
        maxResults: {
          type: 'integer',
          description: 'Maximum number of result rows to return (default 100).'
        },
        useLegacySql: {
          type: 'boolean',
          description: 'Set to false for Standard SQL (default false).'
        }
      },
      required: ['projectId', 'query']
    }
  },
  {
    name: 'bigquery_list_projects',
    description: 'List Google Cloud Projects accessible to the authenticated user for BigQuery queries.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'bigquery_list_datasets',
    description: 'List BigQuery datasets within a Google Cloud Project (e.g. analytics_<property_id> or data warehouse datasets).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'The GCP Project ID to list datasets from.'
        }
      },
      required: ['projectId']
    }
  },
  {
    name: 'bigquery_list_tables',
    description: 'List all tables and views in a BigQuery dataset (e.g. events_*, events_intraday_*, pseudonymous_users_*).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'The GCP Project ID.'
        },
        datasetId: {
          type: 'string',
          description: 'The BigQuery dataset ID (e.g. analytics_318492041).'
        }
      },
      required: ['projectId', 'datasetId']
    }
  },
  {
    name: 'bigquery_get_table_schema',
    description: 'Retrieve detailed column schema, field data types, descriptions, partitions, and row counts for a BigQuery table.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'The GCP Project ID.'
        },
        datasetId: {
          type: 'string',
          description: 'The BigQuery dataset ID.'
        },
        tableId: {
          type: 'string',
          description: 'The BigQuery table or view ID.'
        }
      },
      required: ['projectId', 'datasetId', 'tableId']
    }
  }
];

// 4. MCP Tools List Endpoint
app.get('/api/mcp/tools', (req, res) => {
  res.json({
    protocolVersion: '2024-11-05',
    tools: MCP_TOOL_DEFINITIONS
  });
});

// Helper to unpack BigQuery f/v cell values cleanly
function unpackBigQueryCell(cell: any): any {
  if (cell === null || cell === undefined) return null;
  if (typeof cell !== 'object') return cell;

  if ('v' in cell) {
    const val = cell.v;
    if (val === null || val === undefined) return null;
    if (Array.isArray(val)) {
      return val.map((item: any) => unpackBigQueryCell(item));
    }
    if (typeof val === 'object' && val !== null && 'f' in val) {
      return unpackBigQueryRow(val);
    }
    return val;
  }

  if ('f' in cell) {
    return unpackBigQueryRow(cell);
  }

  return cell;
}

function unpackBigQueryRow(rowObj: any): any[] {
  if (!rowObj || !rowObj.f || !Array.isArray(rowObj.f)) return [];
  return rowObj.f.map((field: any) => unpackBigQueryCell(field));
}

// Helper to execute SQL on BigQuery REST API v2
async function executeBigQueryRunQuery(
  projectId: string,
  query: string,
  options: { dryRun?: boolean; maxResults?: number; useLegacySql?: boolean } = {},
  accessToken?: string
) {
  if (!accessToken) {
    throw new Error('Authentication required: Please sign in with your Google account to query BigQuery.');
  }

  const cleanProjId = projectId.trim();
  const payload = {
    query,
    useLegacySql: options.useLegacySql || false,
    maxResults: options.maxResults || 100,
    dryRun: options.dryRun || false,
    timeoutMs: 45000,
  };

  const response = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(cleanProjId)}/queries`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    let parsedErr = errText;
    try {
      const errObj = JSON.parse(errText);
      parsedErr = errObj.error?.message || errText;
    } catch {}
    throw new Error(`BigQuery API Error (${response.status}): ${parsedErr}`);
  }

  const data = await response.json();

  const fields = data.schema?.fields || [];
  const headers = fields.map((f: any) => f.name);
  const rawRows = data.rows || [];

  const rows = rawRows.map((r: any) => {
    return unpackBigQueryRow(r).map((cell: any) => {
      if (typeof cell === 'object' && cell !== null) {
        return JSON.stringify(cell);
      }
      return cell;
    });
  });

  return {
    projectId: cleanProjId,
    query,
    schema: data.schema,
    headers,
    rows,
    totalRows: Number(data.totalRows || rows.length),
    totalBytesProcessed: data.totalBytesProcessed ? Number(data.totalBytesProcessed) : undefined,
    totalBytesBilled: data.totalBytesBilled ? Number(data.totalBytesBilled) : undefined,
    cacheHit: !!data.cacheHit,
    jobComplete: data.jobComplete !== undefined ? data.jobComplete : true,
    dryRun: options.dryRun || false,
  };
}

// Helper to list BigQuery Projects
async function executeBigQueryListProjects(accessToken?: string) {
  if (!accessToken) {
    throw new Error('Authentication required: Sign in with Google to list BigQuery projects.');
  }

  const response = await fetch('https://bigquery.googleapis.com/bigquery/v2/projects', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    let parsedErr = errText;
    try {
      const errObj = JSON.parse(errText);
      parsedErr = errObj.error?.message || errText;
    } catch {}
    throw new Error(`BigQuery Projects API Error (${response.status}): ${parsedErr}`);
  }

  const data = await response.json();
  return (data.projects || []).map((p: any) => ({
    id: p.id,
    numericId: p.numericId,
    projectReference: p.projectReference || { projectId: p.id },
    friendlyName: p.friendlyName || p.id,
  }));
}

// Helper to list BigQuery Datasets
async function executeBigQueryListDatasets(projectId: string, accessToken?: string) {
  if (!accessToken) {
    throw new Error('Authentication required: Sign in with Google to list BigQuery datasets.');
  }

  const response = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(projectId)}/datasets`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    let parsedErr = errText;
    try {
      const errObj = JSON.parse(errText);
      parsedErr = errObj.error?.message || errText;
    } catch {}
    throw new Error(`BigQuery Datasets API Error (${response.status}): ${parsedErr}`);
  }

  const data = await response.json();
  return (data.datasets || []).map((d: any) => ({
    id: d.id,
    datasetReference: d.datasetReference,
    friendlyName: d.friendlyName || d.datasetReference?.datasetId,
    location: d.location,
  }));
}

// Helper to list BigQuery Tables
async function executeBigQueryListTables(projectId: string, datasetId: string, accessToken?: string) {
  if (!accessToken) {
    throw new Error('Authentication required: Sign in with Google to list BigQuery tables.');
  }

  const response = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(projectId)}/datasets/${encodeURIComponent(datasetId)}/tables`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    let parsedErr = errText;
    try {
      const errObj = JSON.parse(errText);
      parsedErr = errObj.error?.message || errText;
    } catch {}
    throw new Error(`BigQuery Tables API Error (${response.status}): ${parsedErr}`);
  }

  const data = await response.json();
  return (data.tables || []).map((t: any) => ({
    id: t.id,
    tableReference: t.tableReference,
    type: t.type,
    numRows: t.numRows,
    numBytes: t.numBytes,
    creationTime: t.creationTime,
  }));
}

// Helper to get BigQuery Table Schema
async function executeBigQueryGetSchema(projectId: string, datasetId: string, tableId: string, accessToken?: string) {
  if (!accessToken) {
    throw new Error('Authentication required: Sign in with Google to inspect BigQuery table schema.');
  }

  const response = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(projectId)}/datasets/${encodeURIComponent(datasetId)}/tables/${encodeURIComponent(tableId)}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    const errText = await response.text();
    let parsedErr = errText;
    try {
      const errObj = JSON.parse(errText);
      parsedErr = errObj.error?.message || errText;
    } catch {}
    throw new Error(`BigQuery Schema API Error (${response.status}): ${parsedErr}`);
  }

  return await response.json();
}

// Helper to execute GA4 Report via Real Google Analytics Data API v1beta
async function executeGA4Report(
  propertyId: string,
  requestBody: {
    dateRanges?: Array<{ startDate: string; endDate: string }>;
    dimensions?: Array<{ name: string }>;
    metrics?: Array<{ name: string }>;
    orderBys?: Array<unknown>;
    limit?: number;
  },
  accessToken?: string
) {
  const cleanPropId = propertyId.replace(/^properties\//, '');

  if (!accessToken) {
    throw new Error('Authentication required: Please sign in with your Google account to query Google Analytics 4 data.');
  }

  const payload: any = {
    dateRanges: requestBody.dateRanges && requestBody.dateRanges.length > 0 
      ? requestBody.dateRanges 
      : [{ startDate: '30daysAgo', endDate: 'today' }],
    metrics: requestBody.metrics && requestBody.metrics.length > 0
      ? requestBody.metrics
      : [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
    limit: requestBody.limit || 100,
  };

  if (requestBody.dimensions && requestBody.dimensions.length > 0) {
    payload.dimensions = requestBody.dimensions;
  }

  if (requestBody.orderBys && requestBody.orderBys.length > 0) {
    payload.orderBys = requestBody.orderBys;
  }

  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${cleanPropId}:runReport`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    let parsedErr = errText;
    try {
      const errObj = JSON.parse(errText);
      parsedErr = errObj.error?.message || errText;
    } catch {}
    throw new Error(`Google Analytics Data API Error (${response.status}): ${parsedErr}`);
  }

  return await response.json();
}

// Helper to execute GA4 Realtime Report via Real Google Analytics Data API v1beta
async function executeGA4Realtime(
  propertyId: string,
  requestBody: {
    dimensions?: Array<{ name: string }>;
    metrics?: Array<{ name: string }>;
    limit?: number;
  },
  accessToken?: string
) {
  const cleanPropId = propertyId.replace(/^properties\//, '');

  if (!accessToken) {
    throw new Error('Authentication required: Please sign in with your Google account to query real-time analytics data.');
  }

  const payload: any = {
    metrics: requestBody.metrics && requestBody.metrics.length > 0
      ? requestBody.metrics
      : [{ name: 'activeUsers' }],
    limit: requestBody.limit || 30,
  };

  if (requestBody.dimensions && requestBody.dimensions.length > 0) {
    payload.dimensions = requestBody.dimensions;
  } else {
    payload.dimensions = [{ name: 'minutesAgo' }];
  }

  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${cleanPropId}:runRealtimeReport`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    let parsedErr = errText;
    try {
      const errObj = JSON.parse(errText);
      parsedErr = errObj.error?.message || errText;
    } catch {}
    throw new Error(`Realtime API Error (${response.status}): ${parsedErr}`);
  }

  return await response.json();
}

// 5. GA4 Accounts & Properties endpoint (Real Google Analytics Admin API v1beta)
app.get('/api/ga4/accounts', async (req, res) => {
  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

  if (!accessToken) {
    return res.status(401).json({
      accounts: [],
      isLive: false,
      error: 'Authentication required. Please sign in with your Google account.'
    });
  }

  try {
    const response = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      let errMsg = errText;
      try {
        const errObj = JSON.parse(errText);
        errMsg = errObj.error?.message || errText;
      } catch {}
      return res.status(response.status).json({
        accounts: [],
        isLive: false,
        error: errMsg
      });
    }

    const data = await response.json();
    const accountSummaries = data.accountSummaries || [];

    const accounts = accountSummaries.map((acc: any) => ({
      id: acc.account,
      account: acc.account,
      displayName: acc.displayName || 'Google Analytics Account',
      properties: (acc.propertySummaries || []).map((prop: any) => ({
        id: prop.property,
        propertyId: prop.property.replace(/^properties\//, ''),
        displayName: prop.displayName || `Property ${prop.property}`,
        accountName: acc.displayName,
        accountId: acc.account,
        propertyType: prop.propertyType || 'PROPERTY_TYPE_ORDINARY',
        timeZone: 'UTC',
        currencyCode: 'USD',
        isDemo: false,
      }))
    }));

    return res.json({ accounts, isLive: true });
  } catch (err: any) {
    return res.status(500).json({
      accounts: [],
      isLive: false,
      error: err.message || 'Failed to fetch Google Analytics accounts'
    });
  }
});

// 6. Direct GA4 Report execution endpoint
app.post('/api/ga4/report', async (req, res) => {
  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
  const { propertyId, dateRanges, dimensions, metrics, orderBys, limit } = req.body;

  if (!propertyId) {
    return res.status(400).json({ error: 'Property ID is required' });
  }

  try {
    const report = await executeGA4Report(
      propertyId,
      { dateRanges, dimensions, metrics, orderBys, limit },
      accessToken
    );
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to run GA4 report' });
  }
});

// 7. Direct GA4 Realtime execution endpoint
app.post('/api/ga4/realtime', async (req, res) => {
  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
  const { propertyId, dimensions, metrics, limit } = req.body;

  if (!propertyId) {
    return res.status(400).json({ error: 'Property ID is required' });
  }

  try {
    const report = await executeGA4Realtime(
      propertyId,
      { dimensions, metrics, limit },
      accessToken
    );
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to run realtime report' });
  }
});

// --- BigQuery Direct Endpoints ---
app.post('/api/bigquery/query', async (req, res) => {
  const authHeader = req.headers.authorization;
  const accessToken = (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined) || req.body.accessToken;
  const { projectId, query, dryRun, maxResults, useLegacySql } = req.body;

  if (!projectId || !query) {
    return res.status(400).json({ error: 'Project ID and SQL query are required' });
  }

  try {
    const result = await executeBigQueryRunQuery(
      projectId,
      query,
      { dryRun, maxResults, useLegacySql },
      accessToken
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'BigQuery query execution failed' });
  }
});

app.get('/api/bigquery/projects', async (req, res) => {
  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

  try {
    const projects = await executeBigQueryListProjects(accessToken);
    res.json({ projects, isLive: true });
  } catch (err: any) {
    res.status(500).json({ projects: [], isLive: false, error: err.message || 'Failed to list BigQuery projects' });
  }
});

app.get('/api/bigquery/datasets', async (req, res) => {
  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
  const projectId = req.query.projectId as string;

  if (!projectId) {
    return res.status(400).json({ error: 'projectId query parameter is required' });
  }

  try {
    const datasets = await executeBigQueryListDatasets(projectId, accessToken);
    res.json({ datasets });
  } catch (err: any) {
    res.status(500).json({ datasets: [], error: err.message || 'Failed to list BigQuery datasets' });
  }
});

app.get('/api/bigquery/tables', async (req, res) => {
  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
  const projectId = req.query.projectId as string;
  const datasetId = req.query.datasetId as string;

  if (!projectId || !datasetId) {
    return res.status(400).json({ error: 'projectId and datasetId query parameters are required' });
  }

  try {
    const tables = await executeBigQueryListTables(projectId, datasetId, accessToken);
    res.json({ tables });
  } catch (err: any) {
    res.status(500).json({ tables: [], error: err.message || 'Failed to list BigQuery tables' });
  }
});

app.get('/api/bigquery/schema', async (req, res) => {
  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
  const projectId = req.query.projectId as string;
  const datasetId = req.query.datasetId as string;
  const tableId = req.query.tableId as string;

  if (!projectId || !datasetId || !tableId) {
    return res.status(400).json({ error: 'projectId, datasetId, and tableId query parameters are required' });
  }

  try {
    const schema = await executeBigQueryGetSchema(projectId, datasetId, tableId, accessToken);
    res.json(schema);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get BigQuery table schema' });
  }
});

// 8. Model Context Protocol Direct Tool Invocations
app.post('/api/mcp/call', async (req, res) => {
  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
  const { name, arguments: args } = req.body;

  const startTime = Date.now();
  try {
    let result: unknown = null;

    if (name === 'ga4_run_report') {
      result = await executeGA4Report(args.propertyId, args, accessToken);
    } else if (name === 'ga4_run_realtime_report') {
      result = await executeGA4Realtime(args.propertyId, args, accessToken);
    } else if (name === 'ga4_list_accounts_and_properties') {
      if (!accessToken) {
        throw new Error('Authentication required: Sign in with Google to list your GA4 accounts and properties.');
      }
      const accountsRes = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      result = await accountsRes.json();
    } else if (name === 'ga4_get_metadata') {
      result = {
        propertyId: args.propertyId,
        standardDimensions: ['date', 'sessionSourceMedium', 'sessionDefaultChannelGroup', 'country', 'city', 'deviceCategory', 'pageTitle'],
        standardMetrics: ['activeUsers', 'newUsers', 'sessions', 'screenPageViews', 'conversions', 'totalRevenue', 'bounceRate', 'eventCount']
      };
    } else if (name === 'bigquery_run_query') {
      result = await executeBigQueryRunQuery(args.projectId, args.query, args, accessToken);
    } else if (name === 'bigquery_list_projects') {
      result = await executeBigQueryListProjects(accessToken);
    } else if (name === 'bigquery_list_datasets') {
      result = await executeBigQueryListDatasets(args.projectId, accessToken);
    } else if (name === 'bigquery_list_tables') {
      result = await executeBigQueryListTables(args.projectId, args.datasetId, accessToken);
    } else if (name === 'bigquery_get_table_schema') {
      result = await executeBigQueryGetSchema(args.projectId, args.datasetId, args.tableId, accessToken);
    } else {
      return res.status(404).json({ error: `Unknown MCP tool: ${name}` });
    }

    res.json({
      toolName: name,
      arguments: args,
      result,
      durationMs: Date.now() - startTime,
      status: 'success'
    });
  } catch (err: any) {
    res.status(500).json({
      toolName: name,
      arguments: args,
      error: err.message || 'MCP tool execution failed',
      durationMs: Date.now() - startTime,
      status: 'error'
    });
  }
});

// Helper to generate content with model fallback on 503/429/404/capacity errors
async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: any[];
    config?: any;
  }
) {
  const modelCandidates = [
    'gemini-3.7-flash',
    'gemini-flash-latest',
    'gemini-3.1-pro-preview',
    'gemini-3.1-flash-lite'
  ];

  let lastError: any = null;
  for (const model of modelCandidates) {
    try {
      const resp = await ai.models.generateContent({
        ...params,
        model,
      });
      return { response: resp, modelUsed: model };
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      console.warn(`Model ${model} attempt failed:`, errMsg);
      // If error indicates transient unavailability, rate limiting, or model not found, try next candidate
      if (
        errMsg.includes('503') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('high demand') ||
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('404') ||
        errMsg.includes('NOT_FOUND')
      ) {
        continue;
      }
      // For any other error, continue trying other models
      continue;
    }
  }
  throw lastError;
}

// Helper to execute direct GA4 query fallback if AI model is temporarily down
async function executeDirectGA4QueryFallback(
  message: string,
  propertyId: string,
  propertyName: string,
  accessToken: string,
  toolCallsLog: any[],
  noticePrefix?: string
) {
  const q = message.toLowerCase();
  let queryDimensions: any[] = [{ name: 'date' }];
  let queryMetrics: any[] = [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }];
  let isRealtime = false;
  let dateRange = [{ startDate: '30daysAgo', endDate: 'today' }];

  if (q.includes('realtime') || q.includes('right now') || q.includes('active now') || q.includes('live users')) {
    isRealtime = true;
    queryDimensions = [{ name: 'minutesAgo' }];
    queryMetrics = [{ name: 'activeUsers' }];
  } else if (q.includes('channel') || q.includes('source') || q.includes('referral') || q.includes('acquisition') || q.includes('traffic')) {
    queryDimensions = [{ name: 'sessionDefaultChannelGroup' }];
    queryMetrics = [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'bounceRate' }];
  } else if (q.includes('country') || q.includes('geography') || q.includes('city') || q.includes('location')) {
    queryDimensions = [{ name: 'country' }];
    queryMetrics = [{ name: 'activeUsers' }, { name: 'sessions' }];
  } else if (q.includes('device') || q.includes('mobile') || q.includes('desktop') || q.includes('tablet')) {
    queryDimensions = [{ name: 'deviceCategory' }];
    queryMetrics = [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'bounceRate' }];
  } else if (q.includes('page') || q.includes('landing') || q.includes('content') || q.includes('url')) {
    queryDimensions = [{ name: 'pageTitle' }];
    queryMetrics = [{ name: 'screenPageViews' }, { name: 'activeUsers' }, { name: 'bounceRate' }];
  } else if (q.includes('conversion') || q.includes('revenue') || q.includes('purchase')) {
    queryDimensions = [{ name: 'sessionDefaultChannelGroup' }];
    queryMetrics = [{ name: 'conversions' }, { name: 'totalRevenue' }, { name: 'sessions' }];
  }

  if (q.includes('7 days') || q.includes('7days') || q.includes('week')) {
    dateRange = [{ startDate: '7daysAgo', endDate: 'today' }];
  } else if (q.includes('yesterday')) {
    dateRange = [{ startDate: 'yesterday', endDate: 'yesterday' }];
  } else if (q.includes('90 days') || q.includes('quarter')) {
    dateRange = [{ startDate: '90daysAgo', endDate: 'today' }];
  }

  const callStart = Date.now();
  let liveReport: any;

  if (isRealtime) {
    liveReport = await executeGA4Realtime(propertyId, { dimensions: queryDimensions, metrics: queryMetrics }, accessToken);
    toolCallsLog.push({
      toolName: 'ga4_run_realtime_report',
      arguments: { propertyId, dimensions: queryDimensions, metrics: queryMetrics },
      response: liveReport,
      durationMs: Date.now() - callStart,
      status: 'success'
    });
  } else {
    liveReport = await executeGA4Report(propertyId, {
      dateRanges: dateRange,
      dimensions: queryDimensions,
      metrics: queryMetrics,
      limit: 25
    }, accessToken);
    toolCallsLog.push({
      toolName: 'ga4_run_report',
      arguments: { propertyId, dateRanges: dateRange, dimensions: queryDimensions, metrics: queryMetrics },
      response: liveReport,
      durationMs: Date.now() - callStart,
      status: 'success'
    });
  }

  const dimHeaders = liveReport.dimensionHeaders || [];
  const metHeaders = liveReport.metricHeaders || [];
  const rows = liveReport.rows || [];
  const isTimeSeries = dimHeaders.some((d: any) => d.name === 'date' || d.name === 'minutesAgo');
  const xKey = dimHeaders[0]?.name || 'dimension';

  const chartData = rows.slice(0, 30).map((r: any) => {
    const point: Record<string, any> = {
      [xKey]: r.dimensionValues?.[0]?.value || 'Item'
    };
    metHeaders.forEach((m: any, idx: number) => {
      point[m.name] = Number(r.metricValues?.[idx]?.value || 0);
    });
    return point;
  });

  const primaryMetric = metHeaders[0]?.name || 'activeUsers';
  const secondaryMetric = metHeaders[1]?.name || 'sessions';

  const totalPrimary = rows.reduce((sum: number, r: any) => sum + Number(r.metricValues?.[0]?.value || 0), 0);
  const totalSecondary = metHeaders[1] ? rows.reduce((sum: number, r: any) => sum + Number(r.metricValues?.[1]?.value || 0), 0) : null;

  const kpis = [
    {
      title: primaryMetric === 'activeUsers' ? 'Total Active Users' : primaryMetric,
      value: totalPrimary > 1000 ? `${(totalPrimary / 1000).toFixed(1)}k` : totalPrimary.toLocaleString(),
      change: 'Live Data',
      changeType: 'positive' as const,
      subtitle: `Property: ${propertyName}`
    },
    ...(totalSecondary !== null ? [{
      title: secondaryMetric === 'sessions' ? 'Total Sessions' : secondaryMetric,
      value: totalSecondary > 1000 ? `${(totalSecondary / 1000).toFixed(1)}k` : totalSecondary.toLocaleString(),
      change: 'Live Data',
      changeType: 'positive' as const,
      subtitle: 'Google Analytics 4'
    }] : [])
  ];

  const prefix = noticePrefix ? `${noticePrefix}\n\n` : '';

  return {
    text: `${prefix}### Live GA4 Report for **${propertyName}**\n\nRetrieved **${rows.length} rows** directly from the Google Analytics 4 API:\n\n- **Dimension**: \`${dimHeaders.map((d: any) => d.name).join(', ') || 'None'}\`\n- **Metrics**: \`${metHeaders.map((m: any) => m.name).join(', ')}\`\n- **Date Range**: \`${dateRange[0].startDate} → ${dateRange[0].endDate}\`\n- **Data Source**: Live Google Analytics Data API v1beta`,
    toolCalls: toolCallsLog,
    kpis,
    chart: {
      type: isTimeSeries ? 'line' : 'bar',
      title: `${propertyName} — ${metHeaders.map((m: any) => m.name).join(' & ')} by ${dimHeaders.map((d: any) => d.name).join(', ') || 'Period'}`,
      xAxisKey: xKey,
      dataKeys: [
        { key: primaryMetric, label: primaryMetric, color: '#2563eb' },
        ...(secondaryMetric ? [{ key: secondaryMetric, label: secondaryMetric, color: '#10b981' }] : [])
      ],
      data: chartData
    },
    tableData: {
      headers: [
        ...(dimHeaders.map((d: any) => d.name)),
        ...(metHeaders.map((m: any) => m.name))
      ],
      rows: rows.map((r: any) => [
        ...(r.dimensionValues?.map((d: any) => d.value) || []),
        ...(r.metricValues?.map((m: any) => m.value) || [])
      ]),
      totalRows: rows.length
    },
    rawReportResponse: liveReport
  };
}

// 9. Full Intelligent AI GA4 & BigQuery Chat Handler with Gemini and MCP Tool Calling
app.post('/api/gemini/chat', async (req, res) => {
  const authHeader = req.headers.authorization;
  const accessToken = (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined) || req.body.accessToken;

  const {
    message,
    propertyId = req.body.property?.propertyId,
    propertyName = req.body.property?.displayName || 'Google Analytics 4 Property',
    currency = req.body.property?.currencyCode || 'USD',
    timeZone = req.body.property?.timeZone || 'UTC',
    projectId = req.body.projectId || 'bigquery-public-data',
    isBigQueryEnabled = false
  } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // If user is not authenticated with Google, inform them to connect their account
  if (!accessToken || accessToken === 'demo_token') {
    return res.json({
      text: `### Google Account Authentication Required\n\nPlease connect your Google account to query live Google Analytics 4 ${isBigQueryEnabled ? 'and Google Cloud BigQuery ' : ''}data.\n\n1. Click the **"Sign in with Google"** button in the top navigation.\n2. Choose your Google account and grant permissions for Google Analytics${isBigQueryEnabled ? ' and BigQuery' : ''}.\n3. Your live GA4 properties${isBigQueryEnabled ? ', BigQuery datasets, and SQL querying capabilities' : ''} will unlock automatically.`,
      toolCalls: [],
      kpis: [],
      chart: undefined,
      tableData: undefined
    });
  }

  const toolCallsLog: any[] = [];

  const runReportDecl: FunctionDeclaration = {
    name: 'ga4_run_report',
    description: 'Query Google Analytics 4 report data for a property with custom dimensions, metrics, date ranges, and sorting.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        propertyId: { type: Type.STRING, description: 'The numeric GA4 Property ID' },
        dateRanges: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              startDate: { type: Type.STRING },
              endDate: { type: Type.STRING }
            },
            required: ['startDate', 'endDate']
          }
        },
        dimensions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { name: { type: Type.STRING } },
            required: ['name']
          }
        },
        metrics: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { name: { type: Type.STRING } },
            required: ['name']
          }
        },
        limit: { type: Type.INTEGER }
      },
      required: ['propertyId', 'metrics']
    }
  };

  const runRealtimeDecl: FunctionDeclaration = {
    name: 'ga4_run_realtime_report',
    description: 'Fetch real-time active users and metrics for a property in the last 30 minutes.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        propertyId: { type: Type.STRING, description: 'The numeric GA4 Property ID' },
        dimensions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { name: { type: Type.STRING } },
            required: ['name']
          }
        },
        metrics: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { name: { type: Type.STRING } },
            required: ['name']
          }
        }
      },
      required: ['propertyId', 'metrics']
    }
  };

  const runBigQueryDecl: FunctionDeclaration = {
    name: 'bigquery_run_query',
    description: 'Execute standard SQL on Google Cloud BigQuery (e.g. querying GA4 raw event tables analytics_*.events_*, e-commerce funnel queries, or custom warehouse datasets).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectId: { type: Type.STRING, description: 'GCP Project ID to run or bill the query under' },
        query: { type: Type.STRING, description: 'Standard SQL query string' },
        maxResults: { type: Type.INTEGER, description: 'Max rows to fetch (default 100)' }
      },
      required: ['projectId', 'query']
    }
  };

  const listBigQueryDatasetsDecl: FunctionDeclaration = {
    name: 'bigquery_list_datasets',
    description: 'List BigQuery datasets in a Google Cloud Project.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectId: { type: Type.STRING, description: 'GCP Project ID' }
      },
      required: ['projectId']
    }
  };

  const listBigQueryTablesDecl: FunctionDeclaration = {
    name: 'bigquery_list_tables',
    description: 'List tables in a BigQuery dataset (e.g. events_* or custom tables).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectId: { type: Type.STRING, description: 'GCP Project ID' },
        datasetId: { type: Type.STRING, description: 'BigQuery Dataset ID' }
      },
      required: ['projectId', 'datasetId']
    }
  };

  const getTableSchemaDecl: FunctionDeclaration = {
    name: 'bigquery_get_table_schema',
    description: 'Inspect columns, schema, descriptions, and partitions for a BigQuery table.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectId: { type: Type.STRING, description: 'GCP Project ID' },
        datasetId: { type: Type.STRING, description: 'BigQuery Dataset ID' },
        tableId: { type: Type.STRING, description: 'BigQuery Table ID' }
      },
      required: ['projectId', 'datasetId', 'tableId']
    }
  };

  const ai = getGeminiClient();

  if (!ai) {
    try {
      const fallbackResult = await executeDirectGA4QueryFallback(
        message,
        propertyId || '318492041',
        propertyName,
        accessToken,
        toolCallsLog
      );
      return res.json(fallbackResult);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to query Google Analytics 4 API' });
    }
  }

  try {
    const systemInstruction = isBigQueryEnabled 
      ? `You are the GA4 & BigQuery MCP (Model Context Protocol) Assistant.
You specialize in querying, analyzing, and explaining Google Analytics 4 data and Google Cloud BigQuery datasets and tables.

Context:
- GA4 Property ID: "${propertyId || 'None selected'}"
- GA4 Display Name: "${propertyName}"
- GCP Project ID for BigQuery: "${projectId}"
- Currency: "${currency}"
- Timezone: "${timeZone}"

Your Tools:
1. \`ga4_run_report\`: For aggregated GA4 reporting queries (sessions, activeUsers, conversions, screenPageViews, bounceRate) over date ranges.
2. \`ga4_run_realtime_report\`: For real-time active users and recent events in the last 30 minutes.
3. \`bigquery_list_datasets\`, \`bigquery_list_tables\`, \`bigquery_get_table_schema\`: For high-level discovery of datasets, tables, row counts, and schema definitions available to the user.
4. \`bigquery_run_query\`: For executing Standard SQL queries on any client-defined BigQuery datasets, tables, or views.

Decision Guide:
- When a user asks standard analytics questions for GA4, call \`ga4_run_report\` or \`ga4_run_realtime_report\`.
- When a user asks to explore BigQuery datasets, discover available tables, inspect schemas/columns, or run custom SQL queries on their data, call the appropriate BigQuery tools.
- Always provide structured Markdown summaries with actionable data takeaways.`
      : `You are the Google Analytics 4 (GA4) MCP Assistant.
You specialize in querying, analyzing, and explaining Google Analytics 4 property data via the GA4 Data API.

Context:
- GA4 Property ID: "${propertyId || 'None selected'}"
- GA4 Display Name: "${propertyName}"
- Currency: "${currency}"
- Timezone: "${timeZone}"

Your Tools:
1. \`ga4_run_report\`: For aggregated GA4 reporting queries (sessions, activeUsers, conversions, screenPageViews, bounceRate) over date ranges.
2. \`ga4_run_realtime_report\`: For real-time active users and recent events in the last 30 minutes.

Decision Guide:
- When a user asks standard analytics questions, call \`ga4_run_report\` or \`ga4_run_realtime_report\`.
- Always provide structured Markdown summaries with actionable data takeaways.`;

    const activeFunctionDeclarations = isBigQueryEnabled
      ? [
          runReportDecl,
          runRealtimeDecl,
          runBigQueryDecl,
          listBigQueryDatasetsDecl,
          listBigQueryTablesDecl,
          getTableSchemaDecl
        ]
      : [
          runReportDecl,
          runRealtimeDecl
        ];

    let responseWrap;
    try {
      responseWrap = await generateContentWithFallback(ai, {
        contents: [
          { role: 'user', parts: [{ text: `User Query: ${message}` }] }
        ],
        config: {
          systemInstruction,
          tools: [{
            functionDeclarations: activeFunctionDeclarations
          }]
        }
      });
    } catch (aiErr: any) {
      console.warn('Gemini initial call encountered high demand or failure, falling back to direct query parser:', aiErr.message);
      const directResult = await executeDirectGA4QueryFallback(
        message,
        propertyId || '318492041',
        propertyName,
        accessToken,
        toolCallsLog,
        `*(Note: Gemini model service is currently experiencing temporary high demand; your query was processed directly through the analytics engine)*`
      );
      return res.json(directResult);
    }

    const response = responseWrap.response;
    let latestReportData: any = null;
    let latestBigQueryResult: any = null;
    let finalAssistantText = '';

    const candidates = response.candidates || [];
    const functionCalls = candidates[0]?.content?.parts?.filter(p => p.functionCall) || [];

    if (functionCalls.length > 0) {
      const functionResponses = [];

      for (const fc of functionCalls) {
        const call = fc.functionCall!;
        const callArgs = (call.args as any) || {};
        const callStart = Date.now();

        let toolResult: any = null;
        let toolError: string | undefined;

        try {
          if (call.name === 'ga4_run_report') {
            const queryPropId = callArgs.propertyId || propertyId;
            toolResult = await executeGA4Report(queryPropId, callArgs, accessToken);
            latestReportData = toolResult;
          } else if (call.name === 'ga4_run_realtime_report') {
            const queryPropId = callArgs.propertyId || propertyId;
            toolResult = await executeGA4Realtime(queryPropId, callArgs, accessToken);
            latestReportData = toolResult;
          } else if (call.name === 'bigquery_run_query') {
            const qProjId = callArgs.projectId || projectId;
            toolResult = await executeBigQueryRunQuery(qProjId, callArgs.query, callArgs, accessToken);
            latestBigQueryResult = toolResult;
          } else if (call.name === 'bigquery_list_datasets') {
            const qProjId = callArgs.projectId || projectId;
            toolResult = await executeBigQueryListDatasets(qProjId, accessToken);
          } else if (call.name === 'bigquery_list_tables') {
            const qProjId = callArgs.projectId || projectId;
            toolResult = await executeBigQueryListTables(qProjId, callArgs.datasetId, accessToken);
          } else if (call.name === 'bigquery_get_table_schema') {
            const qProjId = callArgs.projectId || projectId;
            toolResult = await executeBigQueryGetSchema(qProjId, callArgs.datasetId, callArgs.tableId, accessToken);
          }
        } catch (err: any) {
          toolError = err.message;
          toolResult = { error: err.message };
        }

        toolCallsLog.push({
          toolName: call.name,
          arguments: callArgs,
          response: toolResult,
          durationMs: Date.now() - callStart,
          status: toolError ? 'error' : 'success',
          error: toolError
        });

        functionResponses.push({
          functionResponse: {
            name: call.name,
            response: { output: toolResult }
          }
        });
      }

      try {
        const followUpWrap = await generateContentWithFallback(ai, {
          contents: [
            { role: 'user', parts: [{ text: `User Query: ${message}` }] },
            { role: 'model', parts: functionCalls },
            { role: 'user', parts: functionResponses }
          ],
          config: {
            systemInstruction,
          }
        });
        finalAssistantText = followUpWrap.response.text || 'Analyzed your data successfully.';
      } catch (followUpErr: any) {
        console.warn('Followup Gemini call encountered high demand, synthesizing response from results:', followUpErr.message);
        if (latestBigQueryResult) {
          finalAssistantText = `### BigQuery SQL Execution Summary\n\n- **Project**: \`${latestBigQueryResult.projectId}\`\n- **Rows Retrieved**: ${latestBigQueryResult.rows.length}\n- **Bytes Processed**: ${latestBigQueryResult.totalBytesProcessed ? (latestBigQueryResult.totalBytesProcessed / 1024 / 1024).toFixed(2) + ' MB' : 'Cached'}\n\n\`\`\`sql\n${latestBigQueryResult.query}\n\`\`\``;
        } else {
          finalAssistantText = `### Live GA4 Report Analysis for **${propertyName}**\n\nRetrieved ${latestReportData?.rows?.length || 0} rows of live analytics data.`;
        }
      }
    } else {
      finalAssistantText = response.text || 'Processed your request.';
    }

    // Format BigQuery results if BigQuery was invoked
    if (latestBigQueryResult && (!latestReportData || latestBigQueryResult.rows.length > 0)) {
      const headers = latestBigQueryResult.headers || [];
      const rows = latestBigQueryResult.rows || [];
      const numCols = headers.length;

      // Detect potential chart keys: 1st column string/label, 2nd column numerical
      let chartConfig = undefined;
      if (rows.length > 0 && numCols >= 2) {
        const xKey = headers[0];
        const numKey = headers[1];
        const isSecondColNumeric = rows.some((r: any) => typeof r[1] === 'number' || !isNaN(Number(r[1])));

        if (isSecondColNumeric) {
          const chartData = rows.slice(0, 25).map((r: any) => {
            const pt: Record<string, any> = { [xKey]: String(r[0]) };
            for (let i = 1; i < Math.min(numCols, 4); i++) {
              const val = Number(r[i]);
              if (!isNaN(val)) {
                pt[headers[i]] = val;
              }
            }
            return pt;
          });

          chartConfig = {
            type: 'bar' as const,
            title: `BigQuery: ${headers.slice(1, 3).join(' & ')} by ${xKey}`,
            xAxisKey: xKey,
            dataKeys: headers.slice(1, Math.min(numCols, 4)).map((h: string, idx: number) => ({
              key: h,
              label: h,
              color: idx === 0 ? '#2563eb' : idx === 1 ? '#10b981' : '#f59e0b'
            })),
            data: chartData
          };
        }
      }

      const kpis = [];
      if (latestBigQueryResult.totalBytesProcessed !== undefined) {
        const mb = (latestBigQueryResult.totalBytesProcessed / (1024 * 1024)).toFixed(2);
        kpis.push({
          title: 'Bytes Processed',
          value: `${mb} MB`,
          change: 'BigQuery Scan',
          changeType: 'neutral' as const,
          subtitle: `Project: ${latestBigQueryResult.projectId}`
        });
      }
      kpis.push({
        title: 'Total Result Rows',
        value: rows.length.toLocaleString(),
        change: 'SQL Output',
        changeType: 'positive' as const,
        subtitle: latestBigQueryResult.cacheHit ? 'Cache Hit' : 'BigQuery Engine'
      });

      return res.json({
        text: finalAssistantText,
        toolCalls: toolCallsLog,
        kpis,
        chart: chartConfig,
        tableData: {
          headers,
          rows: rows.map((r: any) => r.map((c: any) => (c === null || c === undefined ? '-' : c))),
          totalRows: rows.length
        },
        rawBigQueryResult: latestBigQueryResult,
        sourceType: 'bigquery'
      });
    }

    // Format GA4 results if GA4 report was queried
    if (!latestReportData && propertyId) {
      latestReportData = await executeGA4Report(
        propertyId,
        {
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'date' }],
          metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }]
        },
        accessToken
      );
    }

    if (latestReportData) {
      const dimHeaders = latestReportData.dimensionHeaders || [];
      const metHeaders = latestReportData.metricHeaders || [];
      const rows = latestReportData.rows || [];

      const isTimeSeries = dimHeaders.some((d: any) => d.name === 'date' || d.name === 'minutesAgo');
      const xKey = dimHeaders[0]?.name || 'dimension';

      const chartData = rows.slice(0, 30).map((r: any) => {
        const point: Record<string, any> = {
          [xKey]: r.dimensionValues?.[0]?.value || 'Item'
        };
        metHeaders.forEach((m: any, idx: number) => {
          point[m.name] = Number(r.metricValues?.[idx]?.value || 0);
        });
        return point;
      });

      const primaryMetric = metHeaders[0]?.name || 'activeUsers';
      const secondaryMetric = metHeaders[1]?.name || 'sessions';

      const kpis = [];
      if (rows.length > 0) {
        const topMetricVal = rows.reduce((sum: number, r: any) => sum + Number(r.metricValues?.[0]?.value || 0), 0);
        kpis.push({
          title: primaryMetric === 'activeUsers' ? 'Total Active Users' : primaryMetric,
          value: topMetricVal > 1000 ? `${(topMetricVal / 1000).toFixed(1)}k` : topMetricVal.toLocaleString(),
          change: 'Live Data',
          changeType: 'positive' as const,
          subtitle: `Selected: ${propertyName}`
        });

        if (metHeaders[1]) {
          const secMetricVal = rows.reduce((sum: number, r: any) => sum + Number(r.metricValues?.[1]?.value || 0), 0);
          kpis.push({
            title: secondaryMetric === 'sessions' ? 'Total Sessions' : secondaryMetric,
            value: secMetricVal > 1000 ? `${(secMetricVal / 1000).toFixed(1)}k` : secMetricVal.toLocaleString(),
            change: 'Live Data',
            changeType: 'positive' as const,
            subtitle: 'Google Analytics 4'
          });
        }
      }

      return res.json({
        text: finalAssistantText,
        toolCalls: toolCallsLog,
        kpis,
        chart: {
          type: isTimeSeries ? 'line' : 'bar',
          title: `${propertyName} — ${metHeaders.map((m: any) => m.name).join(' & ')} by ${dimHeaders.map((d: any) => d.name).join(', ')}`,
          xAxisKey: xKey,
          dataKeys: [
            { key: primaryMetric, label: primaryMetric, color: '#2563eb' },
            ...(secondaryMetric ? [{ key: secondaryMetric, label: secondaryMetric, color: '#10b981' }] : [])
          ],
          data: chartData
        },
        tableData: {
          headers: [
            ...(dimHeaders.map((d: any) => d.name)),
            ...(metHeaders.map((m: any) => m.name))
          ],
          rows: rows.map((r: any) => [
            ...(r.dimensionValues?.map((d: any) => d.value) || []),
            ...(r.metricValues?.map((m: any) => m.value) || [])
          ]),
          totalRows: rows.length
        },
        rawReportResponse: latestReportData,
        sourceType: 'ga4'
      });
    }

    res.json({
      text: finalAssistantText,
      toolCalls: toolCallsLog
    });

  } catch (error: any) {
    console.error('Chat error, running final direct query fallback:', error);
    try {
      const directResult = await executeDirectGA4QueryFallback(
        message,
        propertyId || '318492041',
        propertyName,
        accessToken,
        toolCallsLog
      );
      return res.json(directResult);
    } catch (finalErr: any) {
      res.status(500).json({ error: finalErr.message || error.message || 'Chat generation failed' });
    }
  }
});

// Vite middleware for development & static serving for production
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GA4 MCP Server running on port ${PORT}`);
  });
}

start();
