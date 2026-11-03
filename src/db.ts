import Dexie, { type Table } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { BUILTIN_EXERCISES, type Exercise } from './catalog';
import { isoDate } from './utils';

export interface WorkoutItem {
  exerciseId: string;
  sets: number;
  reps: number;
  weight: number;
  rest: number; // secondes
}

/** Séance type du programme, associée à 0..n jours de la semaine (0 = lundi). */
export interface Workout {
  id?: number;
  name: string;
  days: number[];
  items: WorkoutItem[];
  createdAt: number;
}

export interface LoggedSet {
  weight: number;
  reps: number;
  done: boolean;
  /** Répétitions en réserve (0 = échec). Absent si non renseigné. */
  rir?: number | null;
}

export interface LoggedExercise {
  exerciseId: string;
  rest: number;
  sets: LoggedSet[];
}

/** Séance réalisée (ou en cours tant que finishedAt est null). */
export interface Session {
  id?: number;
  workoutId: number;
  workoutName: string;
  date: string; // AAAA-MM-JJ
  startedAt: number;
  finishedAt: number | null;
  exercises: LoggedExercise[];
}

class ForgeDB extends Dexie {
  workouts!: Table<Workout, number>;
  sessions!: Table<Session, number>;
  customExercises!: Table<Exercise, string>;

  constructor() {
    super('tonnage'); // nom d'origine conservé pour garder les données existantes
    this.version(1).stores({
      workouts: '++id',
      sessions: '++id, date, workoutId',
      customExercises: 'id, group',
    });
  }
}

export const db = new ForgeDB();

export function useWorkouts(): Workout[] | undefined {
  return useLiveQuery(() => db.workouts.toArray());
}

export function useSessions(): Session[] | undefined {
  return useLiveQuery(() => db.sessions.toArray());
}

export function useExercises(): { list: Exercise[]; byId: Map<string, Exercise> } {
  const custom = useLiveQuery(() => db.customExercises.toArray()) ?? [];
  const list = [...BUILTIN_EXERCISES, ...custom];
  return { list, byId: new Map(list.map((e) => [e.id, e])) };
}

export const finishedSessions = (sessions: Session[]) =>
  sessions.filter((s) => s.finishedAt !== null).sort((a, b) => a.startedAt - b.startedAt);

export const activeSession = (sessions: Session[]) => sessions.find((s) => s.finishedAt === null);

/** Meilleure série validée de la dernière séance où l'exercice a été fait. */
export function lastPerformance(sessions: Session[], exerciseId: string): LoggedSet | null {
  const past = finishedSessions(sessions).reverse();
  for (const s of past) {
    const done = s.exercises.find((e) => e.exerciseId === exerciseId)?.sets.filter((x) => x.done) ?? [];
    if (done.length) return done.reduce((best, x) => (x.weight > best.weight ? x : best));
  }
  return null;
}

export async function startSession(workout: Workout): Promise<number> {
  const all = await db.sessions.toArray();
  const running = activeSession(all);
  if (running) return running.id!;
  const exercises: LoggedExercise[] = workout.items.map((item) => {
    const weight = lastPerformance(all, item.exerciseId)?.weight ?? item.weight;
    return {
      exerciseId: item.exerciseId,
      rest: item.rest,
      sets: Array.from({ length: item.sets }, () => ({ weight, reps: item.reps, done: false })),
    };
  });
  return db.sessions.add({
    workoutId: workout.id!,
    workoutName: workout.name,
    date: isoDate(new Date()),
    startedAt: Date.now(),
    finishedAt: null,
    exercises,
  });
}

/** Un seul entraînement par jour : on retire les jours donnés des autres séances. */
export async function claimDays(workoutId: number, days: number[]) {
  await db.transaction('rw', db.workouts, async () => {
    const others = await db.workouts.filter((w) => w.id !== workoutId).toArray();
    for (const w of others) {
      const kept = w.days.filter((d) => !days.includes(d));
      if (kept.length !== w.days.length) await db.workouts.update(w.id!, { days: kept });
    }
  });
}

export async function exportData(): Promise<string> {
  const [workouts, sessions, customExercises] = await Promise.all([
    db.workouts.toArray(),
    db.sessions.toArray(),
    db.customExercises.toArray(),
  ]);
  return JSON.stringify({ app: 'forgeu', version: 1, exportedAt: new Date().toISOString(), workouts, sessions, customExercises });
}

export async function importData(json: string) {
  const data = JSON.parse(json);
  if (data?.app !== 'forgeu' && data?.app !== 'tonnage') throw new Error('Ce fichier ne vient pas de ForgeU.');
  await db.transaction('rw', db.workouts, db.sessions, db.customExercises, async () => {
    await Promise.all([db.workouts.clear(), db.sessions.clear(), db.customExercises.clear()]);
    await db.workouts.bulkAdd(data.workouts ?? []);
    await db.sessions.bulkAdd(data.sessions ?? []);
    await db.customExercises.bulkAdd(data.customExercises ?? []);
  });
}
