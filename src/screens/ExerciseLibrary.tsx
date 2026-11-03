import { useMemo, useState } from 'react';
import { GROUPS, normalize, slugify, type Group } from '../catalog';
import { db, useExercises } from '../db';
import { IconCheck, IconPlus, IconSearch, IconTrash } from '../components/Icons';
import { Sheet } from '../components/Sheet';

interface Props {
  /** En mode sélection : ids cochés et bascule. Sinon, simple consultation. */
  selected?: Set<string>;
  onToggle?: (id: string) => void;
}

export function ExerciseLibrary({ selected, onToggle }: Props) {
  const { list } = useExercises();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<Group | 'Tous' | 'Perso'>('Tous');
  const [adding, setAdding] = useState(false);
  const picking = !!onToggle;

  const sections = useMemo(() => {
    const q = normalize(query.trim());
    const filtered = list.filter(
      (e) =>
        (group === 'Tous' || (group === 'Perso' ? e.custom : e.group === group)) &&
        (!q || normalize(e.name).includes(q)),
    );
    return GROUPS.map((g) => ({
      group: g,
      items: filtered.filter((e) => e.group === g).sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    })).filter((s) => s.items.length);
  }, [list, query, group]);

  const total = sections.reduce((n, s) => n + s.items.length, 0);

  return (
    <div>
      <div className="row">
        <label className="grow" style={{ position: 'relative' }}>
          <span className="sr-only">Rechercher un exercice</span>
          <span className="muted" style={{ position: 'absolute', left: 16, top: 16 }}>
            <IconSearch />
          </span>
          <input
            className="input"
            style={{ paddingLeft: 46 }}
            type="search"
            placeholder={`Rechercher (${list.length})`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <button type="button" className="icon-btn gold" style={{ width: 52, height: 52, borderRadius: 16 }} aria-label="Ajouter un exercice" onClick={() => setAdding(true)}>
          <IconPlus />
        </button>
      </div>

      <div className="chips mt12">
        {(['Tous', ...GROUPS, 'Perso'] as const).map((g) => (
          <button key={g} type="button" className="chip" aria-pressed={group === g} onClick={() => setGroup(g)}>
            {g === 'Perso' ? 'Mes exercices' : g}
          </button>
        ))}
      </div>

      {total === 0 && (
        <div className="empty">
          <p className="h2">Aucun exercice trouvé</p>
          <p className="small">Ajoute-le avec le bouton +.</p>
        </div>
      )}

      {sections.map(({ group: g, items }) => (
        <section key={g}>
          <div className="group-head">
            <h3 className="h2">{g}</h3>
            <span className="small muted">{items.length}</span>
          </div>
          <ul className="stack" style={{ gap: 6 }}>
            {items.map((e) => {
              const on = selected?.has(e.id) ?? false;
              return (
                <li key={e.id}>
                  {picking ? (
                    <button type="button" className="ex-row" aria-pressed={on} onClick={() => onToggle!(e.id)}>
                      <span className="grow">{e.name}</span>
                      {e.custom && <span className="pill">Perso</span>}
                      <span className={`check${on ? ' on' : ''}`}>{on && <IconCheck size={13} />}</span>
                    </button>
                  ) : (
                    <div className="ex-row">
                      <span className="grow">{e.name}</span>
                      {e.custom && (
                        <>
                          <span className="pill">Perso</span>
                          <button type="button" className="icon-btn soft" aria-label={`Supprimer ${e.name}`} onClick={() => db.customExercises.delete(e.id)}>
                            <IconTrash size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <AddExerciseSheet
        open={adding}
        defaultGroup={group === 'Tous' || group === 'Perso' ? 'Pectoraux' : group}
        defaultName={query.trim()}
        onClose={() => setAdding(false)}
        onAdded={(id) => {
          setQuery('');
          if (picking && !selected?.has(id)) onToggle!(id);
        }}
      />
    </div>
  );
}

function AddExerciseSheet({
  open,
  defaultGroup,
  defaultName,
  onClose,
  onAdded,
}: {
  open: boolean;
  defaultGroup: Group;
  defaultName: string;
  onClose: () => void;
  onAdded: (id: string) => void;
}) {
  const { byId } = useExercises();
  const [name, setName] = useState('');
  const [group, setGroup] = useState<Group>(defaultGroup);
  const [error, setError] = useState('');

  // Pré-remplit à chaque ouverture avec la recherche et le groupe en cours.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(defaultName);
      setGroup(defaultGroup);
      setError('');
    }
  }

  const save = async () => {
    const clean = name.trim();
    if (!clean) return setError('Donne un nom à l’exercice.');
    const id = `perso-${slugify(clean)}`;
    if (byId.has(id) || byId.has(slugify(clean))) return setError('Cet exercice existe déjà.');
    await db.customExercises.add({ id, name: clean, group, custom: true });
    onAdded(id);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Nouvel exercice">
      <div className="stack" style={{ gap: 14 }}>
        <div className="field">
          <label htmlFor="ex-name">Nom</label>
          <input id="ex-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. : Rowing landmine" autoFocus />
        </div>
        <div className="field">
          <label htmlFor="ex-group">Partie du corps</label>
          <select id="ex-group" className="input" value={group} onChange={(e) => setGroup(e.target.value as Group)} style={{ background: 'var(--s2)' }}>
            {GROUPS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        {error && <p className="small" style={{ color: 'var(--danger)' }} role="alert">{error}</p>}
        <button type="button" className="btn btn-gold btn-block" onClick={save}>Ajouter l’exercice</button>
      </div>
    </Sheet>
  );
}
