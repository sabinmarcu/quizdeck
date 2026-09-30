import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { main } from './main.css';

const rootElement = document.querySelector('#root');

if (!rootElement) {
  throw new Error('Unable to find the application root.');
}

createRoot(rootElement).render(
  <StrictMode>
    <main className={main}>
      <h1>Claude certification</h1>
      <p>React web renderer ready.</p>
    </main>
  </StrictMode>,
);
