import { Provider } from 'jotai';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createAppSession } from '../state/application';
import './main.css';
import { App } from './App';
import { openIndexedStorage } from './IndexedDbProgressStorage';

const rootElement = document.querySelector('#root');
if (!rootElement) {
  throw new Error('Unable to find the application root.');
}
const session = createAppSession(openIndexedStorage);
session.start();
window.addEventListener('pagehide', () => { session.close(); });
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    document.location.reload();
  }
});
createRoot(rootElement).render(
  <StrictMode>
    <Provider store={session.store}>
      <App onReload={() => { session.start(); }} />
    </Provider>
  </StrictMode>,
);
