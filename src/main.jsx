import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import './core/i18n';
import './core/install'; // catches the Android install prompt early (F11)
import './index.css';

if (import.meta.env.DEV) {
  import('./core/devtools').then((m) => m.installDevtools());
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
