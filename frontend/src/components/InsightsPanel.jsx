export default function InsightsPanel({ insights, onNudge, sites, busy }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">📈 Market Signals</h2>
        <div className="flex gap-2">
          {sites.map((s) => (
            <button
              key={s.name}
              onClick={() => onNudge(s.name)}
              disabled={busy}
              className="rounded-full border border-slate-700 px-2.5 py-1 text-xs capitalize text-slate-400 transition hover:border-indigo-500 hover:text-indigo-300 disabled:opacity-50"
            >
              Shift {s.name} prices
            </button>
          ))}
        </div>
      </div>

      {insights.length === 0 ? (
        <p className="text-xs italic text-slate-600">
          No signals yet — run a scraper twice (after shifting a competitor's prices) to detect a change.
        </p>
      ) : (
        <div className="space-y-2">
          {insights.map((ins, i) => (
            <div key={i} className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium capitalize text-slate-200">
                  {ins.site} — {ins.product}
                </span>
                <span className={ins.direction === 'down' ? 'text-green-400' : 'text-orange-400'}>
                  {ins.direction === 'down' ? '↓' : '↑'} {Math.abs(ins.pctChange)}%
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                ₹{ins.oldPrice.toLocaleString('en-IN')} → ₹{ins.newPrice.toLocaleString('en-IN')}
              </p>
              <p className="mt-1 text-xs text-indigo-300/80">AI Prediction: {ins.note}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
