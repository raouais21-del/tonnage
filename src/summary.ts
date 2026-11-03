import type { Exercise } from './catalog';
import type { Session } from './db';
import { fmtNum } from './utils';

export interface SummarySet {
  weight: number;
  reps: number;
  rir: number | null;
}

export interface Summary {
  name: string;
  date: Date;
  durationMs: number;
  sets: number;
  reps: number;
  tonnage: number;
  exercises: { name: string; group: string; sets: SummarySet[] }[];
}

/** Récapitulatif d'une séance : seules les séries validées comptent. */
export function summarize(session: Session, byId: Map<string, Exercise>): Summary {
  const exercises = session.exercises
    .map((e) => ({
      name: byId.get(e.exerciseId)?.name ?? 'Exercice supprimé',
      group: byId.get(e.exerciseId)?.group ?? '',
      sets: e.sets.filter((s) => s.done).map((s) => ({ weight: s.weight, reps: s.reps, rir: s.rir ?? null })),
    }))
    .filter((e) => e.sets.length);
  const all = exercises.flatMap((e) => e.sets);
  return {
    name: session.workoutName,
    date: new Date(session.startedAt),
    durationMs: (session.finishedAt ?? Date.now()) - session.startedAt,
    sets: all.length,
    reps: all.reduce((t, s) => t + s.reps, 0),
    tonnage: all.reduce((t, s) => t + s.weight * s.reps, 0),
    exercises,
  };
}

export function fmtDuration(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
}

export const fmtTonnage = (kg: number) => (kg >= 1000 ? `${fmtNum(Math.round(kg / 100) / 10)} t` : `${fmtNum(Math.round(kg))} kg`);

export const fmtSet = (s: SummarySet) => `${fmtNum(s.weight)} kg × ${s.reps}`;

export const fmtSummaryDate = (d: Date) => {
  const s = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// ---------- Image partageable (1080 px de large, format story) ----------

const C = {
  bg: '#0A0A0A',
  s1: '#161616',
  s2: '#1F1F1F',
  text: '#F4F5F7',
  muted: '#9A9EA8',
  gold: '#D4AF37',
  onGold: '#0A0A0A',
};
const FONT = "'Inter Tight Variable', 'Inter Tight', -apple-system, sans-serif";
const W = 1080;
const PAD = 72;
const ROW = 64;

function fitText(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
}

export async function renderSummaryImage(sum: Summary): Promise<Blob> {
  await Promise.all([document.fonts.load(`700 40px ${FONT}`), document.fonts.load(`500 40px ${FONT}`)]).catch(() => {});

  const headerH = 640;
  const exH = sum.exercises.reduce((h, e) => h + 132 + e.sets.length * ROW + 24, 0);
  const H = Math.max(1350, headerH + exH + 140);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';

  // En-tête
  ctx.fillStyle = C.gold;
  ctx.font = `700 30px ${FONT}`;
  ctx.letterSpacing = '6px';
  ctx.fillText('FORGEU', PAD, 120);
  ctx.letterSpacing = '0px';
  ctx.fillStyle = C.muted;
  ctx.font = `500 32px ${FONT}`;
  ctx.fillText(fmtSummaryDate(sum.date), PAD, 180);
  ctx.fillStyle = C.text;
  ctx.font = `700 110px ${FONT}`;
  ctx.fillText(fitText(ctx, sum.name, W - 2 * PAD), PAD, 300);

  // Carte dorée de statistiques (2 × 2)
  const cardY = 350;
  const cardH = 240;
  ctx.fillStyle = C.gold;
  ctx.beginPath();
  ctx.roundRect(PAD, cardY, W - 2 * PAD, cardH, 40);
  ctx.fill();
  const stats: [string, string][] = [
    ['Durée', fmtDuration(sum.durationMs)],
    ['Tonnage', fmtTonnage(sum.tonnage)],
    ['Séries', String(sum.sets)],
    ['Répétitions', String(sum.reps)],
  ];
  const colW = (W - 2 * PAD) / 2;
  stats.forEach(([label, value], i) => {
    const x = PAD + 48 + (i % 2) * colW;
    const y = cardY + 72 + Math.floor(i / 2) * 104;
    ctx.fillStyle = 'rgba(10,10,10,0.6)';
    ctx.font = `600 26px ${FONT}`;
    ctx.fillText(label, x, y);
    ctx.fillStyle = C.onGold;
    ctx.font = `700 50px ${FONT}`;
    ctx.fillText(value, x, y + 54);
  });

  // Exercices
  let y = headerH;
  for (const e of sum.exercises) {
    const h = 108 + e.sets.length * ROW;
    ctx.fillStyle = C.s1;
    ctx.beginPath();
    ctx.roundRect(PAD, y, W - 2 * PAD, h, 36);
    ctx.fill();

    ctx.fillStyle = C.text;
    ctx.font = `700 40px ${FONT}`;
    ctx.fillText(fitText(ctx, e.name, W - 2 * PAD - 260), PAD + 40, y + 64);
    ctx.fillStyle = C.muted;
    ctx.font = `500 26px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(e.group, W - PAD - 40, y + 62);
    ctx.textAlign = 'left';

    e.sets.forEach((s, i) => {
      const ry = y + 96 + i * ROW;
      ctx.fillStyle = C.s2;
      ctx.beginPath();
      ctx.roundRect(PAD + 24, ry, W - 2 * PAD - 48, ROW - 10, 16);
      ctx.fill();
      const base = ry + 37;
      ctx.fillStyle = C.muted;
      ctx.font = `600 26px ${FONT}`;
      ctx.fillText(`Série ${i + 1}`, PAD + 52, base);
      ctx.fillStyle = C.text;
      ctx.font = `700 30px ${FONT}`;
      ctx.fillText(fmtSet(s), PAD + 260, base);
      if (s.rir !== null) {
        ctx.fillStyle = C.gold;
        ctx.font = `700 26px ${FONT}`;
        ctx.textAlign = 'right';
        ctx.fillText(`RIR ${s.rir === 5 ? '5+' : s.rir}`, W - PAD - 52, base);
        ctx.textAlign = 'left';
      }
    });
    y += h + 24;
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image impossible'))), 'image/png'),
  );
}
