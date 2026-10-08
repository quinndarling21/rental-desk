import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router';
import App from './App';
import { CounterProvider } from './layout/CounterContext';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <HashRouter>
      <CounterProvider>
        <App />
      </CounterProvider>
    </HashRouter>
  </StrictMode>,
);
