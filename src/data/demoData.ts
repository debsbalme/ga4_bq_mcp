import { GA4Account, GA4Property, GA4ReportResponse } from '../types';

export const DEMO_PROPERTIES: GA4Property[] = [
  {
    id: 'properties/318492041',
    propertyId: '318492041',
    displayName: 'Google Merchandise Store (Ecommerce)',
    accountName: 'Google Retail Demo',
    accountId: 'accounts/1948271',
    industryCategory: 'SHOPPING',
    timeZone: 'America/Los_Angeles',
    currencyCode: 'USD',
    propertyType: 'PROPERTY_TYPE_ORDINARY',
    isDemo: true,
  },
  {
    id: 'properties/409281755',
    propertyId: '409281755',
    displayName: 'CloudPulse SaaS Platform (B2B App)',
    accountName: 'CloudPulse Technologies',
    accountId: 'accounts/2019482',
    industryCategory: 'INTERNET_AND_TELECOM',
    timeZone: 'America/New_York',
    currencyCode: 'USD',
    propertyType: 'PROPERTY_TYPE_ORDINARY',
    isDemo: true,
  },
  {
    id: 'properties/510293847',
    propertyId: '510293847',
    displayName: 'NextGen Tech Journal (Media & Blog)',
    accountName: 'NextGen Media Network',
    accountId: 'accounts/3827190',
    industryCategory: 'NEWS_AND_MEDIA',
    timeZone: 'Europe/London',
    currencyCode: 'EUR',
    propertyType: 'PROPERTY_TYPE_ORDINARY',
    isDemo: true,
  }
];

export const DEMO_ACCOUNTS: GA4Account[] = [
  {
    id: 'accounts/1948271',
    account: 'accounts/1948271',
    displayName: 'Google Retail Demo',
    properties: [DEMO_PROPERTIES[0]],
  },
  {
    id: 'accounts/2019482',
    account: 'accounts/2019482',
    displayName: 'CloudPulse Technologies',
    properties: [DEMO_PROPERTIES[1]],
  },
  {
    id: 'accounts/3827190',
    account: 'accounts/3827190',
    displayName: 'NextGen Media Network',
    properties: [DEMO_PROPERTIES[2]],
  }
];

