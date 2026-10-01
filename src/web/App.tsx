import { useAtomValue } from 'jotai';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  actionErrorAtom,
  bankInfoAtom,
  pendingAtom,
  startupAtom,
} from '../state/application';
import {
  navigationAction,
  nextFocus,
  shellSections,
} from '../state/navigation';
import type {
  NavigationAction,
  ShellSection,
} from '../state/navigation';
import {
  shell,
  status,
  error,
  hash,
  action,
  notice,
  header,
  title,
  subtitle,
  tabList,
  tab,
} from './App.css';
import { Panel } from './App.Panel';

function isEditingTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false;
  }
  return target.matches('input, textarea, select')
    || target.closest<HTMLElement>('[contenteditable]')?.isContentEditable === true;
}

export namespace App {
  export interface Props { onReload(): void }
}

export function App({ onReload }: App.Props) {
  const startup = useAtomValue(startupAtom);
  const bankInfo = useAtomValue(bankInfoAtom);
  const pending = useAtomValue(pendingAtom);
  const saveError = useAtomValue(actionErrorAtom);
  const [section, setSection] = useState<ShellSection>('Overview');
  const [focusedSection, setFocusedSection] = useState(0);
  const [acknowledgedLocation, setAcknowledgedLocation] = useState<string | null>(null);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const firstGAt = useRef<number | null>(null);
  const interactive = startup.status === 'ready'
    && (startup.retention === 'persistent' || acknowledgedLocation === startup.location);

  const selectSection = useCallback((index: number) => {
    setFocusedSection(index);
    setSection(shellSections[index] ?? 'Overview');
    buttons.current[index]?.focus();
  }, []);

  const moveFocus = useCallback((nextAction: NavigationAction) => {
    const next = nextFocus(focusedSection, nextAction);
    setFocusedSection(next);
    buttons.current[next]?.focus();
  }, [focusedSection]);

  const handleKey = useCallback((event: KeyboardEvent) => {
    if (!interactive || isEditingTarget(event.target) || event.isComposing) {
      return;
    }
    if (event.key === 'g' && !event.ctrlKey && !event.altKey && !event.metaKey) {
      const now = performance.now();
      if (firstGAt.current !== null && now - firstGAt.current < 800) {
        firstGAt.current = null;
        event.preventDefault();
        moveFocus('first');
      } else {
        firstGAt.current = now;
      }
      return;
    }
    firstGAt.current = null;
    const nextAction = navigationAction({
      key: event.key,
      ctrl: event.ctrlKey,
      alt: event.altKey,
      meta: event.metaKey,
    });
    if (!nextAction) {
      return;
    }
    if (nextAction === 'activate' && event.target instanceof HTMLButtonElement) {
      return;
    }
    event.preventDefault();
    switch (nextAction) {
      case 'pageDown':
      case 'pageUp': {
        window.scrollBy({
          top: (nextAction === 'pageDown' ? 1 : -1) * (window.innerHeight / 2),
          behavior: 'instant',
        });

        break;
      }
      case 'help': {
        selectSection(2);

        break;
      }
      case 'back': {
        selectSection(0);

        break;
      }
      case 'activate': {
        selectSection(focusedSection);

        break;
      }
      default: {
        moveFocus(nextAction);
      }
    }
  }, [interactive, focusedSection, moveFocus, selectSection]);

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); };
  }, [handleKey]);

  if (startup.status === 'loading') {
    return (
      <main className={shell} aria-busy="true">
        <h1>Claude certification</h1>
        <output className={status}>Opening your local progress storage…</output>
      </main>
    );
  }
  if (startup.status === 'error') {
    return (
      <main className={shell}>
        <h1>Claude certification</h1>
        <section className={error} role="alert" aria-labelledby="storage-error">
          <h2 id="storage-error">Local progress storage could not be opened</h2>
          <p className={hash}>{startup.message}</p>
          <button className={action} type="button" onClick={onReload}>Reload storage</button>
        </section>
      </main>
    );
  }
  if (!bankInfo) {
    throw new Error('Ready storage must include validated question bank information.');
  }
  if (!interactive) {
    return (
      <main className={shell}>
        <h1>Claude certification</h1>
        <section className={notice} role="alert" aria-labelledby="retention-title">
          <h2 id="retention-title">Progress may be cleared by this browser</h2>
          <p>
            Persistent retention was not granted or is unavailable. IndexedDB still saves your
            progress, but the browser can evict best-effort storage when space is needed.
          </p>
          <p className={hash}>{startup.location}</p>
          <button
            className={action}
            type="button"
            onClick={() => { setAcknowledgedLocation(startup.location); }}
          >
            I understand
          </button>
        </section>
      </main>
    );
  }
  return (
    <main className={shell}>
      <header className={header}>
        <h1 className={title}>Claude certification</h1>
        <p className={subtitle}>Local question data and saved progress.</p>
      </header>
      <nav className={tabList} aria-label="Application sections">
        {shellSections.map((item, index) => (
          <button
            ref={(element) => { buttons.current[index] = element; }}
            aria-pressed={section === item}
            className={tab}
            key={item}
            type="button"
            onFocus={() => { setFocusedSection(index); }}
            onClick={() => { selectSection(index); }}
          >
            {item}
          </button>
        ))}
      </nav>
      {pending && <output className={status}>Saving progress…</output>}
      {saveError && <p className={error} role="alert">{saveError}</p>}
      <Panel section={section} startup={startup} bankInfo={bankInfo} />
    </main>
  );
}
