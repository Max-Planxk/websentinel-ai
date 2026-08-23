# 🛰️ WebSentinel AI

**"The AI agent that watches the web so you don't have to."**

An AI-powered competitor monitoring platform that watches competitor websites,
detects when a target website's structure changes and a scraper breaks, and
**self-heals** the scraper automatically — diagnosing the cause, generating a
new selector, validating it, and redeploying, all live.

---

## Architecture

```
        USER
          |
   React + Tailwind FRONTEND  (frontend/)
          |
      REST API  (backend/server.js)
          |
   ┌──────┴───────┐
   |  Scraper      |   ← extracts structured data via a
   |  Engine       |     lightweight CSS-selector engine
   └──────┬───────┘
          |
   Mock competitor sites (Nike/Adidas/Puma)
   — or real sites via Bright Data Web Unlocker —
          |
   ┌──────┴───────┐
   |  Data          |  → missing/failed fields detected
   |  Validator     |
   └──────┬───────┘
          | broken?
   ┌──────┴───────┐
   |  AI Healer     |  → diagnoses root cause, proposes a
   |  (aiHealer.js) |    new selector, re-validates, heals
   └──────┬───────┘
          |
   Insights engine → "Competitor X cut prices 6% — possible promo"
```

## Why no Bright Data key is required to run the demo

Bright Data's free tier (5,000 credits/month, no card needed) is genuinely
usable — see [Setting up real Bright Data](#setting-up-real-bright-data-optional)
below. But for a **live, on-stage demo**, depending on a real third-party
website's actual uptime and DOM is a risk you don't want. So by default,
WebSentinel AI scrapes three built-in **mock competitor sites** (Nike, Adidas,
Puma) served by the backend itself. You get a "Simulate DOM Change" button
that deliberately breaks Nike's page structure — the exact same failure mode
a real redesign would cause — so you can trigger the self-healing flow
reliably, on demand, every time.

## Running it

### 1. Backend (zero dependencies — just Node)

```bash
cd backend
node server.js
# → WebSentinel AI backend running at http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# → open http://localhost:5173
```

The Vite dev server proxies `/api/*` to `localhost:4000`, so just run both
and open the frontend URL.

---

## Demo script (aim for ~2 minutes)

**Scene 1 — Create a scraper.**
Type "Track Nike prices, stock and ratings", pick **Nike**, hit **Create
Scraper**. Click **▶ Run Scraper** — a live product table appears.

**Scene 2 — Show it's real.**
Open `http://localhost:4000/api/mock/nike` in a new tab — that's the actual
HTML your scraper is reading. Point out the `.product-price` class.

**Scene 3 — Break it.**
Click **💥 Simulate DOM Change**. This is you playing the role of "Nike's
frontend team just shipped a redesign." Click **▶ Run Scraper** again —
watch `price` and `availability` flip to `✗ missing` and the health badge
drop to 🔴 broken / ~50%.

**Scene 4 — Heal it.**
Click **🤖 Heal Now**. The healing modal walks through: analyzing the old
DOM → comparing the new DOM → generating new extraction logic → testing →
validating. It finishes by showing exactly what changed:
`.product-price → [data-testid='price']`, with a confidence score — then
the scraper goes back to 🟢 100% healthy, live.

**Scene 5 — The business payoff.**
Click **"Shift adidas prices"** in the Market Signals panel, then run the
Adidas scraper again. A signal appears: *"Adidas cut Adizero Adios Pro by
6% — may be preparing a promotional campaign."* That's the line: *"Websites
change every day. Our scraper doesn't have to — and now you know what your
competitors are doing about it."*

**Scene 6 — Web Change Timeline.**
Point at the sidebar timeline — the whole DOM-change → break → heal
sequence is logged with timestamps. This is the "audit trail" judges
remember.

---

## Setting up real Bright Data (optional)

1. Sign up free at [brightdata.com](https://brightdata.com) — no card needed
   for the recurring **5,000 free credits/month** shared across the Web
   Unlocker API, SERP API, Web Scraper API, and Scraper Studio.
2. Create a **Web Unlocker API** zone in the dashboard; note the zone name
   and your API key.
3. In `backend/`, create a `.env`-style export before starting the server
   (or just set env vars directly):
   ```bash
   export BRIGHTDATA_API_KEY=your_key_here
   export BRIGHTDATA_ZONE=your_zone_name
   node server.js
   ```
4. When creating a scraper, use a real URL (e.g.
   `https://example-store.com/products`) instead of `nike`/`adidas`/`puma`
   — the backend automatically routes non-mock sites through Bright Data.
5. Real pages will need real selectors for `fieldSelectors` (the API
   currently defaults new scrapers to the mock-site convention) — for a
   hackathon, the safest move is: **demo the self-healing story live on the
   mock sites**, then mention in your pitch that the same engine is wired
   to real Bright Data for production use.

## Project structure

```
websentinel-ai/
├── backend/
│   ├── server.js              REST API (pure Node http, no deps)
│   ├── data/
│   │   ├── mockSites.js       3 mock competitor sites + DOM-break toggle
│   │   └── store.js           in-memory scrapers/timeline/price history
│   └── services/
│       ├── htmlSelector.js    tiny CSS-selector extraction engine
│       ├── scraperEngine.js   runs a scraper, computes health score
│       ├── aiHealer.js        diagnoses breaks, proposes new selectors
│       ├── insights.js        price-change → market-signal narratives
│       └── brightdata.js      real Bright Data Web Unlocker integration
└── frontend/
    └── src/
        ├── App.jsx            main dashboard
        ├── api.js             REST client
        └── components/        CreateScraper, ScraperCard, HealingModal,
                                InsightsPanel, Timeline, HealthBadge
```