// Helper to generate realistic dynamic report data based on requested metrics and dimensions
export function generateSimulatedGA4Report(
  propertyId: string,
  dimensions: Array<{ name: string }> = [],
  metrics: Array<{ name: string }> = [
    { name: 'activeUsers' },
    { name: 'sessions' },
    { name: 'screenPageViews' }
  ],
  dateRanges: Array<{ startDate: string; endDate: string }> = [{ startDate: '30daysAgo', endDate: 'today' }]
): GA4ReportResponse {
  const dimNames = dimensions.map(d => d.name);
  const metNames = metrics.map(m => m.name);

  // Time-series query (date dimension)
  if (dimNames.includes('date')) {
    const days = 30;
    const rows = [];
    const today = new Date();

    let totalUsers = 0;
    let totalSessions = 0;
    let totalViews = 0;
    let totalRev = 0;

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
      const dayOfWeek = d.getDay();
      const weekendMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 0.75 : 1.15;
      const baseVariation = 1 + Math.sin(i * 0.4) * 0.2;

      const propMultiplier = propertyId.includes('318492041') ? 1.4 : propertyId.includes('409281755') ? 0.9 : 1.1;

      const activeUsers = Math.round((1200 + Math.random() * 400) * weekendMultiplier * baseVariation * propMultiplier);
      const sessions = Math.round(activeUsers * (1.28 + Math.random() * 0.15));
      const screenPageViews = Math.round(sessions * (3.8 + Math.random() * 0.6));
      const conversions = Math.round(sessions * (0.038 + Math.random() * 0.015));
      const totalRevenue = Math.round(conversions * (45 + Math.random() * 25) * 100) / 100;
      const bounceRate = Math.round((0.38 + Math.random() * 0.08) * 1000) / 1000;
      const averageSessionDuration = Math.round((145 + Math.random() * 35));

      totalUsers += activeUsers;
      totalSessions += sessions;
      totalViews += screenPageViews;
      totalRev += totalRevenue;

      const metricVals = metNames.map(name => {
        switch (name) {
          case 'activeUsers': return { value: activeUsers.toString() };
          case 'sessions': return { value: sessions.toString() };
          case 'screenPageViews': return { value: screenPageViews.toString() };
          case 'conversions': return { value: conversions.toString() };
          case 'totalRevenue': return { value: totalRevenue.toFixed(2) };
          case 'bounceRate': return { value: bounceRate.toString() };
          case 'userEngagementDuration': return { value: (activeUsers * averageSessionDuration).toString() };
          case 'averageSessionDuration': return { value: averageSessionDuration.toString() };
          case 'eventCount': return { value: (screenPageViews * 2.8).toFixed(0) };
          default: return { value: Math.round(100 + Math.random() * 500).toString() };
        }
      });

      rows.push({
        dimensionValues: [{ value: dateStr }],
        metricValues: metricVals
      });
    }

    return {
      dimensionHeaders: dimensions.map(d => ({ name: d.name })),
      metricHeaders: metrics.map(m => ({ name: m.name, type: m.name.includes('Revenue') ? 'TYPE_CURRENCY' : 'TYPE_INTEGER' })),
      rows,
      totals: [{
        metricValues: metNames.map(name => {
          if (name === 'activeUsers') return { value: totalUsers.toString() };
          if (name === 'sessions') return { value: totalSessions.toString() };
          if (name === 'screenPageViews') return { value: totalViews.toString() };
          if (name === 'totalRevenue') return { value: totalRev.toFixed(2) };
          return { value: '0' };
        })
      }],
      rowCount: rows.length,
      metadata: {
        currencyCode: 'USD',
        timeZone: 'America/Los_Angeles'
      }
    };
  }

  // Traffic Source breakdown (sessionSourceMedium or sessionDefaultChannelGroup)
  if (dimNames.some(d => d.includes('Source') || d.includes('Channel') || d.includes('sourceMedium'))) {
    const sources = [
      { source: 'google / organic', channel: 'Organic Search', users: 18450, sessions: 24300, conv: 920, rev: 41400 },
      { source: 'google / cpc', channel: 'Paid Search', users: 11200, sessions: 15400, conv: 780, rev: 35100 },
      { source: '(direct) / (none)', channel: 'Direct', users: 9800, sessions: 13200, conv: 410, rev: 18450 },
      { source: 'newsletter / email', channel: 'Email', users: 5400, sessions: 8100, conv: 390, rev: 17550 },
      { source: 'linkedin / referral', channel: 'Paid Social', users: 3900, sessions: 5200, conv: 140, rev: 6300 },
      { source: 'youtube / video', channel: 'Video', users: 3100, sessions: 4300, conv: 85, rev: 3825 },
      { source: 'github.com / referral', channel: 'Referral', users: 2400, sessions: 3100, conv: 62, rev: 2790 },
    ];

    const rows = sources.map(item => ({
      dimensionValues: dimNames.map(d => ({
        value: d.includes('Channel') ? item.channel : item.source
      })),
      metricValues: metNames.map(name => {
        if (name === 'activeUsers') return { value: item.users.toString() };
        if (name === 'sessions') return { value: item.sessions.toString() };
        if (name === 'conversions') return { value: item.conv.toString() };
        if (name === 'totalRevenue') return { value: item.rev.toFixed(2) };
        if (name === 'screenPageViews') return { value: (item.sessions * 3.4).toFixed(0) };
        if (name === 'bounceRate') return { value: (0.32 + Math.random() * 0.15).toFixed(3) };
        return { value: (item.users * 0.8).toFixed(0) };
      })
    }));

    return {
      dimensionHeaders: dimensions.map(d => ({ name: d.name })),
      metricHeaders: metrics.map(m => ({ name: m.name, type: m.name.includes('Revenue') ? 'TYPE_CURRENCY' : 'TYPE_INTEGER' })),
      rows,
      rowCount: rows.length,
      metadata: { currencyCode: 'USD', timeZone: 'America/Los_Angeles' }
    };
  }

  // Country / Geo breakdown
  if (dimNames.includes('country') || dimNames.includes('city')) {
    const geos = [
      { country: 'United States', city: 'New York', users: 24500, sessions: 33100, rev: 52400 },
      { country: 'United Kingdom', city: 'London', users: 8400, sessions: 11200, rev: 17600 },
      { country: 'Germany', city: 'Berlin', users: 6200, sessions: 8500, rev: 12900 },
      { country: 'Canada', city: 'Toronto', users: 5100, sessions: 6900, rev: 10500 },
      { country: 'France', city: 'Paris', users: 4300, sessions: 5800, rev: 8700 },
      { country: 'Japan', city: 'Tokyo', users: 3900, sessions: 5200, rev: 9200 },
      { country: 'Australia', city: 'Sydney', users: 3200, sessions: 4400, rev: 7100 },
      { country: 'India', city: 'Bengaluru', users: 3100, sessions: 4100, rev: 3800 },
    ];

    const rows = geos.map(g => ({
      dimensionValues: dimNames.map(d => ({
        value: d === 'city' ? g.city : g.country
      })),
      metricValues: metNames.map(name => {
        if (name === 'activeUsers') return { value: g.users.toString() };
        if (name === 'sessions') return { value: g.sessions.toString() };
        if (name === 'totalRevenue') return { value: g.rev.toFixed(2) };
        if (name === 'screenPageViews') return { value: (g.sessions * 3.6).toFixed(0) };
        return { value: Math.round(g.users * 0.4).toString() };
      })
    }));

    return {
      dimensionHeaders: dimensions.map(d => ({ name: d.name })),
      metricHeaders: metrics.map(m => ({ name: m.name, type: 'TYPE_INTEGER' })),
      rows,
      rowCount: rows.length,
      metadata: { currencyCode: 'USD', timeZone: 'America/Los_Angeles' }
    };
  }

  // Device Category breakdown
  if (dimNames.includes('deviceCategory')) {
    const devices = [
      { device: 'desktop', users: 29400, sessions: 41200, bounce: '0.342', conv: 1450 },
      { device: 'mobile', users: 21800, sessions: 28900, bounce: '0.468', conv: 680 },
      { device: 'tablet', users: 2100, sessions: 2700, bounce: '0.410', conv: 75 },
    ];

    const rows = devices.map(dev => ({
      dimensionValues: [{ value: dev.device }],
      metricValues: metNames.map(name => {
        if (name === 'activeUsers') return { value: dev.users.toString() };
        if (name === 'sessions') return { value: dev.sessions.toString() };
        if (name === 'bounceRate') return { value: dev.bounce };
        if (name === 'conversions') return { value: dev.conv.toString() };
        if (name === 'screenPageViews') return { value: (dev.sessions * 3.2).toFixed(0) };
        return { value: (dev.users * 0.5).toFixed(0) };
      })
    }));

    return {
      dimensionHeaders: dimensions.map(d => ({ name: d.name })),
      metricHeaders: metrics.map(m => ({ name: m.name, type: 'TYPE_INTEGER' })),
      rows,
      rowCount: rows.length,
    };
  }

  // Page title / landing page breakdown
  if (dimNames.some(d => d.includes('page') || d.includes('Page') || d.includes('landingPage'))) {
    const pages = [
      { path: '/home', title: 'Home — Cloud Platform & Store', views: 42100, users: 28400, time: 82 },
      { path: '/products/analytics-pro', title: 'Analytics Pro — Pricing & Features', views: 18900, users: 12500, time: 145 },
      { path: '/blog/ga4-mcp-guide', title: 'Guide: Using GA4 with Model Context Protocol', views: 14200, users: 11100, time: 230 },
      { path: '/checkout', title: 'Checkout & Order Summary', views: 7600, users: 5100, time: 94 },
      { path: '/docs/api-reference', title: 'Developer Documentation & API Reference', views: 6400, users: 3800, time: 190 },
      { path: '/signup', title: 'Create Free Account — CloudPulse', views: 5200, users: 4600, time: 65 },
    ];

    const rows = pages.map(p => ({
      dimensionValues: dimNames.map(d => ({
        value: d.includes('Title') ? p.title : p.path
      })),
      metricValues: metNames.map(name => {
        if (name === 'screenPageViews') return { value: p.views.toString() };
        if (name === 'activeUsers') return { value: p.users.toString() };
        if (name === 'averageSessionDuration') return { value: p.time.toString() };
        if (name === 'sessions') return { value: Math.round(p.users * 1.2).toString() };
        return { value: '100' };
      })
    }));

    return {
      dimensionHeaders: dimensions.map(d => ({ name: d.name })),
      metricHeaders: metrics.map(m => ({ name: m.name, type: 'TYPE_INTEGER' })),
      rows,
      rowCount: rows.length,
    };
  }

  // General fallback
  const rows = [
    {
      dimensionValues: dimNames.map(d => ({ value: 'Standard View' })),
      metricValues: metNames.map(m => ({ value: '45800' }))
    }
  ];

  return {
    dimensionHeaders: dimensions.map(d => ({ name: d.name })),
    metricHeaders: metrics.map(m => ({ name: m.name, type: 'TYPE_INTEGER' })),
    rows,
    rowCount: 1
  };
}

export function generateSimulatedRealtimeReport(propertyId: string): GA4ReportResponse {
  // Realtime report: active users in last 30 minutes, minute by minute
  const rows = [];
  const now = new Date();
  let totalActive = 0;

  for (let i = 29; i >= 0; i--) {
    const minAgo = i;
    const active = Math.round(18 + Math.random() * 24 + (i < 5 ? 12 : 0));
    totalActive += active;
    rows.push({
      dimensionValues: [{ value: `${minAgo} min ago` }],
      metricValues: [{ value: active.toString() }]
    });
  }

  return {
    dimensionHeaders: [{ name: 'minutesAgo' }],
    metricHeaders: [{ name: 'activeUsers', type: 'TYPE_INTEGER' }],
    rows,
    totals: [{ metricValues: [{ value: totalActive.toString() }] }],
    rowCount: rows.length,
  };
}
