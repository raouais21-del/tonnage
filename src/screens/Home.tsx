import { useRef, useState } from 'react';
import {
  activeSession,
  exportData,
  finishedSessions,
  importData,
  lastPerformance,
  useExercises,
  useSessions,
  useWorkouts,
  type Session,
  type Workout,
} from '../db';
import { DAYS, DAYS_SHORT, dayIndex, fmtLongDate, fmtNum, isoDate, weekDates } from '../utils';
import { IconArrow, IconCheck, IconSettings } from '../components/Icons';
import { Screen } from '../components/Screen';
import { Sheet } from '../components/Sheet';

interface Props {
  onStart: (w: Workout) => void;
  onResume: (sessionId: number) => void;
  onOpenProgram: () => void;
  onShowSummary: (sessionId: number) => void;
}

const doneSets = (s: Session) => s.exercises.flatMap((e) => e.sets.filter((x) => x.done));
const tonnage = (s: Session) => doneSets(s).reduce((t, x) => t + x.weight * x.reps, 0);
const estMinutes = (w: Workout) => Math.round(w.items.reduce((t, it) => t + it.sets * (it.rest + 45), 0) / 60);

export function Home({ onStart, onResume, onOpenProgram, onShowSummary }: Props) {
  const workouts = useWorkouts();
  const sessions = useSessions();
  const { byId } = useExercises();
  const [picker, setPicker] = useState(false);
  const [settings, setSettings] = useState(false);

  if (!workouts || !sessions) return null;

  const now = new Date();
  const today = dayIndex(now);
  const week = weekDates(now);
  const weekIso = week.map(isoDate);
  const done = finishedSessions(sessions);
  const doneDates = new Set(done.map((s) => s.date));
  const running = activeSession(sessions);
  const todayWorkout = workouts.find((w) => w.days.includes(today));
  const doneToday = done.filter((s) => s.date === isoDate(now));
  const planned = new Set(workouts.flatMap((w) => w.days));

  let next: { workout: Workout; day: number } | null = null;
  for (let k = 1; k <= 7 && !next; k++) {
    const d = (today + k) % 7;
    const w = workouts.find((x) => x.days.includes(d));
    if (w) next = { workout: w, day: d };
  }

  const shown = todayWorkout ?? next?.workout;
  const weekSessions = done.filter((s) => weekIso.includes(s.date));
  const weekTonnage = weekSessions.reduce((t, s) => t + tonnage(s), 0);

  return (
    <Screen
      id="scroll-home"
      title="Bonjour"
      eyebrow={fmtLongDate(now)}
      right={
        <button type="button" className="nav-btn" aria-label="Sauvegarde et réglages" onClick={() => setSettings(true)}>
          <IconSettings size={22} />
        </button>
      }
    >
      {showInstallHint && (
        <div className="tile mt8 row" style={{ alignItems: 'flex-start' }}>
          <p className="small grow">
            Pour l’utiliser comme une vraie app : dans Safari, touche <strong>Partager</strong> puis <strong>Sur l’écran d’accueil</strong>.
          </p>
        </div>
      )}

      <ul className="week mt16" aria-label="Cette semaine">
        {week.map((d, i) => {
          const iso = isoDate(d);
          const isDone = doneDates.has(iso);
          const cls = isDone ? 'done' : i === today ? 'today' : '';
          return (
            <li key={iso}>
              <span className="xsmall muted">{DAYS_SHORT[i]}</span>
              <span
                className={`day-dot ${cls}${planned.has(i) && !isDone ? ' planned' : ''}`}
                aria-label={`${DAYS[i]} ${d.getDate()}${isDone ? ', séance faite' : planned.has(i) ? ', séance prévue' : ''}`}
              >
                {isDone ? <IconCheck size={16} /> : d.getDate()}
              </span>
            </li>
          );
        })}
      </ul>

      <section className="card-gold mt24 stack" style={{ gap: 14 }}>
        {running ? (
          <>
            <div className="between">
              <span className="small" style={{ fontWeight: 600 }}>Séance en cours</span>
              <span className="pill" style={{ background: 'rgba(10,10,10,0.12)', color: 'inherit' }}>
                {doneSets(running).length} série{doneSets(running).length > 1 ? 's' : ''} faite{doneSets(running).length > 1 ? 's' : ''}
              </span>
            </div>
            <h2 style={{ fontSize: 44, lineHeight: 1, fontWeight: 700, letterSpacing: -1.5 }}>{running.workoutName}</h2>
            <HeroButton label="Reprendre" onClick={() => onResume(running.id!)} />
          </>
        ) : doneToday.length ? (
          <>
            <span className="small" style={{ fontWeight: 600 }}>Séance terminée</span>
            <h2 style={{ fontSize: 44, lineHeight: 1, fontWeight: 700, letterSpacing: -1.5 }}>{doneToday[doneToday.length - 1].workoutName}</h2>
            <div className="row" style={{ gap: 16, fontSize: 14, fontWeight: 500 }}>
              <span>{doneSets(doneToday[doneToday.length - 1]).length} séries</span>
              <span>{fmtNum(Math.round(tonnage(doneToday[doneToday.length - 1])))} kg soulevés</span>
            </div>
            <HeroButton label="Voir le résumé" onClick={() => onShowSummary(doneToday[doneToday.length - 1].id!)} />
          </>
        ) : todayWorkout ? (
          <>
            <div className="between">
              <span className="small" style={{ fontWeight: 600 }}>Séance du jour</span>
            </div>
            <h2 style={{ fontSize: 44, lineHeight: 1, fontWeight: 700, letterSpacing: -1.5 }}>{todayWorkout.name}</h2>
            <div className="row" style={{ gap: 16, fontSize: 14, fontWeight: 500, flexWrap: 'wrap' }}>
              <span>{todayWorkout.items.length} exercices</span>
              <span>≈ {estMinutes(todayWorkout)} min</span>
              <span>{todayWorkout.items.reduce((t, it) => t + it.sets, 0)} séries</span>
            </div>
            <HeroButton label="Commencer" onClick={() => onStart(todayWorkout)} />
          </>
        ) : workouts.length === 0 ? (
          <>
            <span className="small" style={{ fontWeight: 600 }}>Bienvenue</span>
            <h2 style={{ fontSize: 36, lineHeight: 1.05, fontWeight: 700, letterSpacing: -1 }}>Crée ton programme</h2>
            <p className="small" style={{ fontWeight: 500 }}>Crée tes séances et associe-les à tes jours d’entraînement.</p>
            <HeroButton label="Aller au programme" onClick={onOpenProgram} />
          </>
        ) : (
          <>
            <span className="small" style={{ fontWeight: 600 }}>Jour de repos</span>
            <h2 style={{ fontSize: 44, lineHeight: 1, fontWeight: 700, letterSpacing: -1.5 }}>Repos</h2>
            {next && (
              <p className="small" style={{ fontWeight: 500 }}>
                Prochaine séance : {next.workout.name}, {DAYS[next.day].toLowerCase()}
              </p>
            )}
            <HeroButton label="S’entraîner quand même" onClick={() => setPicker(true)} />
          </>
        )}
      </section>

      <div className="mt12" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        <div className="tile">
          <p className="xsmall muted">Séances cette semaine</p>
          <p style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
            {weekSessions.length}
            <span className="muted" style={{ fontSize: 15, fontWeight: 500 }}> / {planned.size}</span>
          </p>
        </div>
        <div className="tile">
          <p className="xsmall muted">Tonnage de la semaine</p>
          <p style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
            {fmtNum(Math.round(weekTonnage / 100) / 10)}
            <span className="muted" style={{ fontSize: 15, fontWeight: 500 }}> t</span>
          </p>
        </div>
      </div>

      {shown && shown.items.length > 0 && (
        <>
          <div className="between mt24">
            <h2 className="h2">{todayWorkout ? 'Au programme' : `Prochaine : ${shown.name}`}</h2>
            <button type="button" className="btn-ghost small" style={{ border: 0, background: 'none', padding: 8 }} onClick={onOpenProgram}>
              Modifier
            </button>
          </div>
          <ol className="stack mt8">
            {shown.items.map((it, i) => {
              const weight = lastPerformance(sessions, it.exerciseId)?.weight ?? it.weight;
              return (
                <li key={`${it.exerciseId}-${i}`} className="list-item">
                  <span className="badge-num">{i + 1}</span>
                  <span className="grow">
                    <span className="item-title" style={{ display: 'block' }}>{byId.get(it.exerciseId)?.name ?? 'Exercice supprimé'}</span>
                    <span className="item-sub" style={{ display: 'block' }}>
                      {it.sets} × {it.reps}
                      {weight > 0 ? ` · ${fmtNum(weight)} kg` : ''}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </>
      )}

      <Sheet open={picker} onClose={() => setPicker(false)} title="Choisir une séance">
        <ul className="stack">
          {workouts.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                className="list-item"
                style={{ minHeight: 56, padding: '0 16px' }}
                onClick={() => {
                  setPicker(false);
                  onStart(w);
                }}
              >
                <span className="grow item-title">{w.name}</span>
                <span className="small muted">{w.items.length} exos</span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>

      <SettingsSheet open={settings} onClose={() => setSettings(false)} />
    </Screen>
  );
}

const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
const showInstallHint = isIOS && !isStandalone;

function HeroButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="btn btn-dark btn-block" style={{ justifyContent: 'space-between', padding: '0 8px 0 22px' }} onClick={onClick}>
      {label}
      <span className="icon-btn gold" style={{ width: 40, height: 40 }}>
        <IconArrow size={18} />
      </span>
    </button>
  );
}

function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');

  const doExport = async () => {
    const json = await exportData();
    const name = `forgeu-${isoDate(new Date())}.json`;
    const file = new File([json], name, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Sauvegarde ForgeU' }).catch(() => {});
    } else {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    }
    setMessage('Sauvegarde exportée.');
  };

  const doImport = async (file: File) => {
    try {
      await importData(await file.text());
      setMessage('Données restaurées.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Import impossible.');
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Sauvegarde">
      <p className="small muted">
        Tes données restent sur ce téléphone. Exporte une sauvegarde de temps en temps (dans Fichiers ou iCloud Drive) pour ne rien perdre.
      </p>
      <div className="stack mt16">
        <button type="button" className="btn btn-gold btn-block" onClick={doExport}>Exporter mes données</button>
        <button type="button" className="btn btn-soft btn-block" style={{ background: 'var(--s3)' }} onClick={() => fileRef.current?.click()}>
          Restaurer une sauvegarde
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) doImport(f);
            e.target.value = '';
          }}
        />
        <p className="xsmall muted">La restauration remplace toutes les données actuelles.</p>
        {message && <p className="small" role="status">{message}</p>}
      </div>
    </Sheet>
  );
}
