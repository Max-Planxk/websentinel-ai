/**
 * aiHealer.js
 * Diagnoses a broken field extraction and proposes a repaired selector
 * by scanning the current DOM for the leaf element that best matches
 * the *semantic type* of the missing field (price, availability, rating...)
 * plus a fallback "family resemblance" match against the old selector name.
 *
 * This is a heuristic engine, not an LLM call — deterministic and instant,
 * which matters a lot live on stage. If ANTHROPIC_API_KEY is set, we use
 * it only to phrase a nicer natural-language explanation (see aiExplain.js);
 * the actual repair logic never depends on that.
 */

const { extractLeaves, bestSelectorForLeaf } = require('./htmlSelector');

// Type-aware detectors: given a leaf's text, how confident are we it's
// this kind of field? Higher score wins.
const FIELD_DETECTORS = {
  price: (text) => (/^[₹$€£]\s?[\d][\d,.]*$/.test(text) ? 0.95 : /[\d][\d,.]*\s?[₹$€£]/.test(text) ? 0.8 : 0),
  availability: (text) =>
    /^(in stock|out of stock|available|unavailable|low stock|sold out)$/i.test(text) ? 0.95 : 0,
  rating: (text) => (/^\d(\.\d)?(\s?\/\s?5)?$/.test(text) ? 0.7 : 0),
  product: () => 0, // product name has no reliable text pattern; handled via fallback only
};

function nameSimilarity(oldSelectorName, leaf) {
  // crude "family resemblance": does the leaf's own attrs mention a
  // keyword from the old selector name, or vice versa?
  const old = oldSelectorName.toLowerCase().replace(/[.#[\]='"]/g, ' ');
  const haystack = JSON.stringify(leaf.attrs).toLowerCase();
  const tokens = old.split(/[\s-]+/).filter((t) => t.length > 2);
  let hits = 0;
  for (const t of tokens) {
    if (haystack.includes(t)) hits += 1;
  }
  return tokens.length ? hits / tokens.length : 0;
}

/**
 * Attempts to find a replacement selector for `fieldName` (e.g. "price")
 * whose old selector was `oldSelector`, by scanning `cardHtml`.
 * Returns { newSelector, confidence, matchedText } or null.
 */
function proposeRepair(cardHtml, fieldName, oldSelector) {
  const leaves = extractLeaves(cardHtml);
  const detector = FIELD_DETECTORS[fieldName] || (() => 0);

  let best = null;
  for (const leaf of leaves) {
    const typeScore = detector(leaf.text);
    const nameScore = nameSimilarity(oldSelector, leaf);
    const score = typeScore * 0.75 + nameScore * 0.25;
    if (score > 0 && (!best || score > best.score)) {
      best = { leaf, score };
    }
  }

  if (!best) return null;
  const newSelector = bestSelectorForLeaf(best.leaf);
  if (!newSelector) return null;

  return {
    newSelector,
    confidence: Math.min(0.99, Math.round(best.score * 100) / 100 + 0.1),
    matchedText: best.leaf.text,
  };
}

/**
 * Full diagnosis for a scraper run: for every field that failed
 * validation, try to propose a repair. Returns a diagnosis report.
 */
function diagnose({ siteName, fieldSelectors, missingFields, sampleCardHtml }) {
  const findings = missingFields.map((fieldName) => {
    const oldSelector = fieldSelectors[fieldName];
    const repair = sampleCardHtml ? proposeRepair(sampleCardHtml, fieldName, oldSelector) : null;
    return {
      field: fieldName,
      oldSelector,
      status: repair ? 'repairable' : 'unrepairable',
      proposedSelector: repair ? repair.newSelector : null,
      confidence: repair ? repair.confidence : 0,
      matchedText: repair ? repair.matchedText : null,
    };
  });

  const repairable = findings.filter((f) => f.status === 'repairable');
  const overallConfidence = repairable.length
    ? Math.round((repairable.reduce((s, f) => s + f.confidence, 0) / repairable.length) * 100) / 100
    : 0;

  return {
    siteName,
    rootCause: 'Website DOM structure changed — one or more field selectors no longer match any element.',
    findings,
    fullyRepairable: findings.every((f) => f.status === 'repairable'),
    overallConfidence,
  };
}

/**
 * Applies a diagnosis's proposed selectors onto a scraper's fieldSelectors,
 * returning the new (healed) fieldSelectors object. Does not mutate input.
 */
function applyHealing(fieldSelectors, diagnosis) {
  const healed = { ...fieldSelectors };
  for (const f of diagnosis.findings) {
    if (f.status === 'repairable') {
      healed[f.field] = f.proposedSelector;
    }
  }
  return healed;
}

module.exports = { diagnose, applyHealing, proposeRepair };
