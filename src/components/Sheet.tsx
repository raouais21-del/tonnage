import { useEffect, useRef, useState, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

/** Feuille qui monte du bas de l'écran ; se ferme en la glissant vers le bas. */
export function Sheet({ open, onClose, title, children }: Props) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const t = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, 280);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Glisser vers le bas pour fermer (depuis la poignée, ou quand le contenu est en haut).
  useEffect(() => {
    const el = sheetRef.current;
    if (!mounted || !el) return;
    el.style.transform = '';
    el.style.transition = '';
    el.style.animation = '';
    let startY = 0;
    let dy = 0;
    let t0 = 0;
    let tracking = false;
    let dragging = false;

    const onStart = (e: TouchEvent) => {
      const fromGrip = (e.target as HTMLElement).closest('.sheet-grip');
      if (!fromGrip && el.scrollTop > 0) return;
      tracking = true;
      dragging = false;
      startY = e.touches[0].clientY;
      dy = 0;
      t0 = Date.now();
    };
    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      const y = e.touches[0].clientY - startY;
      if (!dragging) {
        if (y < 6) {
          if (y < -6) tracking = false;
          return;
        }
        dragging = true;
        el.style.animation = 'none';
        el.style.transition = 'none';
      }
      e.preventDefault();
      dy = Math.max(0, y);
      el.style.transform = `translateY(${dy}px)`;
    };
    const onEnd = () => {
      if (!tracking) return;
      tracking = false;
      if (!dragging) return;
      const speed = dy / Math.max(1, Date.now() - t0);
      el.style.transition = `transform 0.28s ${EASE}`;
      if (dy > 110 || speed > 0.5) {
        el.style.transform = 'translateY(100%)';
        onCloseRef.current();
      } else {
        el.style.transform = 'translateY(0)';
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
  }, [mounted]);

  if (!mounted) return null;
  return (
    <div className={`sheet-backdrop${closing ? ' closing' : ''}`} onClick={() => onCloseRef.current()}>
      <div
        ref={sheetRef}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-grip">
          <div className="sheet-handle" />
        </div>
        {title && <h2 className="sheet-title">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
