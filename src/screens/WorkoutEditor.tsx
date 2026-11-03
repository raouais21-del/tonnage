import { useRef, useState } from 'react';
import { claimDays, db, useExercises, type Workout, type WorkoutItem } from '../db';
import { DAYS, DAYS_SHORT } from '../utils';
import { haptic } from '../haptics';
import { IconDown, IconPlus, IconTrash, IconUp } from '../components/Icons';
import { Page } from '../components/Page';
import { BackButton, Screen } from '../components/Screen';
import { ExerciseLibrary } from './ExerciseLibrary';

interface Props {
  workout?: Workout;
  onClose: () => void;
}

const DEFAULT_ITEM = { sets: 3, reps: 10, weight: 0, rest: 120 };

/** Les modifications sont enregistrées en quittant l'écran (bouton retour ou balayage), comme dans Notes. */
export function WorkoutEditor({ workout, onClose }: Props) {
  const { byId } = useExercises();
  const [name, setName] = useState(workout?.name ?? '');
  const [days, setDays] = useState<number[]>(workout?.days ?? []);
  const [items, setItems] = useState<WorkoutItem[]>(workout?.items ?? []);
  const [picking, setPicking] = useState<Set<string> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleted = useRef(false);

  const toggleDay = (d: number) => {
    haptic();
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));
  };

  const updateItem = (i: number, patch: Partial<WorkoutItem>) =>
    setItems((cur) => cur.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  const move = (i: number, delta: number) => {
    haptic();
    setItems((cur) => {
      const next = [...cur];
      const [it] = next.splice(i, 1);
      next.splice(i + delta, 0, it);
      return next;
    });
  };

  const persist = async () => {
    if (deleted.current) return;
    if (!workout && !name.trim() && items.length === 0) return;
    const data = { name: name.trim() || 'Séance', days, items };
    let id = workout?.id;
    if (id) await db.workouts.update(id, data);
    else id = await db.workouts.add({ ...data, createdAt: Date.now() });
    await claimDays(id, days);
  };

  const finish = async () => {
    await persist();
    onClose();
  };

  return (
    <Page onClose={finish}>
      {(close) => (
        <>
          <Screen
            title={name.trim() || (workout ? 'Séance' : 'Nouvelle séance')}
            large={false}
            inset="page"
            left={<BackButton label="Programme" onClick={close} />}
            right={
              <button type="button" className="nav-btn strong" onClick={close}>
                OK
              </button>
            }
          >
            <div className="field mt8">
              <label htmlFor="w-name">Nom de la séance</label>
              <input id="w-name" className="input" placeholder="Ex. : Push, Pull, Jambes…" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="mt24">
              <h2 className="h2">Jours</h2>
              <p className="small muted mt8">Un seul entraînement par jour : choisir un jour le retire des autres séances.</p>
              <div className="week mt12" role="group" aria-label="Jours de la séance">
                {DAYS_SHORT.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    className="chip"
                    style={{ height: 44, padding: 0 }}
                    aria-pressed={days.includes(i)}
                    aria-label={DAYS[i]}
                    onClick={() => toggleDay(i)}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="between mt24">
              <h2 className="h2">Exercices</h2>
              <span className="small muted">{items.length}</span>
            </div>

            <ol className="stack mt12">
              {items.map((it, i) => (
                <li key={`${it.exerciseId}-${i}`} className="card" style={{ padding: 14 }}>
                  <div className="row">
                    <span className="badge-num">{i + 1}</span>
                    <div className="grow">
                      <p className="item-title">{byId.get(it.exerciseId)?.name ?? 'Exercice supprimé'}</p>
                      <p className="item-sub">{byId.get(it.exerciseId)?.group}</p>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, marginTop: 12 }}>
                    <NumField label="Séries" value={it.sets} onChange={(v) => updateItem(i, { sets: Math.max(1, Math.round(v)) })} />
                    <NumField label="Reps" value={it.reps} onChange={(v) => updateItem(i, { reps: Math.max(1, Math.round(v)) })} />
                    <NumField label="Kg" value={it.weight} step={0.5} onChange={(v) => updateItem(i, { weight: Math.max(0, v) })} />
                    <NumField label="Repos (s)" value={it.rest} onChange={(v) => updateItem(i, { rest: Math.max(0, Math.round(v)) })} />
                  </div>
                  <div className="row mt12" style={{ gap: 6, justifyContent: 'flex-end' }}>
                    <button type="button" className="icon-btn soft" aria-label="Monter" disabled={i === 0} onClick={() => move(i, -1)}>
                      <IconUp size={18} />
                    </button>
                    <button type="button" className="icon-btn soft" aria-label="Descendre" disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                      <IconDown size={18} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn soft"
                      aria-label="Retirer l’exercice"
                      onClick={() => {
                        haptic();
                        setItems((cur) => cur.filter((_, j) => j !== i));
                      }}
                    >
                      <IconTrash size={18} />
                    </button>
                  </div>
                </li>
              ))}
            </ol>

            <button type="button" className="btn btn-soft btn-block mt12" onClick={() => setPicking(new Set())}>
              <IconPlus /> Ajouter des exercices
            </button>

            {workout && (
              <div className="mt24" style={{ textAlign: 'center' }}>
                {confirmDelete ? (
                  <div className="row" style={{ justifyContent: 'center' }}>
                    <button type="button" className="btn btn-sm btn-soft" onClick={() => setConfirmDelete(false)}>Annuler</button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      style={{ background: 'var(--s2)' }}
                      onClick={async () => {
                        haptic();
                        deleted.current = true;
                        await db.workouts.delete(workout.id!);
                        close();
                      }}
                    >
                      Confirmer la suppression
                    </button>
                  </div>
                ) : (
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => setConfirmDelete(true)}>Supprimer la séance</button>
                )}
              </div>
            )}
          </Screen>

          {picking && (
            <Page onClose={() => setPicking(null)}>
              {(closePicker) => (
                <>
                  <Screen
                    title="Exercices"
                    large={false}
                    inset="bar"
                    left={<BackButton label="Séance" onClick={closePicker} />}
                  >
                    <div className="mt8">
                      <ExerciseLibrary
                        selected={picking}
                        onToggle={(id) => {
                          haptic();
                          setPicking((cur) => {
                            const next = new Set(cur);
                            if (next.has(id)) next.delete(id);
                            else next.add(id);
                            return next;
                          });
                        }}
                      />
                    </div>
                  </Screen>
                  <div className="bottom-bar">
                    <button
                      type="button"
                      className="btn btn-gold"
                      disabled={picking.size === 0}
                      onClick={() => {
                        haptic();
                        setItems((cur) => [...cur, ...[...picking].map((exerciseId) => ({ exerciseId, ...DEFAULT_ITEM }))]);
                        closePicker();
                      }}
                    >
                      Ajouter {picking.size > 0 ? `${picking.size} exercice${picking.size > 1 ? 's' : ''}` : ''}
                    </button>
                  </div>
                </>
              )}
            </Page>
          )}
        </>
      )}
    </Page>
  );
}

function NumField({ label, value, step = 1, onChange }: { label: string; value: number; step?: number; onChange: (v: number) => void }) {
  return (
    <label className="field" style={{ gap: 4 }}>
      <span className="xsmall muted" style={{ textAlign: 'center' }}>{label}</span>
      <input
        className="num-input"
        type="number"
        inputMode="decimal"
        step={step}
        value={Number.isFinite(value) ? value : ''}
        onFocus={(e) => e.target.select()}
        onChange={(e) => onChange(parseFloat(e.target.value.replace(',', '.')) || 0)}
      />
    </label>
  );
}
