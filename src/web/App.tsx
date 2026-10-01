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
  mainMenuItems,
  extrasMenuItems,
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
  extrasMenu,
} from './App.css';
import { Panel } from './App.Panel';
import { Learning } from './Learning';

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
  const [section, setSection] = useState<ShellSection>('Learn');
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [focusedSection, setFocusedSection] = useState(0);
  const [acknowledgedLocation, setAcknowledgedLocation] = useState<string | null>(null);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const firstGAt = useRef<number | null>(null);
  const interactive = startup.status === 'ready'
    && (startup.retention === 'persistent' || acknowledgedLocation === startup.location);

  const selectSection = useCallback((index: number) => {
    if (index === 1) {
      setExtrasOpen((open) => !open);
      setFocusedSection(1);
      return;
    }
    const nextSection = index === 0 ? 'Learn' : extrasMenuItems[index - 2];
    if (!nextSection) {
      return;
    }
    setSection(nextSection);
    setFocusedSection(index);
    if (nextSection === 'Learn') {
      setExtrasOpen(false);
    }
    buttons.current[index]?.focus();
  }, []);

  const moveFocus = useCallback((nextAction: NavigationAction) => {
    const count = mainMenuItems.length + (extrasOpen ? extrasMenuItems.length : 0);
    const next = nextFocus(focusedSection, nextAction, count);
    setFocusedSection(next);
    buttons.current[next]?.focus();
  }, [extrasOpen, focusedSection]);

  const handleKey = useCallback((event: KeyboardEvent) => {
    const menuTarget = event.target instanceof Element
      && event.target.closest('[data-app-navigation]') !== null;
    if (!interactive || (section === 'Learn' && !extrasOpen && !menuTarget)
      || isEditingTarget(event.target) || event.isComposing) {
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
        setExtrasOpen(true);
        setSection('Help');
        setFocusedSection(4);
        requestAnimationFrame(() => { buttons.current[4]?.focus(); });

        break;
      }
      case 'back': {
        if (extrasOpen) {
          setExtrasOpen(false);
          setFocusedSection(1);
          buttons.current[1]?.focus();
        } else {
          selectSection(0);
        }

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
  }, [interactive, extrasOpen, focusedSection, moveFocus, section, selectSection]);

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
      <nav aria-label="Application navigation" data-app-navigation>
        <div className={tabList}>
          <button
            ref={(element) => { buttons.current[0] = element; }}
            aria-pressed={section === 'Learn'}
            className={tab}
            type="button"
            onFocus={() => { setFocusedSection(0); }}
            onClick={() => { selectSection(0); }}
          >
            Learn
          </button>
          <button
            ref={(element) => { buttons.current[1] = element; }}
            aria-expanded={extrasOpen}
            aria-controls="extras-menu"
            className={tab}
            type="button"
            onFocus={() => { setFocusedSection(1); }}
            onClick={() => { selectSection(1); }}
          >
            Extras
          </button>
        </div>
        {extrasOpen && (
          <nav id="extras-menu" aria-label="Extras" className={extrasMenu}>
            {extrasMenuItems.map((item, index) => (
              <button
                ref={(element) => { buttons.current[index + 2] = element; }}
                aria-pressed={section === item}
                className={tab}
                key={item}
                type="button"
                onFocus={() => { setFocusedSection(index + 2); }}
                onClick={() => { selectSection(index + 2); }}
              >
                {item}
              </button>
            ))}
          </nav>
        )}
      </nav>
      {pending && <output className={status}>Saving progress…</output>}
      {saveError && <p className={error} role="alert">{saveError}</p>}
      {section === 'Learn'
        ? <Learning keyboardEnabled={!extrasOpen} onExit={() => { selectSection(0); }} />
        : <Panel section={section} startup={startup} bankInfo={bankInfo} />}
    </main>
  );
}
