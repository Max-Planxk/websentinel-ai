import Landing from './components/Landing';
import './components/Dashboard.css';
import './components/Landing.css';
import { useEffect, useState, useCallback } from 'react';
import { api } from './api';
import CreateScraper from './components/CreateScraper';
import ScraperCard from './components/ScraperCard';
import HealingModal from './components/HealingModal';
import InsightsPanel from './components/InsightsPanel';
import Timeline from './components/Timeline';

export default function App() {
  const [entered, setEntered] = useState(false);
  const [sites, setSites] = useState([]);
  const [scrapers, setScrapers] = useState([]);
  const [insights, setInsights] = useState([]);
  const [events, setEvents] = useState([]);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [healModal, setHealModal] = useState({ open: false, phase: null, diagnosis: null, recoveryMs: 0 });
  const [error, setError] = useState(null);

  const refreshAll = useCallback(async () => {
    try {
      const [sitesRes, scrapersRes, insightsRes, timelineRes] = await Promise.all([
        api.getSites(),
        api.listScrapers(),
        api.getInsights(),
        api.getTimeline(),
      ]);
      setSites(sitesRes.sites);
      setScrapers(scrapersRes.scrapers);
      setInsights(insightsRes.insights);
      setEvents(timelineRes.events);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 4000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  async function handleCreate(payload) {
    setCreating(true);
    try {
      await api.createScraper(payload);
      await refreshAll();
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function withBusy(fn) {
    setBusy(true);
    try {
      await fn();
      await refreshAll();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const handleRun = (id) => withBusy(() => api.runScraper(id));
  const handleBreak = (site) => withBusy(() => api.breakSite(site));
  const handleRestore = (site) => withBusy(() => api.restoreSite(site));
  const handleNudge = (site) => withBusy(() => api.nudgePrices(site));

  async function handleHeal(id) {
    setHealModal({ open: true, phase: 'healing', diagnosis: null, recoveryMs: 0 });
    try {
      // Let the "healing" animation play for a moment even though the
      // deterministic healer resolves instantly server-side — this is
      // the one place where slowing down on purpose makes the demo better.
      const [result] = await Promise.all([api.healScraper(id), new Promise((r) => setTimeout(r, 1900))]);
      setHealModal({
        open: true,
        phase: 'done',
        diagnosis: result.diagnosis,
        recoveryMs: result.recoveryMs,
      });
      await refreshAll();
    } catch (e) {
      setError(e.message);
      setHealModal({ open: false, phase: null, diagnosis: null, recoveryMs: 0 });
    }
  }

  if (!entered) {
    return <Landing onEnter={() => setEntered(true)} />;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          🛰️ WebSentinel AI
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          The AI agent that watches the web so you don't have to. Self-healing competitor monitoring.
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error} — is the backend running on port 4000?
        </div>
      )}

      <div className="mb-6">
        <CreateScraper sites={sites} onCreate={handleCreate} creating={creating} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {scrapers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-10 text-center text-sm text-slate-600">
              No scrapers yet. Create one above to start monitoring a competitor.
            </div>
          ) : (
            scrapers.map((s) => (
              <ScraperCard
                key={s.id}
                scraper={s}
                busy={busy}
                onRun={handleRun}
                onBreak={handleBreak}
                onRestore={handleRestore}
                onHeal={handleHeal}
              />
            ))
          )}
        </div>

        <div className="space-y-6">
          <InsightsPanel insights={insights} onNudge={handleNudge} sites={sites} busy={busy} />
          <Timeline events={events} />
        </div>
      </div>

      <HealingModal
        open={healModal.open}
        phase={healModal.phase}
        diagnosis={healModal.diagnosis}
        recoveryMs={healModal.recoveryMs}
        onClose={() => setHealModal({ open: false, phase: null, diagnosis: null, recoveryMs: 0 })}
      />
    </div>
  );
}