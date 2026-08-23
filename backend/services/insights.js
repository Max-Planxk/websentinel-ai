/**
 * insights.js
 * Turns raw price snapshots into the "MARKET SIGNAL" style narrative
 * from the pitch — the payoff moment after the healing demo.
 */

function pctChange(oldVal, newVal) {
  if (!oldVal) return 0;
  return ((newVal - oldVal) / oldVal) * 100;
}

function interpretSignal(pct) {
  if (pct <= -10) return 'May be preparing a promotional campaign or clearing inventory ahead of a new launch.';
  if (pct <= -3) return 'A notable discount — worth watching for a broader promotional push.';
  if (pct >= 10) return 'A significant price increase — possibly a supply constraint or repositioning.';
  if (pct >= 3) return 'A modest price increase.';
  return null;
}

/**
 * Compares the two most recent snapshots for a site and returns a list
 * of per-product insight objects for any product that moved meaningfully.
 */
function computeInsightsForSite(siteName, snapshots) {
  if (snapshots.length < 2) return [];
  const prev = snapshots[snapshots.length - 2];
  const curr = snapshots[snapshots.length - 1];

  const prevById = Object.fromEntries(prev.products.map((p) => [p.id, p]));
  const insights = [];

  for (const p of curr.products) {
    const before = prevById[p.id];
    if (!before) continue;
    const pct = pctChange(before.price, p.price);
    const note = interpretSignal(pct);
    if (note && Math.abs(pct) >= 3) {
      insights.push({
        site: siteName,
        product: p.name,
        oldPrice: before.price,
        newPrice: p.price,
        pctChange: Math.round(pct * 100) / 100,
        direction: pct < 0 ? 'down' : 'up',
        note,
      });
    }
  }
  return insights;
}

function computeAllInsights(store) {
  const results = [];
  for (const siteName of Object.keys(store)) {
    results.push(...computeInsightsForSite(siteName, store[siteName]));
  }
  return results.sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange));
}

module.exports = { computeInsightsForSite, computeAllInsights };
