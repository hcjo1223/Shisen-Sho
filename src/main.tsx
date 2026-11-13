import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import '@astryxdesign/core/reset.css';
import App from './App';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root was not found');
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
