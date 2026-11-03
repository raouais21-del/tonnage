import { useEffect, useState } from 'react';

/**
 * Animation d'ouverture. Elle part exactement de l'écran de démarrage iOS
 * (haltère dorée centrée, 140 px de large) pour un enchaînement sans saut.
 */
export function Intro() {
  const [phase, setPhase] = useState<'play' | 'out' | 'done'>('play');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('out'), 1350);
    const t2 = setTimeout(() => setPhase('done'), 1800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === 'done') return null;
  return (
    <div className={`intro${phase === 'out' ? ' out' : ''}`} aria-hidden="true">
      <div className="intro-logo">
        <svg viewBox="0 0 100 100" width="140" height="140">
          <rect className="intro-bar" x="30" y="46" width="40" height="8" />
          <rect className="intro-plate l1" x="22" y="27" width="8" height="46" />
          <rect className="intro-plate r1" x="70" y="27" width="8" height="46" />
          <rect className="intro-plate l2" x="15" y="36" width="6" height="28" />
          <rect className="intro-plate r2" x="79" y="36" width="6" height="28" />
        </svg>
        <span className="intro-word">Tonnage</span>
      </div>
    </div>
  );
}
