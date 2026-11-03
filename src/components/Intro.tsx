import { useEffect, useState } from 'react';

const WORD = ['F', 'o', 'r', 'g', 'e'];

/**
 * Animation d'ouverture : le logo apparaît net à partir d'un flou, le nom se
 * révèle lettre par lettre, un trait doré se trace, puis tout s'efface en douceur.
 * L'écran de démarrage iOS est noir uni, donc l'enchaînement se fait sans saut.
 */
export function Intro() {
  const [phase, setPhase] = useState<'play' | 'out' | 'done'>('play');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('out'), 1750);
    const t2 = setTimeout(() => setPhase('done'), 2300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === 'done') return null;
  return (
    <div className={`intro${phase === 'out' ? ' out' : ''}`} aria-hidden="true">
      <div className="intro-glow" />
      <div className="intro-content">
        <svg className="intro-mark" viewBox="0 0 100 60" width="92" height="55">
          <rect className="intro-bar" x="28" y="26" width="44" height="8" rx="2" />
          <rect className="intro-plate in-l" x="18" y="8" width="10" height="44" rx="3" />
          <rect className="intro-plate in-r" x="72" y="8" width="10" height="44" rx="3" />
          <rect className="intro-plate out-l" x="8" y="16" width="8" height="28" rx="3" />
          <rect className="intro-plate out-r" x="84" y="16" width="8" height="28" rx="3" />
        </svg>
        <div className="intro-word">
          {WORD.map((c, i) => (
            <span key={i} style={{ animationDelay: `${0.5 + i * 0.045}s` }}>{c}</span>
          ))}
          <span className="gold" style={{ animationDelay: `${0.5 + WORD.length * 0.045 + 0.08}s` }}>U</span>
        </div>
        <div className="intro-line" />
      </div>
    </div>
  );
}
