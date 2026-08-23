const BASE = '/api';

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getSites: () => req('GET', '/sites'),
  breakSite: (site) => req('POST', `/sites/${site}/break`),
  restoreSite: (site) => req('POST', `/sites/${site}/restore`),
  nudgePrices: (site) => req('POST', `/sites/${site}/nudge-prices`),

  listScrapers: () => req('GET', '/scrapers'),
  createScraper: (payload) => req('POST', '/scrapers', payload),
  getScraper: (id) => req('GET', `/scrapers/${id}`),
  runScraper: (id) => req('POST', `/scrapers/${id}/run`),
  healScraper: (id) => req('POST', `/scrapers/${id}/heal`),

  getTimeline: (site) => req('GET', `/timeline${site ? `?site=${site}` : ''}`),
  getInsights: () => req('GET', '/insights'),
};
