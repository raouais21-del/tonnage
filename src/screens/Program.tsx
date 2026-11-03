import { useState } from 'react';
import { claimDays, db, useWorkouts, type Workout } from '../db';
import { DAYS } from '../utils';
import { haptic } from '../haptics';
import { IconCheck, IconChevron, IconPlus } from '../components/Icons';
import { Screen } from '../components/Screen';
import { Sheet } from '../components/Sheet';
import { ExerciseLibrary } from './ExerciseLibrary';
import { WorkoutEditor } from './WorkoutEditor';

export function Program() {
  const [view, setView] = useState<'workouts' | 'exercises'>('workouts');
  const pick = (v: typeof view) => {
    haptic();
    setView(v);
  };

  return (
    <Screen id="scroll-program" title="Programme">
      <div className="segmented mt8" role="group" aria-label="Section">
        <button type="button" aria-pressed={view === 'workouts'} onClick={() => pick('workouts')}>Séances</button>
        <button type="button" aria-pressed={view === 'exercises'} onClick={() => pick('exercises')}>Exercices</button>
      </div>
      <div className="mt16">{view === 'workouts' ? <Workouts /> : <ExerciseLibrary />}</div>
    </Screen>
  );
}

function Workouts() {
  const workouts = useWorkouts();
  const [editing, setEditing] = useState<Workout | 'new' | null>(null);
  const [dayPick, setDayPick] = useState<number | null>(null);

  if (!workouts) return null;
  const byDay = (d: number) => workouts.find((w) => w.days.includes(d));

  const assign = async (day: number, workout: Workout | null) => {
    haptic();
    setDayPick(null);
    if (workout) {
      await claimDays(workout.id!, [day]);
      if (!workout.days.includes(day)) await db.workouts.update(workout.id!, { days: [...workout.days, day].sort() });
    } else {
      const current = byDay(day);
      if (current) await db.workouts.update(current.id!, { days: current.days.filter((x) => x !== day) });
    }
  };

  return (
    <>
      <section className="card" style={{ padding: 8 }}>
        <h2 className="h2" style={{ padding: '10px 10px 6px' }}>Ma semaine</h2>
        <ul>
          {DAYS.map((label, d) => {
            const w = byDay(d);
            return (
              <li key={d}>
                <button
                  type="button"
                  className="between week-row"
                  style={{ width: '100%', height: 48, padding: '0 10px', border: 0, background: 'transparent', borderRadius: 14 }}
                  onClick={() => setDayPick(d)}
                >
                  <span className="small muted" style={{ width: 90, textAlign: 'left' }}>{label}</span>
                  <span className="grow" style={{ textAlign: 'right', fontWeight: w ? 600 : 400, color: w ? 'var(--gold)' : 'var(--muted)' }}>
                    {w ? w.name : 'Repos'}
                  </span>
                  <span className="muted"><IconChevron size={16} /></span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="between mt24">
        <h2 className="h2">Mes séances</h2>
        <button type="button" className="btn btn-sm btn-gold" onClick={() => setEditing('new')}>
          <IconPlus size={18} /> Créer
        </button>
      </div>

      {workouts.length === 0 ? (
        <div className="empty">
          <p className="h2">Aucune séance</p>
          <p className="small">Crée ta première séance (Push, Pull, Jambes…) puis associe-la à des jours.</p>
        </div>
      ) : (
        <ul className="stack mt12">
          {workouts.map((w) => (
            <li key={w.id}>
              <button type="button" className="list-item" onClick={() => setEditing(w)}>
                <span className="badge-num" style={{ color: 'var(--gold)' }}>{w.name.charAt(0).toUpperCase()}</span>
                <span className="grow">
                  <span className="item-title" style={{ display: 'block' }}>{w.name}</span>
                  <span className="item-sub" style={{ display: 'block' }}>
                    {w.items.length} exercice{w.items.length > 1 ? 's' : ''} ·{' '}
                    {w.days.length ? w.days.map((d) => DAYS[d].slice(0, 3)).join(', ') : 'aucun jour'}
                  </span>
                </span>
                <span className="muted"><IconChevron size={18} /></span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={dayPick !== null} onClose={() => setDayPick(null)} title={dayPick !== null ? DAYS[dayPick] : ''}>
        {dayPick !== null && (
          <ul className="stack">
            {[null, ...workouts].map((w) => {
              const on = (byDay(dayPick)?.id ?? null) === (w?.id ?? null);
              return (
                <li key={w?.id ?? 'rest'}>
                  <button type="button" className="list-item" style={{ minHeight: 56, padding: '0 16px' }} onClick={() => assign(dayPick, w)}>
                    <span className="grow item-title">{w ? w.name : 'Repos'}</span>
                    <span className={`check${on ? ' on' : ''}`}>{on && <IconCheck size={13} />}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Sheet>

      {editing && <WorkoutEditor workout={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </>
  );
}
