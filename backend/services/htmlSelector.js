/**
 * htmlSelector.js
 * A tiny, dependency-free CSS-selector-ish extraction engine.
 *
 * Why not cheerio? So the whole backend runs with zero `npm install`
 * risk during a live demo. It supports exactly what real-world product
 * pages need: class selectors, id selectors, and attribute selectors
 * (with or without a value) — which is also exactly what the AI Healer
 * needs to be able to *generate* on the fly.
 */

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses a selector string into a structured form.
 *   ".product-price"            -> { type: 'class', name: 'product-price' }
 *   "#sku-1234"                 -> { type: 'id', name: 'sku-1234' }
 *   "[data-testid='price']"     -> { type: 'attr', name: 'data-testid', value: 'price' }
 *   "[data-price]"              -> { type: 'attr', name: 'data-price', value: null }
 */
function parseSelector(selector) {
  const s = selector.trim();
  if (s.startsWith('.')) return { type: 'class', name: s.slice(1) };
  if (s.startsWith('#')) return { type: 'id', name: s.slice(1) };
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1);
    const eq = inner.indexOf('=');
    if (eq === -1) return { type: 'attr', name: inner.trim(), value: null };
    const name = inner.slice(0, eq).trim();
    let value = inner.slice(eq + 1).trim();
    value = value.replace(/^['"]|['"]$/g, '');
    return { type: 'attr', name, value };
  }
  // bare tag name fallback, e.g. "span"
  return { type: 'tag', name: s };
}

function selectorToRegexFragment(sel) {
  if (sel.type === 'class') {
    return `class="[^"]*\\b${escapeRegExp(sel.name)}\\b[^"]*"`;
  }
  if (sel.type === 'id') {
    return `id="${escapeRegExp(sel.name)}"`;
  }
  if (sel.type === 'attr') {
    if (sel.value !== null && sel.value !== undefined) {
      return `${escapeRegExp(sel.name)}="${escapeRegExp(sel.value)}"`;
    }
    return `${escapeRegExp(sel.name)}(?:="[^"]*")?`;
  }
  return null;
}

/**
 * Extracts the first element matching `selector` inside `html` and
 * returns its stripped inner text, or null if not found.
 */
function extractField(html, selector) {
  const sel = parseSelector(selector);
  if (sel.type === 'tag') {
    const re = new RegExp(`<(${escapeRegExp(sel.name)})[^>]*>([\\s\\S]*?)<\\/\\1>`, 'i');
    const m = html.match(re);
    return m ? stripTags(m[2]).trim() : null;
  }
  const frag = selectorToRegexFragment(sel);
  const re = new RegExp(`<([a-zA-Z0-9]+)([^>]*\\s)?${frag}([^>]*)>([\\s\\S]*?)<\\/\\1>`, 'i');
  const m = html.match(re);
  return m ? stripTags(m[4]).trim() : null;
}

/**
 * Splits `html` into repeated "card" blocks matching `cardSelector`.
 * Assumes cards are not nested inside themselves (true for real product
 * grids, and true for our mock sites).
 */
function extractCards(html, cardSelector) {
  const sel = parseSelector(cardSelector);
  const frag = selectorToRegexFragment(sel);
  const re = new RegExp(`<([a-zA-Z0-9]+)([^>]*\\s)?${frag}([^>]*)>([\\s\\S]*?)<\\/\\1>`, 'gi');
  const cards = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    cards.push(m[0]);
  }
  return cards;
}

/**
 * Returns every "leaf" element (a tag whose content has no nested tags)
 * in `html`, with its tag name, attribute string, and stripped text.
 * This is what the AI Healer scans to find a replacement selector.
 */
function extractLeaves(html) {
  const re = /<([a-zA-Z0-9]+)((?:\s+[a-zA-Z0-9\-:]+(?:="[^"]*")?)*)\s*>([^<]+)<\/\1>/g;
  const leaves = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    const [, tag, attrsStr, text] = m;
    const attrs = {};
    const attrRe = /([a-zA-Z0-9\-:]+)(?:="([^"]*)")?/g;
    let am;
    while ((am = attrRe.exec(attrsStr)) !== null) {
      attrs[am[1]] = am[2] === undefined ? true : am[2];
    }
    const cleanText = stripTags(text).trim();
    if (cleanText) leaves.push({ tag, attrs, text: cleanText });
  }
  return leaves;
}

function normalizeForCompare(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Given a leaf element, derive the *best* selector string to reach it —
 * preferring data-* attributes (most resilient), then id, then class.
 *
 * Important: if the attribute's value just mirrors the element's own text
 * (e.g. data-state="in-stock" on text "In Stock"), that value *varies per
 * item* — pinning to it would only match this one product. In that case
 * we match on attribute existence only, not the specific value.
 */
function bestSelectorForLeaf(leaf) {
  const dataAttr = Object.keys(leaf.attrs).find((k) => k.startsWith('data-'));
  if (dataAttr) {
    const val = leaf.attrs[dataAttr];
    const valuesMirrorText = typeof val === 'string' && normalizeForCompare(val) === normalizeForCompare(leaf.text);
    if (typeof val === 'string' && !valuesMirrorText) return `[${dataAttr}='${val}']`;
    return `[${dataAttr}]`;
  }
  if (leaf.attrs.id) return `#${leaf.attrs.id}`;
  if (leaf.attrs.class) {
    const firstClass = String(leaf.attrs.class).split(/\s+/)[0];
    if (firstClass) return `.${firstClass}`;
  }
  return null;
}

module.exports = {
  parseSelector,
  extractField,
  extractCards,
  extractLeaves,
  bestSelectorForLeaf,
  stripTags,
};
