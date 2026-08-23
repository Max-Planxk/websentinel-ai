import { useEffect, useState } from 'react';

const PINGS = [
  { top: '22%', left: '18%', delay: '0s' },
  { top: '65%', left: '28%', delay: '1.1s' },
  { top: '38%', left: '72%', delay: '2.2s' },
  { top: '78%', left: '64%', delay: '0.6s' },
  { top: '15%', left: '58%', delay: '1.8s' },
  { top: '52%', left: '10%', delay: '2.6s' },
  { top: '30%', left: '40%', delay: '3.4s' },
  { top: '85%', left: '20%', delay: '2.0s' },
];

export default function Landing({ onEnter }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="landing">
      <div className="landing__orb landing__orb--1" />
      <div className="landing__orb landing__orb--2" />
      <div className="landing__orb landing__orb--3" />

      <div className="landing__grid" />
      <div className="landing__sweep" />
      <div className="landing__sweep landing__sweep--slow" />

      {PINGS.map((p, i) => (
        <span
          key={i}
          className="landing__ping"
          style={{ top: p.top, left: p.left, animationDelay: p.delay }}
        />
      ))}

      <div className="landing__vignette" />

      <div className={`landing__content ${ready ? 'landing__content--in' : ''}`}>
       <div className="landing__brand">
  <span className="landing__brand-dot" />
  <span className="landing__brand-text">WEBSENTINEL AI</span>
</div>
        <h1 className="landing__title">
          The web changes.
          <br />
          <span className="landing__title-accent">Your scrapers shouldn't.</span>
        </h1>
        <p className="landing__tagline">
          Self-healing competitor monitoring,<br></br> powered by Bright Data Scraper Studio.
          <br></br>Point it at a site. It watches, detects, and repairs itself — automatically.
        </p>
        <button className="landing__cta" onClick={onEnter}>
          <span>Start Monitoring</span>
          <span className="landing__cta-arrow">→</span>
        </button>
      </div>
    </div>
  );
}