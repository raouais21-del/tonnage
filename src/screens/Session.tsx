import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, useExercises, type LoggedExercise, type LoggedSet } from '../db';
import { fmtClock, fmtNum, platesPerSide } from '../utils';
import { haptic } from '../haptics';
import { IconCheck, IconDown, IconMinus, IconPlus } from '../components/Icons';
import { Page } from '../components/Page';
import { Sheet } from '../components/Sheet';

interface Props {
  id: number;
  onClose: () => void;
}

const RING = 2 * Math.PI * 25;

/** La séance monte du bas comme un écran modal iOS. */
export function SessionScreen({ id, onClose }: Props) {
  return (
    <Page kind="modal" onClose={onClose}>
      {(close) => <SessionBody id={id} onClose={close} />}
    </Page>
  );
}

function SessionBody({ id, onClose }: Props) {
  const session = useLiveQuery(() => db.sessions.get(id), [id]);
  const { byId } = useExercises();
  const [picked, setPicked] = useState<number | null>(null);
  const [rest, setRest] = useState<{ end: number; total: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  // Garde l'écran allumé pendant la séance.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = () => {
      if (document.visibilityState === 'visible')
        navigator.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {});
    };
    request();
    document.addEventListener('visibilitychange', request);
    return () => {
      document.removeEventListener('visibilitychange', request);
      lock?.release().catch(() => {});
    };
  }, []);

  // Petit retour haptique à la fin du repos.
  const restEnded = useRef(false);
  useEffect(() => {
    if (!rest) return;
    if (rest.end - now > 0) restEnded.current = false;
    else if (!restEnded.current) {
      restEnded.current = true;
      haptic();
    }
  }, [rest, now]);

  if (!session) return null;

  const exercises = session.exercises;
  const firstOpen = exercises.findIndex((e) => e.sets.some((s) => !s.done));
  const ei = picked ?? (firstOpen === -1 ? Math.max(0, exercises.length - 1) : firstOpen);
  const ex: LoggedExercise | undefined = exercises[ei];
  const si = ex ? ex.sets.findIndex((s) => !s.done) : -1;
  const current = si >= 0 ? ex!.sets[si] : null;
  const allDone = firstOpen === -1;
  const restLeft = rest ? (rest.end - now) / 1000 : 0;
  const plates = current ? platesPerSide(current.weight) : null;
  const elapsed = (now - session.startedAt) / 1000;

  const save = (next: LoggedExercise[]) => db.sessions.update(id, { exercises: next });

  /** Modifie la série en cours ; la charge se reporte sur les séries suivantes. */
  const patchCurrent = (patch: Partial<LoggedSet>) => {
    const next = structuredClone(exercises);
    next[ei].sets.forEach((s, j) => {
      if (j === si || (patch.weight !== undefined && j > si && !s.done)) Object.assign(s, j === si ? patch : { weight: patch.weight });
    });
    save(next);
  };

  const validate = () => {
    haptic();
    const next = structuredClone(exercises);
    next[ei].sets[si].done = true;
    save(next);
    const exerciseDone = next[ei].sets.every((s) => s.done);
    const sessionDone = next.every((e) => e.sets.every((s) => s.done));
    if (sessionDone) setRest(null);
    else if (ex!.rest > 0) setRest({ end: Date.now() + ex!.rest * 1000, total: ex!.rest });
    if (exerciseDone) setPicked(null);
  };

  const toggleSet = (j: number) => {
    haptic();
    const next = structuredClone(exercises);
    next[ei].sets[j].done = !next[ei].sets[j].done;
    save(next);
  };

  const addSet = () => {
    const next = structuredClone(exercises);
    const last = next[ei].sets[next[ei].sets.length - 1] ?? { weight: 0, reps: 10 };
    next[ei].sets.push({ weight: last.weight, reps: last.reps, done: false });
    save(next);
  };

  const removeSet = () => {
    const next = structuredClone(exercises);
    const sets = next[ei].sets;
    const j = sets.map((s) => s.done).lastIndexOf(false);
    if (j >= 0 && sets.length > 1) sets.splice(j, 1);
    save(next);
  };

  // On ferme d'abord (animation), puis on écrit en base, pour ne pas vider l'écran pendant qu'il descend.
  const afterClose = () => new Promise((r) => setTimeout(r, 320));

  const finish = async () => {
    haptic();
    const anyDone = exercises.some((e) => e.sets.some((s) => s.done));
    onClose();
    await afterClose();
    if (anyDone) await db.sessions.update(id, { finishedAt: Date.now() });
    else await db.sessions.delete(id);
  };

  const abandon = async () => {
    onClose();
    await afterClose();
    await db.sessions.delete(id);
  };

  return (
    <div className="scroll">
      <div
        className="content inset-page"
        style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', paddingTop: 'calc(var(--safe-top) + 8px)' }}
      >
        <header className="row">
          <button type="button" className="icon-btn" aria-label="Réduire la séance" onClick={onClose}>
            <IconDown size={20} />
          </button>
          <div className="progress-segs grow" aria-label={`Exercice ${ei + 1} sur ${exercises.length}`}>
            {exercises.map((e, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Aller à ${byId.get(e.exerciseId)?.name ?? 'exercice'}`}
                className={i === ei ? 'on' : e.sets.every((s) => s.done) ? 'full' : ''}
                onClick={() => setPicked(i)}
              >
                <span />
              </button>
            ))}
          </div>
          <span className="small muted" style={{ minWidth: 44, textAlign: 'right' }}>
            {elapsed >= 3600 ? `${Math.floor(elapsed / 3600)}:${fmtClock(elapsed % 3600).padStart(5, '0')}` : fmtClock(elapsed)}
          </span>
        </header>

        {!ex ? (
          <div className="empty grow">
            <p className="h2">Cette séance est vide</p>
            <p className="small">Ajoute des exercices dans Programme.</p>
          </div>
        ) : (
          <>
            <div className="mt24">
              <p className="eyebrow">
                Exercice {ei + 1} sur {exercises.length}
                {current ? ` · Série ${si + 1} sur ${ex.sets.length}` : ' · terminé'}
              </p>
              <h1 style={{ fontSize: 30, lineHeight: 1.1, fontWeight: 700, letterSpacing: -0.8, marginTop: 4 }}>
                {byId.get(ex.exerciseId)?.name ?? 'Exercice supprimé'}
              </h1>
            </div>

            {current && (
              <section className="card mt16" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                <Stepper
                  label="Charge"
                  unit="kg"
                  value={current.weight}
                  step={2.5}
                  onChange={(v) => patchCurrent({ weight: Math.max(0, v) })}
                />
                <Stepper label="Répétitions" value={current.reps} step={1} onChange={(v) => patchCurrent({ reps: Math.max(0, Math.round(v)) })} />
                {plates && plates.length > 0 && (
                  <div className="row small muted" style={{ gridColumn: 'span 2', gap: 6, flexWrap: 'wrap' }}>
                    <span>Par côté</span>
                    {plates.map((p, i) => (
                      <span key={i} className={`pill ${p >= 20 ? 'gold' : 'light'}`}>{fmtNum(p)}</span>
                    ))}
                    <span style={{ marginLeft: 'auto' }}>Barre 20 kg</span>
                  </div>
                )}
              </section>
            )}

            <ol className="stack mt16" style={{ gap: 4 }}>
              {ex.sets.map((s, j) => {
                const state = s.done ? 'done' : j === si ? 'current' : 'todo';
                return (
                  <li key={j}>
                    <button
                      type="button"
                      className={`set-row${state === 'current' ? ' current' : ''}`}
                      onClick={() => state !== 'current' && toggleSet(j)}
                      aria-label={`Série ${j + 1}, ${fmtNum(s.weight)} kg × ${s.reps}${s.done ? ', validée : toucher pour annuler' : ''}`}
                    >
                      <span className={`set-mark ${state}`}>{s.done ? <IconCheck size={12} /> : j + 1}</span>
                      <span>Série {j + 1}</span>
                      <span style={{ marginLeft: 'auto' }}>
                        {fmtNum(s.weight)} kg × {s.reps}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="row mt8" style={{ gap: 6 }}>
              <button type="button" className="btn btn-sm btn-ghost" onClick={addSet}><IconPlus size={16} /> Série</button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={removeSet} disabled={!ex.sets.some((s) => !s.done) || ex.sets.length < 2}>
                <IconMinus size={16} /> Série
              </button>
            </div>
          </>
        )}

        <div style={{ marginTop: 'auto', paddingTop: 16 }}>
          {rest && restLeft > 0 && (
            <section className="row card" style={{ padding: '12px 14px', gap: 14 }}>
              <svg width="60" height="60" viewBox="0 0 60 60" role="img" aria-label={`Repos : ${fmtClock(restLeft)} restant`}>
                <circle cx="30" cy="30" r="25" fill="none" stroke="var(--s3)" strokeWidth="6" />
                <circle
                  cx="30"
                  cy="30"
                  r="25"
                  fill="none"
                  stroke="var(--gold)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${RING * (restLeft / rest.total)} ${RING}`}
                  transform="rotate(-90 30 30)"
                />
              </svg>
              <div className="grow">
                <p className="small muted">Repos</p>
                <p style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>{fmtClock(restLeft)}</p>
              </div>
              <button type="button" className="btn btn-sm btn-soft" onClick={() => setRest({ end: rest.end + 15000, total: rest.total + 15 })}>+15 s</button>
              <button type="button" className="btn btn-sm btn-soft" onClick={() => setRest(null)}>Passer</button>
            </section>
          )}

          {current ? (
            <button type="button" className="btn btn-gold btn-block mt12" style={{ height: 60, fontSize: 17 }} onClick={validate}>
              Valider la série
            </button>
          ) : allDone ? (
            <button type="button" className="btn btn-gold btn-block mt12" style={{ height: 60, fontSize: 17 }} onClick={finish}>
              Terminer la séance
            </button>
          ) : (
            <button type="button" className="btn btn-gold btn-block mt12" style={{ height: 60, fontSize: 17 }} onClick={() => setPicked(null)}>
              Exercice suivant
            </button>
          )}
          {!allDone && (
            <button type="button" className="btn btn-ghost btn-block mt8" onClick={() => setEnding(true)}>
              Terminer la séance maintenant
            </button>
          )}
        </div>
      </div>

      <Sheet open={ending} onClose={() => setEnding(false)} title="Terminer la séance ?">
        <p className="small muted">Les séries validées seront enregistrées.</p>
        <div className="stack mt16">
          <button type="button" className="btn btn-gold btn-block" onClick={finish}>Terminer et enregistrer</button>
          <button type="button" className="btn btn-soft btn-block" style={{ background: 'var(--s3)' }} onClick={() => setEnding(false)}>Continuer la séance</button>
          <button type="button" className="btn btn-danger btn-block" onClick={abandon}>Abandonner sans enregistrer</button>
        </div>
      </Sheet>
    </div>
  );
}

