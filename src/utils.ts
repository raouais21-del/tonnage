export const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
export const DAYS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** 0 = lundi … 6 = dimanche */
export const dayIndex = (d: Date) => (d.getDay() + 6) % 7;

const pad = (n: number) => String(n).padStart(2, '0');
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function weekDates(ref = new Date()): Date[] {
  const start = new Date(ref);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - dayIndex(start));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export const fmtNum = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });

export const fmtLongDate = (d: Date) => {
  const s = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const fmtClock = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
};

export const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

/** Disques à mettre de chaque côté d'une barre (méthode gloutonne). */
export function platesPerSide(total: number, bar = 20): number[] | null {
  if (total < bar) return null;
  let rest = (total - bar) / 2;
  const out: number[] = [];
  for (const p of PLATES) {
    while (rest >= p - 1e-9) {
      out.push(p);
      rest -= p;
    }
  }
  return rest < 1e-6 ? out : null;
}

/** 1RM estimé (Epley). */
export const estimate1RM = (weight: number, reps: number) => (reps <= 1 ? weight : weight * (1 + reps / 30));
