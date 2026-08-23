import HealthBadge from './HealthBadge';

export default function ScraperCard({ scraper, onRun, onBreak, onRestore, onHeal, busy }) {
  const products = scraper.lastProducts || [];
  const isBroken = scraper.status === 'broken' || scraper.status === 'degraded';
  const isHealing = scraper.status === 'healing';

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-100">{scraper.name}</h3>
          <p className="text-xs capitalize text-slate-500">Target: {scraper.site}</p>
        </div>
        <HealthBadge status={scraper.status} score={scraper.healthScore} />
      </div>

      {scraper.lastRun && scraper.lastRun.missingFields?.length > 0 && (
        <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-300">
          ⚠ Fields failing on every card: <strong>{scraper.lastRun.missingFields.join(', ')}</strong>
        </div>
      )}

      {products.length > 0 ? (
        <div className="mb-4 overflow-hidden rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/60 text-slate-400">
              <tr>
                {Object.keys(scraper.fieldSelectors).map((f) => (
                  <th key={f} className="px-2.5 py-1.5 capitalize">
                    {f}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.slice(0, 4).map((p, i) => (
                <tr key={i} className="border-t border-slate-800">
                  {Object.keys(scraper.fieldSelectors).map((f) => (
                    <td
                      key={f}
                      className={`px-2.5 py-1.5 ${p[f] === null ? 'text-red-400' : 'text-slate-300'}`}
                    >
                      {p[f] === null ? '✗ missing' : p[f]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mb-4 text-xs italic text-slate-600">Not run yet — click Run Scraper.</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onRun(scraper.id)}
          disabled={busy}
          className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
        >
          ▶ Run Scraper
        </button>
        <button
          onClick={() => onBreak(scraper.site)}
          disabled={busy}
          className="rounded-lg bg-red-950/60 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-900/60 disabled:opacity-50"
        >
          💥 Simulate DOM Change
        </button>
        <button
          onClick={() => onRestore(scraper.site)}
          disabled={busy}
          className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-slate-700 disabled:opacity-50"
        >
          ↺ Restore Original DOM
        </button>
        {isBroken && !isHealing && (
          <button
            onClick={() => onHeal(scraper.id)}
            disabled={busy}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            🤖 Heal Now
          </button>
        )}
      </div>
    </div>
  );
}