function Stepper({ label, unit, value, step, onChange }: { label: string; unit?: string; value: number; step: number; onChange: (v: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div className="stepper-card">
      <label className="xsmall muted" htmlFor={`st-${label}`}>{label}</label>
      <span className="row" style={{ gap: 4, alignItems: 'baseline', justifyContent: 'center' }}>
        <input
          id={`st-${label}`}
          className="big-num big-input"
          inputMode="decimal"
          value={draft ?? fmtNum(value)}
          onFocus={(e) => {
            setDraft(String(value).replace('.', ','));
            requestAnimationFrame(() => e.target.select());
          }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const v = parseFloat((draft ?? '').replace(',', '.'));
            if (Number.isFinite(v)) onChange(v);
            setDraft(null);
          }}
          style={{ width: `${Math.max(1, (draft ?? fmtNum(value)).length) + 0.5}ch` }}
        />
        {unit && <span className="small muted">{unit}</span>}
      </span>
      <span className="row" style={{ gap: 10 }}>
        <button type="button" className="icon-btn soft" aria-label={`Diminuer ${label.toLowerCase()}`} onClick={() => { haptic(); onChange(value - step); }}>
          <IconMinus />
        </button>
        <button type="button" className="icon-btn soft" aria-label={`Augmenter ${label.toLowerCase()}`} onClick={() => { haptic(); onChange(value + step); }}>
          <IconPlus />
        </button>
      </span>
    </div>
  );
}
