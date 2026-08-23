const mockSites = require('../data/mockSites');
const { extractCards, extractField } = require('./htmlSelector');
const { fetchHtml } = require('./brightdata');

/**
 * Runs a scraper config against its target and returns structured results.
 *
 * scraper = {
 *   site: 'nike' | 'adidas' | 'puma' | a real URL,
 *   isMock: boolean,
 *   cardSelector: string,
 *   fieldSelectors: { product, price, availability, rating },
 * }
 */
async function runScraper(scraper) {
  const html = await fetchHtml(scraper);
  const cardSelector = scraper.isMock ? mockSites.getCardSelector(scraper.site) : scraper.cardSelector;
  const cards = extractCards(html, cardSelector);

  const expectedFields = Object.keys(scraper.fieldSelectors);
  const products = [];
  const fieldFailureCounts = Object.fromEntries(expectedFields.map((f) => [f, 0]));

  for (const card of cards) {
    const record = {};
    for (const field of expectedFields) {
      const value = extractField(card, scraper.fieldSelectors[field]);
      record[field] = value;
      if (value === null) fieldFailureCounts[field] += 1;
    }
    products.push(record);
  }

  const totalCards = cards.length || 1;
  const missingFields = expectedFields.filter((f) => fieldFailureCounts[f] === totalCards && totalCards > 0);
  // "missing" = fails on every card (a structural break), not a one-off null

  return {
    products,
    cardCount: cards.length,
    missingFields,
    fieldFailureCounts,
    sampleCardHtml: cards[0] || null,
    success: missingFields.length === 0 && cards.length > 0,
    ranAt: new Date().toISOString(),
  };
}

/**
 * Health score = % of individual field checks (across all cards) that
 * succeeded. A structural break on N of M fields drops the score fast,
 * which is exactly the drama you want on a health dashboard.
 */
function computeHealthScore(result) {
  const totalFields = Object.keys(result.fieldFailureCounts).length;
  if (totalFields === 0 || result.cardCount === 0) return 0;
  const totalChecks = totalFields * result.cardCount;
  const failures = Object.values(result.fieldFailureCounts).reduce((a, b) => a + b, 0);
  return Math.round(((totalChecks - failures) / totalChecks) * 100);
}

module.exports = { runScraper, computeHealthScore };
