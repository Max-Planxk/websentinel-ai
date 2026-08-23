export default function HealthBadge({ status, score }) {
  const styles = {
    healthy: 'bg-green-500/15 text-green-400 border-green-500/40',
    degraded: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40',
    broken: 'bg-red-500/15 text-red-400 border-red-500/40',
    healing: 'bg-blue-500/15 text-blue-400 border-blue-500/40 animate-pulse-glow',
    unknown: 'bg-slate-500/15 text-slate-400 border-slate-500/40',
  };
  const dot = {
    healthy: '🟢',
    degraded: '🟡',
    broken: '🔴',
    healing: '🤖',
    unknown: '⚪',
  };
  const cls = styles[status] || styles.unknown;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${cls}`}>
      <span>{dot[status] || dot.unknown}</span>
      <span className="capitalize">{status}</span>
      {typeof score === 'number' && <span className="opacity-70">· {score}%</span>}
    </span>
  );
}
