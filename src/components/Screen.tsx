import { useState, type ReactNode } from 'react';
import { IconBack } from './Icons';

interface Props {
  title: string;
  /** Grand titre iOS qui se replie dans la barre en défilant. */
  large?: boolean;
  eyebrow?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  /** Espace laissé en bas : barre d'onglets, rien, ou barre d'action fixe. */
  inset?: 'tab' | 'page' | 'bar';
  id?: string;
  children: ReactNode;
}

export function Screen({ title, large = true, eyebrow, left, right, inset = 'tab', id, children }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const threshold = large ? 44 : 2;

  return (
    <div
      className="scroll"
      id={id}
      onScroll={(e) => {
        const s = e.currentTarget.scrollTop > threshold;
        if (s !== scrolled) setScrolled(s);
      }}
    >
      <header className="navbar" data-scrolled={scrolled} data-large={large}>
        <div className="navbar-inner">
          <div className="navbar-side">{left}</div>
          <div className="navbar-title" aria-hidden={large && !scrolled}>{title}</div>
          <div className="navbar-side right">{right}</div>
        </div>
      </header>
      <div className={`content${inset === 'tab' ? '' : ` inset-${inset}`}`}>
        {large && (
          <>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h1 className="large-title">{title}</h1>
          </>
        )}
        {children}
      </div>
    </div>
  );
}

export function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="nav-btn" onClick={onClick} style={{ paddingLeft: 0 }}>
      <IconBack size={26} strokeWidth={2.4} />
      {label}
    </button>
  );
}
