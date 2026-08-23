import { useEffect, useState } from 'react';

const STEPS = [
  'Analyzing previous DOM',
  'Comparing current DOM',
  'Generating new extraction logic',
  'Testing against page',
  'Validating schema',
];

export default function HealingModal({ open, phase, diagnosis, recoveryMs, onClose }) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!open || phase !== 'healing') {
      setStepIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    }, 380);
    return () => clearInterval(interval);
  }, [open, phase]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        {phase === 'healing' && (
          <>
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-indigo-300">
              <span className="animate-pulse-glow">🤖</span> HEALING SCRAPER…
            </h3>
            <ul className="space-y-2 text-sm">
              {STEPS.map((step, i) => (
                <li key={step} className="flex items-center gap-2">
                  <span className={i <= stepIndex ? 'text-green-400' : 'text-slate-700'}>
                    {i < stepIndex ? '✓' : i === stepIndex ? '⏳' : '○'}
                  </span>
                  <span className={i <= stepIndex ? 'text-slate-200' : 'text-slate-600'}>{step}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
              />
            </div>
          </>
        )}

        {phase === 'done' && diagnosis && (
          <>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-400">
              ✓ HEALED — Recovery time: {(recoveryMs / 1000).toFixed(1)}s
            </h3>
            <p className="mb-3 text-xs text-slate-400">{diagnosis.rootCause}</p>
            <div className="space-y-2">
              {diagnosis.findings.map((f) => (
                <div key={f.field} className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-medium capitalize text-slate-200">{f.field}</span>
                    <span className={f.status === 'repairable' ? 'text-green-400' : 'text-red-400'}>
                      {f.status === 'repairable' ? `✓ repaired (${Math.round(f.confidence * 100)}% confidence)` : '✗ unrepairable'}
                    </span>
                  </div>
                  {f.status === 'repairable' && (
                    <p className="font-mono text-slate-500">
                      {f.oldSelector} <span className="text-slate-600">→</span> {f.proposedSelector}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={onClose}
              className="mt-5 w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
            >
              Continue
            </button>
          </>
        )}
      </div>
    </div>
  );
}
