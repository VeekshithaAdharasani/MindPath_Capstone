import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Automatically handle Vite dynamic import / chunk loading errors after new production deployments
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    console.warn('New deployment detected, reloading to fetch latest assets...', event);
    window.location.reload();
  });

  window.addEventListener('error', (event) => {
    const msg = event?.message || '';
    if (
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Importing a module script failed') ||
      msg.includes('error loading dynamically imported module')
    ) {
      console.warn('Dynamic chunk load failure, reloading current page...', msg);
      window.location.reload();
    }
  });

  // Prevent accidental image dragging / ghosting across entire application
  window.addEventListener(
    'dragstart',
    (e) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'IMG' ||
          target.closest('img') ||
          target.tagName === 'A')
      ) {
        e.preventDefault();
        return false;
      }
    },
    { capture: true }
  );
}

createRoot(document.getElementById('root')!).render(<App />);
