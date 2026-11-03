import { useState } from 'react';
import { IconChart, IconHome, IconList } from './components/Icons';
import { startSession, type Workout } from './db';
import { Home } from './screens/Home';
import { Program } from './screens/Program';
import { Progress } from './screens/Progress';
import { SessionScreen } from './screens/Session';

type Tab = 'home' | 'progress' | 'program';

const TABS: { id: Tab; label: string; Icon: typeof IconHome }[] = [
  { id: 'home', label: 'Accueil', Icon: IconHome },
  { id: 'progress', label: 'Progrès', Icon: IconChart },
  { id: 'program', label: 'Programme', Icon: IconList },
];

export function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [sessionId, setSessionId] = useState<number | null>(null);

  const launch = async (workout: Workout) => setSessionId(await startSession(workout));

  return (
    <>
      {tab === 'home' && <Home onStart={launch} onResume={setSessionId} onOpenProgram={() => setTab('program')} />}
      {tab === 'progress' && <Progress />}
      {tab === 'program' && <Program />}

      <nav className="tabbar" aria-label="Navigation principale">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            aria-current={tab === id ? 'page' : undefined}
            aria-label={label}
            onClick={() => setTab(id)}
          >
            <Icon size={tab === id ? 18 : 20} />
            {tab === id && label}
          </button>
        ))}
      </nav>

      {sessionId !== null && <SessionScreen id={sessionId} onClose={() => setSessionId(null)} />}
    </>
  );
}
