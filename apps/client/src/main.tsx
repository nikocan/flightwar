import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

// iOS Safari: block pinch-zoom / double-tap zoom gestures that would break touch controls.
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
}
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

createRoot(document.getElementById('root')!).render(<App />);
