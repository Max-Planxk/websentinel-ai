const ICONS = {
  scraper_created: '🆕',
  dom_change: '⚠️',
  dom_restored: '↺',
  scraper_broken: '🔴',
  healing_started: '🤖',
  healing_succeeded: '✅',
  healing_partial: '🟡',
};

function timeAgo(iso) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

export default function Timeline({ events }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        🕐 Web Change Timeline
      </h2>
      {events.length === 0 ? (
        <p className="text-xs italic text-slate-600">No events yet.</p>
      ) : (
        <ol className="space-y-3 border-l border-slate-800 pl-4">
          {events
            .slice()
            .reverse()
            .slice(0, 12)
            .map((e, i) => (
              <li key={i} className="relative text-xs">
                <span className="absolute -left-[21px] top-0.5">{ICONS[e.type] || '•'}</span>
                <span className="text-slate-300">{e.message}</span>
                <span className="ml-2 text-slate-600">· {timeAgo(e.ts)}</span>
              </li>
            ))}
        </ol>
      )}
    </div>
  );
}
