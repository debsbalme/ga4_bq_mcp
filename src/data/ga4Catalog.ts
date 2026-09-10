export interface GA4CatalogItem {
  id: string;
  name: string;
  category: 'Traffic' | 'User' | 'Ecommerce' | 'Event' | 'Page/Screen' | 'Device' | 'Geo' | 'Engagement';
  description: string;
  type?: string;
}

export const GA4_METRICS: GA4CatalogItem[] = [
  { id: 'activeUsers', name: 'Active Users', category: 'User', description: 'The number of distinct users who visited your website or application.' },
  { id: 'newUsers', name: 'New Users', category: 'User', description: 'The number of users who interacted with your site or launched your app for the first time.' },
  { id: 'sessions', name: 'Sessions', category: 'Traffic', description: 'The number of sessions that began on your site or app.' },
  { id: 'screenPageViews', name: 'Views (Pageviews)', category: 'Page/Screen', description: 'The total number of app screens and web pages your users saw.' },
  { id: 'conversions', name: 'Key Events (Conversions)', category: 'Ecommerce', description: 'The number of key events (conversions) triggered by users.' },
  { id: 'totalRevenue', name: 'Total Revenue', category: 'Ecommerce', description: 'The total revenue from purchases, subscriptions, and in-app advertising.' },
  { id: 'eventCount', name: 'Event Count', category: 'Event', description: 'The count of all triggered events.' },
  { id: 'bounceRate', name: 'Bounce Rate', category: 'Engagement', description: 'The percentage of sessions that were not engaged sessions.' },
  { id: 'engagementRate', name: 'Engagement Rate', category: 'Engagement', description: 'The percentage of engaged sessions.' },
  { id: 'averageSessionDuration', name: 'Avg Session Duration', category: 'Engagement', description: 'The average duration (in seconds) of users sessions.' },
  { id: 'userEngagementDuration', name: 'User Engagement Time', category: 'Engagement', description: 'The total amount of time your app was in the foreground or website was in focus.' },
  { id: 'transactions', name: 'Transactions', category: 'Ecommerce', description: 'The count of e-commerce transactions completed.' },
  { id: 'averagePurchaseRevenue', name: 'Avg Purchase Revenue', category: 'Ecommerce', description: 'Average revenue per purchase transaction.' },
  { id: 'crashFreeUsersRate', name: 'Crash-free Users Rate', category: 'User', description: 'The percentage of active users who did not experience a crash.' },
];

export const GA4_DIMENSIONS: GA4CatalogItem[] = [
  { id: 'date', name: 'Date (YYYYMMDD)', category: 'Traffic', description: 'The date of the event in YYYYMMDD format.' },
  { id: 'dayOfWeekName', name: 'Day of Week', category: 'Traffic', description: 'The day of the week (e.g. Monday, Tuesday).' },
  { id: 'sessionDefaultChannelGroup', name: 'Default Channel Group', category: 'Traffic', description: 'Rule-based classification of traffic sources (Organic, Direct, Paid, Referral).' },
  { id: 'sessionSourceMedium', name: 'Source / Medium', category: 'Traffic', description: 'The source and medium that initiated the session (e.g. google / cpc, newsletter / email).' },
  { id: 'sessionSource', name: 'Session Source', category: 'Traffic', description: 'The origin of your traffic (e.g. google, bing, newsletter).' },
  { id: 'sessionMedium', name: 'Session Medium', category: 'Traffic', description: 'The general category of the source (e.g. organic, cpc, referral, email).' },
  { id: 'sessionCampaignName', name: 'Campaign Name', category: 'Traffic', description: 'The marketing campaign name associated with the session.' },
  { id: 'country', name: 'Country', category: 'Geo', description: 'The country from which user activity originated.' },
  { id: 'city', name: 'City', category: 'Geo', description: 'The city from which user activity originated.' },
  { id: 'deviceCategory', name: 'Device Category', category: 'Device', description: 'The type of device (desktop, mobile, tablet).' },
  { id: 'operatingSystem', name: 'Operating System', category: 'Device', description: 'The OS used by the visitor (iOS, Android, Windows, Mac).' },
  { id: 'browser', name: 'Browser', category: 'Device', description: 'The browser used (Chrome, Safari, Firefox, Edge).' },
  { id: 'pageTitle', name: 'Page Title', category: 'Page/Screen', description: 'The web page title or screen name.' },
  { id: 'pagePath', name: 'Page Path', category: 'Page/Screen', description: 'The path of the page URL excluding host and query parameters.' },
  { id: 'landingPagePlusQueryString', name: 'Landing Page', category: 'Page/Screen', description: 'The first page viewed in a session.' },
  { id: 'eventName', name: 'Event Name', category: 'Event', description: 'The name of the triggered event (e.g. page_view, purchase, click).' },
];

export const DATE_PRESETS = [
  { label: 'Today', startDate: 'today', endDate: 'today' },
  { label: 'Yesterday', startDate: 'yesterday', endDate: 'yesterday' },
  { label: 'Last 7 Days', startDate: '7daysAgo', endDate: 'yesterday' },
  { label: 'Last 28 Days', startDate: '28daysAgo', endDate: 'yesterday' },
  { label: 'Last 30 Days', startDate: '30daysAgo', endDate: 'today' },
  { label: 'Last 90 Days', startDate: '90daysAgo', endDate: 'today' },
  { label: 'Year to Date', startDate: '365daysAgo', endDate: 'today' },
];
