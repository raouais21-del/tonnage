import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, useExercises, type Session } from '../db';
import { haptic } from '../haptics';
import { fmtDuration, fmtSet, fmtSummaryDate, fmtTonnage, renderSummaryImage, summarize } from '../summary';
import { isoDate } from '../utils';
import { Page } from '../components/Page';
import { Screen } from '../components/Screen';

/** Résumé ouvert depuis l'accueil (séance déjà terminée). */
export function SummaryScreen({ id, onClose }: { id: number; onClose: () => void }) {
  const session = useLiveQuery(() => db.sessions.get(id), [id]);
  return (
    <Page kind="modal" onClose={onClose}>
      {(close) => (session ? <SummaryBody session={session} onClose={close} /> : null)}
    </Page>
  );
}

export function SummaryBody({ session, onClose }: { session: Session; onClose: () => void }) {
  const { byId } = useExercises();
  const sum = summarize(session, byId);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');

  // L'image est préparée à l'avance : iOS n'ouvre le partage que dans la foulée du toucher.
  const key = JSON.stringify(sum.exercises) + sum.name;
  useEffect(() => {
    let alive = true;
    renderSummaryImage(sum)
      .then((blob) => alive && setFile(new File([blob], `seance-${isoDate(sum.date)}.png`, { type: 'image/png' })))
      .catch(() => alive && setStatus('Impossible de préparer l’image.'));
    return () => {
      alive = false;
    };
  }, [key]);

  const share = async () => {
    if (!file) return;
    haptic();
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
      } catch {
        // partage annulé
      }
      return;
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('Image téléchargée.');
  };

  return (
    <>
      <Screen
        title="Résumé"
        large={false}
        inset="bar"
        right={
          <button type="button" className="nav-btn strong" onClick={onClose}>
            OK
          </button>
        }
      >
        <p className="eyebrow mt8">{fmtSummaryDate(sum.date)}</p>
        <h1 className="large-title">{sum.name}</h1>

        <section className="card-gold mt12" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 18 }}>
          <Stat label="Durée" value={fmtDuration(sum.durationMs)} />
          <Stat label="Tonnage" value={fmtTonnage(sum.tonnage)} />
          <Stat label="Séries" value={String(sum.sets)} />
          <Stat label="Répétitions" value={String(sum.reps)} />
        </section>

        <ul className="stack mt16" style={{ gap: 10 }}>
          {sum.exercises.map((e, i) => (
            <li key={i} className="card" style={{ padding: 16 }}>
              <div className="between" style={{ alignItems: 'baseline' }}>
                <h2 className="item-title" style={{ fontSize: 16 }}>{e.name}</h2>
                <span className="xsmall muted">{e.group}</span>
              </div>
              <ol className="stack mt12" style={{ gap: 6 }}>
                {e.sets.map((s, j) => (
                  <li key={j} className="between" style={{ background: 'var(--s2)', borderRadius: 12, padding: '10px 12px', fontSize: 14 }}>
                    <span className="muted" style={{ width: 64 }}>Série {j + 1}</span>
                    <span className="grow" style={{ fontWeight: 600 }}>{fmtSet(s)}</span>
                    {s.rir !== null && (
                      <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 13 }}>RIR {s.rir === 5 ? '5+' : s.rir}</span>
                    )}
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
        {status && <p className="small muted mt12" role="status">{status}</p>}
      </Screen>

      <div className="bottom-bar">
        <button type="button" className="btn btn-gold" disabled={!file} onClick={share}>
          {file ? 'Exporter en image' : 'Préparation de l’image…'}
        </button>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="small" style={{ fontWeight: 600, opacity: 0.7 }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5, marginTop: 2 }}>{value}</p>
    </div>
  );
}
