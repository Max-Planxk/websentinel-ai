/**
 * brightdata.js
 * Two independent Bright Data capabilities live here:
 *
 *  1. fetchHtml(scraper) — Web Unlocker. Give it any real URL, get back
 *     raw HTML, anti-bot/JS-rendering handled for you. Used for
 *     "web-unlocker" engine scrapers and mock sites (mock just reads
 *     mockSites.js directly, no network).
 *
 *  2. runCollector(url) — Scraper Studio. Triggers your pre-built
 *     collector (Interaction code + Parser code + Bright Data's own
 *     "Self-Healing" toggle, all configured on their dashboard) and
 *     polls until it returns already-structured records. Used for
 *     "scraper-studio" engine scrapers.
 *
 * Env vars (backend/.env):
 *   BRIGHTDATA_API_KEY        - your Bright Data API token (used by both)
 *   BRIGHTDATA_ZONE           - Web Unlocker zone name (dashboard > Web Access)
 *   BRIGHTDATA_COLLECTOR_ID   - Scraper Studio collector id, e.g. c_mt3xszvr1t93ihwtxd
 */

const https = require('https');
const mockSites = require('../data/mockSites');

const BRIGHTDATA_API_KEY = process.env.BRIGHTDATA_API_KEY || '';
const BRIGHTDATA_ZONE = process.env.BRIGHTDATA_ZONE || '';
const BRIGHTDATA_COLLECTOR_ID = process.env.BRIGHTDATA_COLLECTOR_ID || '';

const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 8 * 60 * 1000; // 8 min ceiling — collectors can take several minutes

// Bright Data uses several different words for "not done yet" depending on
// job stage/account — match generously rather than guessing one exact string.
const IN_PROGRESS_STATUSES = ['collecting', 'queued', 'running', 'pending', 'building'];
const FAILURE_STATUSES = ['failed', 'error', 'canceled', 'cancelled'];

function httpsRequest({ hostname, path, method, headers, body }) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path, method, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
        else reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 300)}`));
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${BRIGHTDATA_API_KEY}`, ...extra };
}

// ---------------------------------------------------------------------
// 1. Web Unlocker — raw HTML for any URL
// ---------------------------------------------------------------------

async function fetchViaBrightData(targetUrl) {
  const body = JSON.stringify({ zone: BRIGHTDATA_ZONE, url: targetUrl, format: 'raw' });
  return httpsRequest({
    hostname: 'api.brightdata.com',
    path: '/request',
    method: 'POST',
    headers: authHeaders({
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    }),
    body,
  });
}

async function fetchDirect(targetUrl) {
  const u = new URL(targetUrl);
  return httpsRequest({
    hostname: u.hostname,
    path: u.pathname + u.search,
    method: 'GET',
    headers: { 'User-Agent': 'Mozilla/5.0 (WebSentinelAI/1.0)' },
  });
}

/** scraper = { site, isMock } */
async function fetchHtml(scraper) {
  if (scraper.isMock) return mockSites.getHtml(scraper.site);
  if (BRIGHTDATA_API_KEY && BRIGHTDATA_ZONE) return fetchViaBrightData(scraper.site);
  // No Web Unlocker credentials configured — best-effort direct fetch.
  return fetchDirect(scraper.site);
}

function isUnlockerConfigured() {
  return Boolean(BRIGHTDATA_API_KEY && BRIGHTDATA_ZONE);
}

// ---------------------------------------------------------------------
// 2. Scraper Studio — trigger a hosted collector, poll for results
// ---------------------------------------------------------------------

/**
 * Kicks off a collector run for a single URL input.
 * Returns a collection/snapshot id you poll with pollForResult().
 */
async function triggerCollector(targetUrl) {
  const body = JSON.stringify([{ url: targetUrl }]);
  const raw = await httpsRequest({
    hostname: 'api.brightdata.com',
    path: `/dca/trigger?collector=${BRIGHTDATA_COLLECTOR_ID}&queue_next=1`,
    method: 'POST',
    headers: authHeaders({
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    }),
    body,
  });
  const parsed = JSON.parse(raw);
  return parsed.collection_id || parsed.response_id || parsed.snapshot_id;
}

async function fetchDataset(collectionId) {
  const raw = await httpsRequest({
    hostname: 'api.brightdata.com',
    path: `/dca/dataset?id=${collectionId}&format=json`,
    method: 'GET',
    headers: authHeaders(),
  });
  return JSON.parse(raw);
}

async function pollForResult(collectionId) {
  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const data = await fetchDataset(collectionId);

    if (Array.isArray(data)) {
      // Bright Data returns the finished array once the job is done. An
      // empty array here is treated as "done" too — runScraper.js decides
      // whether zero records counts as a failure, not this polling layer.
      return data;
    }

    if (data && data.status) {
      if (FAILURE_STATUSES.includes(data.status)) {
        throw new Error(`Bright Data collector run failed (${data.status}): ${data.message || 'no message'}`);
      }
      if (IN_PROGRESS_STATUSES.includes(data.status)) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        continue;
      }
      // Some other status we don't recognize — treat as done rather than
      // looping forever on an unknown word.
      return data;
    }

    // No status field and not an array — unexpected shape, treat as done.
    return data;
  }
  throw new Error(`Bright Data collector run ${collectionId} timed out after ${POLL_TIMEOUT_MS}ms`);
}

/** Full trigger -> poll -> result flow for one URL. */
async function runCollector(targetUrl) {
  const collectionId = await triggerCollector(targetUrl);
  return pollForResult(collectionId);
}

function isStudioConfigured() {
  return Boolean(BRIGHTDATA_API_KEY && BRIGHTDATA_COLLECTOR_ID);
}

module.exports = {
  fetchHtml,
  isUnlockerConfigured,
  runCollector,
  triggerCollector,
  pollForResult,
  isStudioConfigured,
};