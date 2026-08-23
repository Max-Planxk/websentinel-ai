/**
 * WebSentinel AI — backend server.
 * Pure Node `http`, zero external dependencies (aside from dotenv for env vars).
 * Run with: node server.js
 */

require('dotenv').config();

const http = require('http');
const { URL } = require('url');

const mockSites = require('./data/mockSites');
const store = require('./data/store');
const { runScraper, computeHealthScore } = require('./services/scraperEngine');
const aiHealer = require('./services/aiHealer');
const insights = require('./services/insights');
const brightdata = require('./services/brightdata');

const PORT = process.env.PORT || 4000;

// The one real URL we've confirmed talks to a live Bright Data collector.
// Keep this exact string — small variants (.co.in, .com.in) hit a different
// page and the collector's Parser code won't match anything on them.
const NIKE_LIVE_URL = 'https://www.nike.com/in/';

// --- tiny router ---------------------------------------------------------

const routes = [];
function route(method, path, handler) {
  const paramNames = [];
  const pattern = path.replace(/:[^/]+/g, (m) => {
    paramNames.push(m.slice(1));
    return '([^/]+)';
  });
  routes.push({ method, regex: new RegExp(`^${pattern}$`), paramNames, handler });
}

function send(res, status, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(payload);
}

function sendHtml(res, status, html) {
  res.writeHead(status, { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' });
  res.end(html);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// --- default field selectors for a "healthy" (v1) mock site --------------
const DEFAULT_MOCK_FIELD_SELECTORS = {
  product: '.product-name',
  price: '.product-price',
  availability: '.product-availability',
  rating: '.product-rating',
};

function statusFromScore(score) {
  if (score >= 90) return 'healthy';
  if (score >= 60) return 'degraded';
  return 'broken';
}

// --- routes ----------------------------------------------------------------

route('GET', '/api/sites', async () => {
  const sites = mockSites.listSites().map((name) => ({
    name,
    version: mockSites.getVersion(name),
    productCount: mockSites.getProducts(name).length,
  }));
  return {
    status: 200,
    body: {
      sites,
      brightDataConfigured: brightdata.isStudioConfigured(),
      liveUrl: NIKE_LIVE_URL,
    },
  };
});

route('GET', '/api/mock/:site', async (params) => {
  const html = mockSites.getHtml(params.site);
  return { status: 200, html };
});

route('POST', '/api/sites/:site/break', async (params) => {
  mockSites.breakSite(params.site);
  store.logEvent(params.site, 'dom_change', `${params.site}'s website changed its DOM structure.`);
  return { status: 200, body: { site: params.site, version: mockSites.getVersion(params.site) } };
});

route('POST', '/api/sites/:site/restore', async (params) => {
  mockSites.restoreSite(params.site);
  store.logEvent(params.site, 'dom_restored', `${params.site}'s website DOM restored to original structure.`);
  return { status: 200, body: { site: params.site, version: mockSites.getVersion(params.site) } };
});

route('POST', '/api/sites/:site/nudge-prices', async (params) => {
  // This simulates the competitor's website itself changing prices.
  // We deliberately do NOT record a snapshot here — insights should only
  // be built from what a scraper run actually observed, not from this
  // "ground truth" event. Run the scraper again after nudging to capture it.
  const products = mockSites.nudgePrices(params.site);
  return { status: 200, body: { site: params.site, products } };
});

route('GET', '/api/scrapers', async () => {
  return { status: 200, body: { scrapers: store.listScrapers() } };
});

route('POST', '/api/scrapers', async (params, req) => {
  const body = await readBody(req);
  const { name, url, fields } = body;
  if (!name || !url) return { status: 400, body: { error: 'name and url are required' } };

  const chosenFields =
    Array.isArray(fields) && fields.length ? fields : Object.keys(DEFAULT_MOCK_FIELD_SELECTORS);

  const trimmedUrl = url.trim();
  const isMockSite = mockSites.listSites().includes(trimmedUrl);
  const isNikeLive = trimmedUrl === NIKE_LIVE_URL;

  let engine;
  let cardSelector = null;
  let fieldSelectors = null;
  let collectorId = null;

  if (isNikeLive) {
    // Real Bright Data Scraper Studio collector. Can be slow (up to several
    // minutes) or occasionally time out — that's the live collector's
    // behavior, not this server's.
    engine = 'scraper-studio';
    collectorId = process.env.BRIGHTDATA_COLLECTOR_ID || null;
  } else if (isMockSite) {
    engine = 'mock';
    cardSelector = '.product-card';
    fieldSelectors = {};
    for (const f of chosenFields) fieldSelectors[f] = DEFAULT_MOCK_FIELD_SELECTORS[f] || `.${f}`;
  } else {
    // Deliberately not supporting arbitrary real URLs right now — only the
    // one verified live collector target and the mock demo sites. Keeps the
    // demo reliable within the time we have.
    return {
      status: 400,
      body: {
        error: `Unsupported URL. Use one of the mock sites (${mockSites
          .listSites()
          .join(', ')}) or the live Nike monitor (${NIKE_LIVE_URL}).`,
      },
    };
  }

  const record = store.createScraper({
    name,
    site: trimmedUrl,
    isMock: engine === 'mock',
    engine,
    cardSelector,
    fieldSelectors,
    collectorId,
    fields: chosenFields,
  });
  return { status: 201, body: { scraper: record } };
});

route('GET', '/api/scrapers/:id', async (params) => {
  const scraper = store.getScraper(params.id);
  if (!scraper) return { status: 404, body: { error: 'not found' } };
  return { status: 200, body: { scraper } };
});

route('POST', '/api/scrapers/:id/run', async (params) => {
  const scraper = store.getScraper(params.id);
  if (!scraper) return { status: 404, body: { error: 'not found' } };

  const result = await runScraper(scraper);
  const healthScore = computeHealthScore(result);
  const status = statusFromScore(healthScore);

  store.updateScraper(scraper.id, {
    status,
    healthScore,
    lastRun: result,
    lastProducts: result.products,
    lastDiagnosis: status === 'healthy' ? null : scraper.lastDiagnosis,
  });

  if (status !== 'healthy') {
    store.logEvent(
      scraper.site,
      'scraper_broken',
      `Scraper "${scraper.name}" failed to extract: ${result.missingFields.join(', ')}.`
    );
  } else {
    // successful run -> record a price snapshot for the insights engine
    const numericProducts = result.products
      .filter((p) => p.price)
      .map((p, i) => ({
        id: `${scraper.site}-${i}`,
        name: p.product,
        price: Number(String(p.price).replace(/[^\d.]/g, '')) || 0,
      }));
    if (numericProducts.length) store.recordPriceSnapshot(scraper.site, numericProducts);
  }

  return { status: 200, body: { scraper: store.getScraper(scraper.id), result } };
});

route('POST', '/api/scrapers/:id/heal', async (params) => {
  const scraper = store.getScraper(params.id);
  if (!scraper) return { status: 404, body: { error: 'not found' } };
  if (!scraper.lastRun || scraper.lastRun.missingFields.length === 0) {
    return { status: 400, body: { error: 'scraper is not currently broken' } };
  }

  // The AI Healer / selector-repair flow only applies to selector-based
  // engines (mock, web-unlocker). A scraper-studio scraper's healing is
  // Bright Data's own self-healing on their side — we just re-run it.
  if (scraper.engine === 'scraper-studio') {
    const startedAt = Date.now();
    store.updateScraper(scraper.id, { status: 'healing' });
    store.logEvent(scraper.site, 'healing_started', `Re-running live collector for "${scraper.name}"...`);

    const result = await runScraper(scraper);
    const healthScore = computeHealthScore(result);
    const status = statusFromScore(healthScore);
    const recoveryMs = Date.now() - startedAt;

    store.updateScraper(scraper.id, { status, healthScore, lastRun: result, lastProducts: result.products });
    store.logEvent(
      scraper.site,
      status === 'healthy' ? 'healing_succeeded' : 'healing_partial',
      `Live collector re-run for "${scraper.name}" finished in ${(recoveryMs / 1000).toFixed(1)}s (${status}).`
    );

    return {
      status: 200,
      body: { scraper: store.getScraper(scraper.id), diagnosis: null, result, recoveryMs },
    };
  }

  const startedAt = Date.now();
  store.updateScraper(scraper.id, { status: 'healing' });
  store.logEvent(scraper.site, 'healing_started', `AI Healer analyzing "${scraper.name}"...`);

  const diagnosis = aiHealer.diagnose({
    siteName: scraper.site,
    fieldSelectors: scraper.fieldSelectors,
    missingFields: scraper.lastRun.missingFields,
    sampleCardHtml: scraper.lastRun.sampleCardHtml,
  });

  const healedSelectors = aiHealer.applyHealing(scraper.fieldSelectors, diagnosis);
  store.updateScraper(scraper.id, { fieldSelectors: healedSelectors, lastDiagnosis: diagnosis });

  // re-run to validate the repair
  const validated = store.getScraper(scraper.id);
  const result = await runScraper(validated);
  const healthScore = computeHealthScore(result);
  const status = statusFromScore(healthScore);
  const recoveryMs = Date.now() - startedAt;

  store.updateScraper(scraper.id, { status, healthScore, lastRun: result, lastProducts: result.products });
  store.logEvent(
    scraper.site,
    status === 'healthy' ? 'healing_succeeded' : 'healing_partial',
    `AI Healer repaired "${scraper.name}" in ${(recoveryMs / 1000).toFixed(1)}s (${status}).`
  );

  return {
    status: 200,
    body: { scraper: store.getScraper(scraper.id), diagnosis, result, recoveryMs },
  };
});

route('GET', '/api/timeline', async (_params, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const site = url.searchParams.get('site');
  return { status: 200, body: { events: store.getTimeline(site) } };
});

route('GET', '/api/insights', async () => {
  const snapshotsByEnv = {};
  const allSites = new Set([...mockSites.listSites(), ...store.listScrapers().map((s) => s.site)]);
  for (const site of allSites) {
    snapshotsByEnv[site] = store.getPriceSnapshots(site);
  }
  return { status: 200, body: { insights: insights.computeAllInsights(snapshotsByEnv) } };
});

// --- http server -------------------------------------------------------

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const match = routes.find((r) => r.method === req.method && r.regex.test(url.pathname));

  if (!match) return send(res, 404, { error: 'not found' });

  const values = url.pathname.match(match.regex).slice(1);
  const params = Object.fromEntries(match.paramNames.map((name, i) => [name, values[i]]));

  try {
    const result = await match.handler(params, req);
    if (result.html !== undefined) return sendHtml(res, result.status, result.html);
    return send(res, result.status, result.body);
  } catch (err) {
    console.error(err);
    return send(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`WebSentinel AI backend running at http://localhost:${PORT}`);
  console.log(`Bright Data Scraper Studio configured: ${brightdata.isStudioConfigured()}`);
  console.log(`Try: http://localhost:${PORT}/api/mock/nike`);
});