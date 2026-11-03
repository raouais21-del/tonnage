import { useState } from 'react';
import { IconChart, IconHistory, IconHome, IconList } from './components/Icons';
import { startSession, type Workout } from './db';
import { haptic } from './haptics';
import { History } from './screens/History';
import { Home } from './screens/Home';
import { Program } from './screens/Program';
import { Progress } from './screens/Progress';
import { SessionScreen } from './screens/Session';
import { SummaryScreen } from './screens/Summary';
import { Intro } from './components/Intro';

type Tab = 'home' | 'progress' | 'history' | 'program';

const TABS: { id: Tab; label: string; Icon: typeof IconHome }[] = [
  { id: 'home', label: 'Accueil', Icon: IconHome },
  { id: 'progress', label: 'Progrès', Icon: IconChart },
  { id: 'history', label: 'Historique', Icon: IconHistory },
  { id: 'program', label: 'Programme', Icon: IconList },
];

export function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [summaryId, setSummaryId] = useState<number | null>(null);

  const launch = async (workout: Workout) => {
    haptic();
    setSessionId(await startSession(workout));
  };

  const selectTab = (id: Tab) => {
    haptic();
    // Toucher l'onglet déjà ouvert remonte en haut, comme sur iOS.
    if (id === tab) document.getElementById(`scroll-${id}`)?.scrollTo({ top: 0, behavior: 'smooth' });
    setTab(id);
  };

  const openSummary = (id: number) => {
    haptic();
    setSummaryId(id);
  };

  // Les onglets restent montés : chacun garde sa position de défilement et son état.
  return (
    <>
      <div className="tab-pane" aria-hidden={tab !== 'home'}>
        <Home
          onStart={launch}
          onResume={setSessionId}
          onOpenProgram={() => setTab('program')}
          onShowSummary={openSummary}
        />
      </div>
      <div className="tab-pane" aria-hidden={tab !== 'progress'}>
        <Progress />
      </div>
      <div className="tab-pane" aria-hidden={tab !== 'history'}>
        <History onOpen={openSummary} />
      </div>
      <div className="tab-pane" aria-hidden={tab !== 'program'}>
        <Program />
      </div>

      <nav className="tabbar" aria-label="Navigation principale">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            aria-current={tab === id ? 'page' : undefined}
            aria-label={label}
            onClick={() => selectTab(id)}
          >
            <Icon size={tab === id ? 18 : 20} />
            {tab === id && label}
          </button>
        ))}
      </nav>

      {sessionId !== null && <SessionScreen id={sessionId} onClose={() => setSessionId(null)} />}
      {summaryId !== null && <SummaryScreen id={summaryId} onClose={() => setSummaryId(null)} />}
      <Intro />
    </>
  );
}
