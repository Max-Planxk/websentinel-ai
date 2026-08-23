import { useEffect, useState } from 'react';

export default function Splash({ onDone }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), 1800);
    const doneTimer = setTimeout(() => onDone(), 2300);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div className={`splash ${exiting ? 'splash--exit' : ''}`} onClick={() => onDone()}>
      <div className="splash__glow" />
      <div className="splash__mark">🛰️</div>
      <h1 className="splash__name">
        <span className="splash__name-web">Web</span>
        <span className="splash__name-sentinel">Sentinel</span>
        <span className="splash__name-ai">AI</span>
      </h1>
      <div className="splash__bar">
        <div className="splash__bar-fill" />
      </div>
    </div>
  );
}