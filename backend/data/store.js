/**
 * store.js
 * Simple in-memory store. A hackathon demo doesn't need a database —
 * this keeps things fast and dependency-free. Swap for real persistence
 * later if you want scrapers to survive a restart.
 *
 * Each scraper record now carries an `engine`:
 *   'mock'            - nike/adidas/puma, parsed locally, powers the live demo break
 *   'web-unlocker'    - any real URL, parsed locally with your own selectors
 *   'scraper-studio'  - a real Bright Data collector, parsed + self-healed on their side
 */

let nextId = 1;
const scrapers = new Map(); // id -> scraper record
const timeline = []; // { ts, siteName, type, message }
const priceSnapshots = {}; // siteName -> [{ ts, products }]

function createScraper({ name, site, isMock, engine, cardSelector, fieldSelectors, collectorId }) {
  const id = String(nextId++);
  const record = {
    id,
    name,
    site,
    isMock,
    engine, // 'mock' | 'web-unlocker' | 'scraper-studio'
    cardSelector: cardSelector || null,
    fieldSelectors: fieldSelectors || null,
    collectorId: collectorId || null,
    status: 'unknown', // unknown | healthy | broken | healing
    healthScore: 100,
    lastRun: null,
    lastDiagnosis: null,
    lastProducts: [],
    pendingFix: null,
    createdAt: new Date().toISOString(),
    history: [], // [{ ts, status, healthScore }]
  };
  scrapers.set(id, record);
  logEvent(site, 'scraper_created', `Scraper "${name}" created for ${site} (${engine}).`);
  return record;
}

function getScraper(id) {
  return scrapers.get(id);
}

function listScrapers() {
  return Array.from(scrapers.values());
}

function updateScraper(id, patch) {
  const record = scrapers.get(id);
  if (!record) return null;
  Object.assign(record, patch);
  record.history.push({ ts: new Date().toISOString(), status: record.status, healthScore: record.healthScore });
  if (record.history.length > 50) record.history.shift();
  return record;
}

function logEvent(siteName, type, message) {
  const entry = { ts: new Date().toISOString(), siteName, type, message };
  timeline.push(entry);
  if (timeline.length > 200) timeline.shift();
  return entry;
}

function getTimeline(siteName) {
  return siteName ? timeline.filter((e) => e.siteName === siteName) : timeline.slice();
}

function recordPriceSnapshot(siteName, products) {
  if (!priceSnapshots[siteName]) priceSnapshots[siteName] = [];
  priceSnapshots[siteName].push({ ts: new Date().toISOString(), products: products.map((p) => ({ ...p })) });
  if (priceSnapshots[siteName].length > 20) priceSnapshots[siteName].shift();
}

function getPriceSnapshots(siteName) {
  return priceSnapshots[siteName] || [];
}

module.exports = {
  createScraper,
  getScraper,
  listScrapers,
  updateScraper,
  logEvent,
  getTimeline,
  recordPriceSnapshot,
  getPriceSnapshots,
};