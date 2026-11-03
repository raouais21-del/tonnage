import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource-variable/inter-tight';
import { App } from './App';
import './styles.css';

registerSW({ immediate: true });

// Demande au navigateur de ne pas effacer les données locales.
navigator.storage?.persist?.().catch(() => {});

// iOS n'applique :active que si la page écoute touchstart.
document.addEventListener('touchstart', () => {}, { passive: true });
// Pas de zoom au pincement, comme dans une app native.
document.addEventListener('gesturestart', (e) => e.preventDefault());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
