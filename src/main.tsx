import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent accidental image dragging / ghosting across entire application
if (typeof window !== 'undefined') {
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
