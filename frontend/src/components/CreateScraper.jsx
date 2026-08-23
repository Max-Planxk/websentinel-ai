import { useState, useEffect } from 'react';

const ALL_FIELDS = ['product', 'price', 'availability', 'rating'];

export default function CreateScraper({ sites, onCreate, creating }) {
  const [name, setName] = useState('');
  const [site, setSite] = useState('');
  const [fields, setFields] = useState(ALL_FIELDS);

  useEffect(() => {
    if (!site && sites.length > 0) setSite(sites[0].name);
  }, [sites, site]);

  function toggleField(f) {
    setFields((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !site || fields.length === 0) return;
    onCreate({ name: name.trim(), url: site, fields });
    setName('');
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border p-8"
      style={{
        borderColor: 'rgba(99,102,241,0.25)',
        background: 'linear-gradient(135deg, rgba(30,27,75,0.4), rgba(15,23,42,0.6))',
      }}
    >
      <h2
        className="mb-6 text-xs font-semibold uppercase"
        style={{ letterSpacing: '0.18em', color: '#a5b4fc', fontFamily: "'JetBrains Mono', monospace" }}
      >
        + Create Scraper
      </h2>
      <div className="grid gap-4 sm:grid-cols-[1fr_180px_auto] sm:items-end">
        <div>
          <label className="mb-2 block text-sm font-medium" style={{ color: '#cbd5e1' }}>
            What are you tracking?
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='e.g. "Track Nike prices, stock and ratings"'
            className="w-full rounded-xl border px-4 py-3.5 text-base outline-none transition"
            style={{
              borderColor: 'rgba(99,102,241,0.3)',
              background: 'rgba(2,6,23,0.6)',
              color: '#f1f5f9',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#818cf8')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(99,102,241,0.3)')}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium" style={{ color: '#cbd5e1' }}>
            Competitor site
          </label>
          <select
            value={site}
            onChange={(e) => setSite(e.target.value)}
            className="w-full rounded-xl border px-4 py-3.5 text-base capitalize outline-none"
            style={{ borderColor: 'rgba(99,102,241,0.3)', background: 'rgba(2,6,23,0.6)', color: '#f1f5f9' }}
          >
            {sites.map((s) => (
              <option key={s.name} value={s.name} className="capitalize">
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="rounded-xl px-6 py-3.5 text-base font-semibold text-white transition disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
            boxShadow: '0 8px 24px -6px rgba(79,70,229,0.5)',
          }}
        >
          {creating ? 'Creating…' : 'Create Scraper'}
        </button>
      </div>
      <div className="mt-5 flex flex-wrap gap-2.5">
        {ALL_FIELDS.map((f) => (
          <button
            type="button"
            key={f}
            onClick={() => toggleField(f)}
            className="rounded-full border px-4 py-2 text-sm font-medium capitalize transition"
            style={
              fields.includes(f)
                ? { borderColor: '#818cf8', background: 'rgba(99,102,241,0.15)', color: '#c7d2fe' }
                : { borderColor: 'rgba(148,163,184,0.25)', color: '#64748b' }
            }
          >
            {f}
          </button>
        ))}
      </div>
    </form>
  );
}