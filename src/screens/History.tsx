import { finishedSessions, useExercises, useSessions } from '../db';
import { fmtDuration, fmtTonnage, summarize } from '../summary';
import { IconChevron } from '../components/Icons';
import { Screen } from '../components/Screen';

interface Props {
  onOpen: (sessionId: number) => void;
}

const monthLabel = (d: Date) => {
  const s = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Toutes les séances terminées, de la plus récente à la plus ancienne, groupées par mois. */
export function History({ onOpen }: Props) {
  const sessions = useSessions();
  const { byId } = useExercises();
  if (!sessions) return null;

  const done = finishedSessions(sessions).reverse();
  const months: { label: string; items: typeof done }[] = [];
  for (const s of done) {
    const label = monthLabel(new Date(s.startedAt));
    const last = months[months.length - 1];
    if (last?.label === label) last.items.push(s);
    else months.push({ label, items: [s] });
  }

  return (
    <Screen id="scroll-history" title="Historique">
      {done.length === 0 ? (
        <div className="empty mt24">
          <p className="h2">Aucune séance pour l’instant</p>
          <p className="small">Tes séances terminées apparaîtront ici, avec leur date.</p>
        </div>
      ) : (
        <>
          <p className="small muted">
            {done.length} séance{done.length > 1 ? 's' : ''} terminée{done.length > 1 ? 's' : ''}
          </p>
          {months.map((m) => (
            <section key={m.label}>
              <div className="group-head">
                <h2 className="h2">{m.label}</h2>
                <span className="small muted">{m.items.length}</span>
              </div>
              <ul className="stack">
                {m.items.map((s) => {
                  const sum = summarize(s, byId);
                  const d = new Date(s.startedAt);
                  return (
                    <li key={s.id}>
                      <button type="button" className="list-item" onClick={() => onOpen(s.id!)}>
                        <span className="date-badge" aria-hidden="true">
                          <span className="date-day">{d.getDate()}</span>
                          <span className="date-wd">{d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}</span>
                        </span>
                        <span className="grow">
                          <span className="item-title" style={{ display: 'block' }}>{s.workoutName}</span>
                          <span className="item-sub" style={{ display: 'block' }}>
                            {d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} ·{' '}
                            {d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="item-sub" style={{ display: 'block' }}>
                            {fmtDuration(sum.durationMs)} · {sum.sets} séries · {fmtTonnage(sum.tonnage)}
                          </span>
                        </span>
                        <span className="muted"><IconChevron size={18} /></span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </>
      )}
    </Screen>
  );
}
