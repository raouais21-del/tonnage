import { useState } from 'react';
import { GROUPS } from '../catalog';
import { finishedSessions, useExercises, useSessions } from '../db';
import { estimate1RM, fmtNum, isoDate } from '../utils';

export function Progress() {
  const sessions = useSessions();
  const { byId } = useExercises();
  const [selected, setSelected] = useState<string | null>(null);

  if (!sessions) return <main className="screen" />;
  const done = finishedSessions(sessions);

  // Exercices pratiqués, du plus fréquent au moins fréquent.
  const counts = new Map<string, number>();
  for (const s of done)
    for (const e of s.exercises) if (e.sets.some((x) => x.done)) counts.set(e.exerciseId, (counts.get(e.exerciseId) ?? 0) + 1);
  const practiced = [...counts.keys()].sort((a, b) => counts.get(b)! - counts.get(a)!);

  if (practiced.length === 0) {
    return (
      <main className="screen">
        <h1 className="title">Progrès</h1>
        <div className="empty mt24">
          <p className="h2">Pas encore de données</p>
          <p className="small">Termine ta première séance pour voir ta progression ici.</p>
        </div>
      </main>
    );
  }

  const exId = selected && counts.has(selected) ? selected : practiced[0];

  // Meilleure charge de chaque séance pour l'exercice choisi.
  const points = done
    .map((s) => {
      const sets = s.exercises.filter((e) => e.exerciseId === exId).flatMap((e) => e.sets.filter((x) => x.done));
      return sets.length ? { top: Math.max(...sets.map((x) => x.weight)), sets } : null;
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);
  const recent = points.slice(-12);
  const allSets = points.flatMap((p) => p.sets);
  const record = allSets.reduce((best, x) => (x.weight > best.weight || (x.weight === best.weight && x.reps > best.reps) ? x : best));
  const best1RM = Math.max(...allSets.map((x) => estimate1RM(x.weight, x.reps)));
  const delta = recent[recent.length - 1].top - recent[0].top;
  const min = Math.min(...recent.map((p) => p.top));
  const max = Math.max(...recent.map((p) => p.top));

  // Séries validées par groupe musculaire sur les 7 derniers jours.
  const since = new Date();
  since.setDate(since.getDate() - 6);
  const sinceIso = isoDate(since);
  const perGroup = new Map<string, number>();
  for (const s of done.filter((x) => x.date >= sinceIso))
    for (const e of s.exercises) {
      const g = byId.get(e.exerciseId)?.group;
      const n = e.sets.filter((x) => x.done).length;
      if (g && n) perGroup.set(g, (perGroup.get(g) ?? 0) + n);
    }
  const groups = GROUPS.filter((g) => perGroup.has(g)).sort((a, b) => perGroup.get(b)! - perGroup.get(a)!);
  const maxGroup = Math.max(1, ...perGroup.values());

  return (
    <main className="screen">
      <h1 className="title">Progrès</h1>

      <div className="chips mt16" role="group" aria-label="Exercice">
        {practiced.map((id) => (
          <button key={id} type="button" className="chip" aria-pressed={id === exId} onClick={() => setSelected(id)}>
            {byId.get(id)?.name ?? 'Exercice supprimé'}
          </button>
        ))}
      </div>

      <section className="card mt12" style={{ padding: 20, borderRadius: 28 }}>
        <div className="between" style={{ alignItems: 'flex-start' }}>
          <div>
            <p className="small muted">Meilleure charge, dernière séance</p>
            <p style={{ fontSize: 44, lineHeight: 1, fontWeight: 700, letterSpacing: -1.5, marginTop: 4 }}>
              {fmtNum(recent[recent.length - 1].top)} kg
            </p>
          </div>
          {recent.length > 1 && (
            <span className={`pill ${delta > 0 ? 'gold' : ''}`}>
              {delta > 0 ? '+' : ''}
              {fmtNum(delta)} kg
            </span>
          )}
        </div>
        <div className="bars mt16" role="img" aria-label={`Charge sur les ${recent.length} dernières séances, de ${fmtNum(recent[0].top)} à ${fmtNum(recent[recent.length - 1].top)} kg`}>
          {recent.map((p, i) => (
            <div
              key={i}
              className={i === recent.length - 1 ? 'last' : ''}
              style={{ height: max === min ? 90 : 24 + ((p.top - min) / (max - min)) * 100 }}
            />
          ))}
        </div>
        <div className="between mt8 xsmall muted">
          <span>{recent.length > 1 ? `Il y a ${recent.length - 1} séance${recent.length > 2 ? 's' : ''}` : ''}</span>
          <span>Dernière séance</span>
        </div>
      </section>

      <dl className="mt8" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, margin: '8px 0 0' }}>
        <Stat label="Record" value={`${fmtNum(record.weight)} × ${record.reps}`} />
        <Stat label="1RM estimé" value={`${fmtNum(Math.round(best1RM * 2) / 2)} kg`} />
        <Stat label="Séances" value={String(done.length)} />
      </dl>

      {groups.length > 0 && (
        <section className="card mt8" style={{ padding: '18px 20px', borderRadius: 28 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>Séries sur 7 jours</h2>
          <ul className="stack mt12" style={{ gap: 10 }}>
            {groups.map((g) => (
              <li key={g} style={{ display: 'grid', gridTemplateColumns: '92px 1fr 24px', alignItems: 'center', gap: 10, fontSize: 13 }}>
                <span className="muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g}</span>
                <div className="hbar">
                  <div style={{ width: `${(perGroup.get(g)! / maxGroup) * 100}%` }} />
                </div>
                <span style={{ textAlign: 'right', fontWeight: 600 }}>{perGroup.get(g)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="tile">
      <dt className="xsmall muted">{label}</dt>
      <dd style={{ margin: '6px 0 0', fontSize: 17, fontWeight: 700, whiteSpace: 'nowrap' }}>{value}</dd>
    </div>
  );
}
