🛰️ WebSentinel AI

"The web changes. Your scrapers shouldn't."

An AI-powered competitor monitoring platform that watches competitor websites, detects when a target website's structure changes and a scraper breaks, and self-heals the scraper automatically — diagnosing the cause, generating a new selector, validating it, and redeploying, all live.

What it does

WebSentinel tracks product name, price, availability, and rating across competitor sites. When a site's DOM structure changes (a redesign, a class rename, a field that moves), the extraction breaks — WebSentinel detects exactly which fields failed, diagnoses why, proposes a fix with a confidence score, applies it, and re-validates. No human has to notice the break or touch code.

Who it's for

E-commerce and retail teams — pricing analysts, growth teams, small businesses — who need reliable, always-on competitor price and stock intelligence without maintaining fragile scraping infrastructure themselves.

Tech stack

Backend

Node.js — a hand-rolled REST API built directly on the vanilla http module (no Express; a custom router matches method + path and returns JSON)
In-memory store (no DB, by design for hackathon speed)
dotenv for configuration

Real-world data layer

Bright Data Scraper Studio API — a live, verified integration that triggers a hosted collector and pulls back structured JSON from a real product page (nike.com)
Bright Data Web Unlocker as a fallback path for raw HTML fetching on real URLs

Simulation layer

A custom mock-site engine (mockSites.js) generating realistic HTML for 6 "competitor" sites across three markets — Nike, Adidas, Puma, Skechers (India), Yapo Chile, OLX Brazil
A toggleable DOM-version system per site that reliably reproduces "site redesign breaks scraper" on demand, since you can't force a real website to break live during a demo

Self-healing engine

aiHealer.js — diagnoses which fields failed against sample HTML, proposes new selectors with a confidence score, applies the fix, and re-validates by re-running the scraper

Frontend

React (Vite)
Tailwind utility classes for the dashboard layout, with hand-written CSS for the splash and landing sequences (gradient wordmark, radar-sweep animation, glowing CTA, ambient background orbs)
Google Fonts — Space Grotesk (display/body) and JetBrains Mono (labels/data)
Talks to the backend over REST (fetch calls in api.js), polling every 4s for live updates — no websockets, kept simple deliberately
Architecture
┌─────────────────────────────────────────────────────────┐
│                          USER                             │
└───────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│              FRONTEND — React + Tailwind                  │
│         Splash  →  Landing  →  Dashboard                  │
└───────────────────────────┬─────────────────────────────┘
                             │  REST API (fetch / JSON)
                             ▼
