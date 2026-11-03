import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { haptic } from '../haptics';

interface Props {
  /** push : arrive de la droite, retour par balayage depuis le bord gauche. modal : monte du bas. */
  kind?: 'push' | 'modal';
  onClose: () => void;
  /** Reçoit `close`, qui joue l'animation de sortie avant d'appeler onClose. */
  children: (close: () => void) => ReactNode;
}

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
const EDGE = 30;

export function Page({ kind = 'push', onClose, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);
  const closed = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const close = useCallback(() => {
    if (closed.current) return;
    closed.current = true;
    setClosing(true);
    setTimeout(() => onCloseRef.current(), 290);
  }, []);

  // Retour par balayage depuis le bord gauche, comme dans les apps iOS.
  useEffect(() => {
    if (kind !== 'push') return;
    const el = ref.current!;
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let t0 = 0;
    let tracking = false;
    let dragging = false;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t.clientX > EDGE || closed.current) return;
      tracking = true;
      dragging = false;
      startX = t.clientX;
      startY = t.clientY;
      dx = 0;
      t0 = Date.now();
    };
    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      const t = e.touches[0];
      const x = t.clientX - startX;
      const y = t.clientY - startY;
      if (!dragging) {
        if (Math.abs(x) < 6 && Math.abs(y) < 6) return;
        if (Math.abs(y) > Math.abs(x)) {
          tracking = false;
          return;
        }
        dragging = true;
        el.style.animation = 'none';
        el.style.transition = 'none';
      }
      e.preventDefault();
      dx = Math.max(0, x);
      el.style.transform = `translateX(${dx}px)`;
    };
    const onEnd = () => {
      if (!tracking) return;
      tracking = false;
      if (!dragging) return;
      const speed = dx / Math.max(1, Date.now() - t0);
      el.style.transition = `transform 0.3s ${EASE}`;
      if (dx > el.clientWidth * 0.33 || speed > 0.6) {
        closed.current = true;
        el.style.transform = 'translateX(100%)';
        haptic();
        setTimeout(() => onCloseRef.current(), 290);
      } else {
        el.style.transform = 'translateX(0)';
      }
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [kind]);

  return (
    <div ref={ref} className={`page ${kind}${closing ? ' closing' : ''}`} role="dialog" aria-modal="true">
      {children(close)}
    </div>
  );
}
