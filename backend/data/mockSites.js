/**
 * mockSites.js
 * In-memory "competitor websites". Each site has a product catalog and a
 * DOM "version". Nike supports version 1 (original DOM) and version 2
 * (changed DOM) — toggling it is what powers the live "break the scraper"
 * demo moment. Other sites stay on a stable DOM the whole time, so you can
 * show a healthy dashboard alongside the one that's broken/healing.
 */

const state = {
  nike: {
    version: 1,
    products: [
      { id: 'nk1', name: 'Air Max 90', price: 9999, availability: 'In Stock', rating: 4.5 },
      { id: 'nk2', name: 'Air Zoom Pegasus', price: 7499, availability: 'Out of Stock', rating: 4.2 },
      { id: 'nk3', name: 'React Infinity Run', price: 11999, availability: 'In Stock', rating: 4.6 },
      { id: 'nk4', name: 'Revolution 6', price: 3999, availability: 'Low Stock', rating: 4.0 },
    ],
  },
  adidas: {
    version: 1,
    products: [
      { id: 'ad1', name: 'Ultraboost Light', price: 15999, availability: 'In Stock', rating: 4.7 },
      { id: 'ad2', name: 'Samba OG', price: 8499, availability: 'In Stock', rating: 4.8 },
      { id: 'ad3', name: 'Adizero Adios Pro', price: 18999, availability: 'Low Stock', rating: 4.5 },
    ],
  },
  puma: {
    version: 1,
    products: [
      { id: 'pu1', name: 'Velocity Nitro 3', price: 6999, availability: 'In Stock', rating: 4.1 },
      { id: 'pu2', name: 'Deviate Nitro 2', price: 12999, availability: 'In Stock', rating: 4.3 },
      { id: 'pu3', name: 'Suede Classic XXI', price: 4499, availability: 'Out of Stock', rating: 4.4 },
    ],
  },
  skechers: {
    version: 1,
    products: [
      { id: 'sk1', name: 'Go Walk 7', price: 4999, availability: 'In Stock', rating: 4.3 },
      { id: 'sk2', name: 'Max Cushioning Elite', price: 6499, availability: 'In Stock', rating: 4.5 },
      { id: 'sk3', name: 'Arch Fit Sunny Outlook', price: 5499, availability: 'Low Stock', rating: 4.2 },
      { id: 'sk4', name: 'Skech-Air Dynamight', price: 5999, availability: 'Out of Stock', rating: 4.1 },
    ],
  },
  // Classifieds marketplace, Chile — listing schema reuses the same
  // product/price/availability/rating fields as the shoe sites so the
  // scraper engine doesn't need any special-casing.
  yapo_chile: {
    version: 1,
    products: [
      { id: 'yp1', name: 'iPhone 13 128GB', price: 349990, availability: 'Available', rating: 4.6 },
      { id: 'yp2', name: 'Bicicleta Aro 29', price: 189990, availability: 'Available', rating: 4.4 },
      { id: 'yp3', name: 'Sofá 3 Cuerpos', price: 129990, availability: 'Reserved', rating: 4.1 },
      { id: 'yp4', name: 'Notebook Lenovo IdeaPad', price: 279990, availability: 'Available', rating: 4.3 },
    ],
  },
  // Classifieds marketplace, Brazil.
  olx_brazil: {
    version: 1,
    products: [
      { id: 'ol1', name: 'Smartphone Samsung Galaxy S22', price: 2199, availability: 'Disponível', rating: 4.5 },
      { id: 'ol2', name: 'Sofá Retrátil 3 Lugares', price: 899, availability: 'Disponível', rating: 4.2 },
      { id: 'ol3', name: 'Bicicleta Aro 29 Aro Alumínio', price: 749, availability: 'Reservado', rating: 4.4 },
      { id: 'ol4', name: 'Notebook Dell Inspiron', price: 1899, availability: 'Disponível', rating: 4.3 },
    ],
  },
};

function fmtPrice(p) {
  return `\u20B9${p.toLocaleString('en-IN')}`;
}

// --- DOM renderers -----------------------------------------------------

function renderCardV1(p) {
  return `
  <article class="product-card" data-sku="${p.id}">
    <div class="product-name">${p.name}</div>
    <div class="product-price">${fmtPrice(p.price)}</div>
    <div class="product-availability">${p.availability}</div>
    <div class="product-rating">${p.rating}</div>
  </article>`;
}

// v2: the site "redesigned" — price moved to a data-testid span,
// availability moved to a data-state div. This mirrors the exact
// example from the pitch doc.
function renderCardV2(p) {
  const stateAttr = p.availability.toLowerCase().replace(/\s+/g, '-');
  return `
  <article class="product-card" data-sku="${p.id}">
    <div class="product-name">${p.name}</div>
    <span data-testid="price">${fmtPrice(p.price)}</span>
    <div class="stock-status" data-state="${stateAttr}">${p.availability}</div>
    <div class="product-rating">${p.rating}</div>
  </article>`;
}

function renderPage(siteName, cardsHtml) {
  return `<!DOCTYPE html>
<html>
<head><title>${siteName} — Store</title></head>
<body>
  <h1>${siteName.toUpperCase()} — Product Catalog</h1>
  <div class="product-grid">
    ${cardsHtml.join('\n')}
  </div>
</body>
</html>`;
}

function getHtml(siteName) {
  const site = state[siteName];
  if (!site) throw new Error(`Unknown mock site: ${siteName}`);
  const renderer = site.version === 2 ? renderCardV2 : renderCardV1;
  const cardsHtml = site.products.map(renderer);
  return renderPage(siteName, cardsHtml);
}

function getCardSelector() {
  // The card wrapper itself never breaks — only field-level selectors do.
  // This matches the real-world case where a redesign restructures inner
  // fields but the grid/card container stays the same.
  return '.product-card';
}

function getVersion(siteName) {
  return state[siteName] ? state[siteName].version : null;
}

function setVersion(siteName, version) {
  if (!state[siteName]) throw new Error(`Unknown mock site: ${siteName}`);
  state[siteName].version = version;
  return state[siteName].version;
}

function breakSite(siteName) {
  return setVersion(siteName, 2);
}

function restoreSite(siteName) {
  return setVersion(siteName, 1);
}

/** Nudges each product's price by a small random % (for the Insights demo). */
function nudgePrices(siteName, maxPct = 8) {
  const site = state[siteName];
  if (!site) throw new Error(`Unknown mock site: ${siteName}`);
  for (const p of site.products) {
    const direction = Math.random() < 0.5 ? -1 : 1;
    const pct = (Math.random() * maxPct) / 100;
    const delta = Math.round(p.price * pct) * direction;
    p.price = Math.max(499, p.price + delta);
  }
  return site.products;
}

function listSites() {
  return Object.keys(state);
}

function getProducts(siteName) {
  const site = state[siteName];
  return site ? site.products.map((p) => ({ ...p })) : [];
}

module.exports = {
  getHtml,
  getCardSelector,
  getVersion,
  setVersion,
  breakSite,
  restoreSite,
  nudgePrices,
  listSites,
  getProducts,
};