┌─────────────────────────────────────────────────────────┐
│         BACKEND — server.js (hand-rolled REST API          │
│              on Node's http module, no Express)           │
│                     ↳ Scraper Engine                       │
└──────────────┬──────────────────────────┬─────────────────┘
               │                          │
               ▼                          ▼
┌───────────────────────────┐  ┌───────────────────────────┐
│      MOCK SITES            │  │     BRIGHT DATA            │
│  Nike · Adidas · Puma       │  │  Scraper Studio (live)     │
│  Skechers · Yapo · OLX      │  │  Web Unlocker (fallback)   │
│  (toggleable DOM breaks)    │  │  → real product pages      │
└──────────────┬─────────────┘  └────────────┬────────────────┘
               │                              │
               └──────────────┬───────────────┘
                               ▼
                  ┌─────────────────────────┐
                  │     DATA VALIDATOR       │
                  │  detects missing fields  │
                  └────────────┬─────────────┘
                               │ broken?
                               ▼
                  ┌─────────────────────────┐
                  │       AI HEALER          │
                  │  diagnose → repair →     │
                  │  re-validate             │
                  └────────────┬─────────────┘
                               ▼
                  ┌─────────────────────────┐
                  │     INSIGHTS ENGINE      │
                  │  "Adidas cut prices 6%   │
                  │   — possible promo"      │
                  └─────────────────────────┘
Running it
1. Backend
bash
cd backend
npm install
npm start
# → WebSentinel AI backend running at http://localhost:4000
# → Bright Data Scraper Studio configured: true/false
2. Frontend
bash
cd frontend
npm install
npm run dev
# → open http://localhost:5173

The Vite dev server proxies /api/* to localhost:4000, so run both and open the frontend URL. You'll land on the animated splash → radar landing page first — click Start Monitoring to reach the dashboard.

Demo script (aim for ~2 minutes)

Scene 1 — Create a scraper.
Type "Track Nike prices, stock and ratings", pick Nike, hit Create Scraper. Click ▶ Run Scraper — a live product table appears.

Scene 2 — Show it's real.
Open http://localhost:4000/api/mock/nike in a new tab — that's the actual HTML your scraper is reading. Point out the .product-price class.

Scene 3 — Break it.
Click 💥 Simulate DOM Change — this is you playing the role of "Nike's frontend team just shipped a redesign." Click ▶ Run Scraper again — watch price and availability flip to ✗ missing and the health badge drop to 🔴 broken / ~50%.

Scene 4 — Heal it.
Click 🤖 Heal Now. The healing modal walks through analyzing the old DOM, comparing the new DOM, generating new extraction logic, testing, and validating. It finishes by showing exactly what changed — .product-price → [data-testid='price'] — with a confidence score, then the scraper goes back to 🟢 100% healthy, live.

Scene 5 — The business payoff.
Click "Shift Adidas Prices" in the Market Signals panel, then run the Adidas scraper again. A signal appears: "Adidas cut Adizero Adios Pro by 6% — may be preparing a promotional campaign."

Scene 6 — Web Change Timeline.
Point at the sidebar timeline — the whole DOM-change → break → heal sequence is logged with timestamps, an audit trail of everything the system did on its own.

Scene 7 — Prove it's not just simulation.
Mention (or show, if credits/time allow) that the same architecture has a live Bright Data Scraper Studio collector wired up against a real Nike product page — verified working end-to-end, returning real structured JSON. The mock sites exist so the self-healing story can be demoed reliably on stage; the underlying engine is the same either way.

Bright Data Scraper Studio integration

WebSentinel's scraper-studio engine triggers a real Bright Data collector via their /dca/trigger API, polls the job until it completes, and normalizes the structured JSON it returns into WebSentinel's product/price/availability/rating schema. This is a genuine, verified integration — not simulated — confirmed working against https://www.nike.com/in/.

Configuration lives in backend/.env (not committed to source control):

BRIGHTDATA_API_KEY=your_key_here
BRIGHTDATA_ZONE=your_web_unlocker_zone
BRIGHTDATA_COLLECTOR_ID=your_scraper_studio_collector_id

Note: a Scraper Studio collector's Parser code is typically tuned to one site's specific DOM structure. Triggering the same collector against an unrelated site's URL isn't guaranteed to return clean data unless the collector was built generically — this is a property of how Scraper Studio collectors work, not a limitation of WebSentinel's architecture, which is otherwise engine-agnostic per scraper.

Project structure
websentinel-ai/
├── backend/
│   ├── server.js              hand-rolled REST API (pure Node http, no deps)
│   ├── .env                   Bright Data credentials (gitignored)
│   ├── data/
│   │   ├── mockSites.js       6 mock competitor sites + DOM-break toggle
│   │   └── store.js           in-memory scrapers/timeline/price history
│   └── services/
│       ├── htmlSelector.js    tiny CSS-selector extraction engine
│       ├── scraperEngine.js   runs a scraper, computes health score
│       ├── aiHealer.js        diagnoses breaks, proposes new selectors
│       ├── insights.js        price-change → market-signal narratives
│       └── brightdata.js      Bright Data Scraper Studio + Web Unlocker
└── frontend/
    └── src/
        ├── App.jsx            splash → landing → dashboard flow
        ├── api.js             REST client (fetch wrapper)
        └── components/
            ├── Splash.jsx / Splash.css        animated intro
            ├── Landing.jsx / Landing.css      radar-sweep hero page
            ├── Dashboard.css                  dashboard theme
            ├── CreateScraper.jsx              new-monitor form
            ├── ScraperCard.jsx                per-scraper status + actions
            ├── HealingModal.jsx               self-heal animation/result
            ├── InsightsPanel.jsx              market-signal narratives
            ├── Timeline.jsx                   web change audit trail
            └── HealthBadge.jsx                status pill