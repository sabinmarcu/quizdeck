import {
  useAtomValue,
  useSetAtom,
} from 'jotai';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  actionErrorAtom,
  pendingAtom,
  setInfoAtom,
  startupAtom,
} from '../state/application';
import {
  leavePracticeAtom,
  pausePracticeAtom,
  practiceNoticeAtom,
} from '../state/practice';
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
import { LoadQuestionSet } from './LoadQuestionSet';
import { Practice } from './Practice';

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
  const setInfo = useAtomValue(setInfoAtom);
  const pending = useAtomValue(pendingAtom);
  const saveError = useAtomValue(actionErrorAtom);
  const practiceNotice = useAtomValue(practiceNoticeAtom);
  const leavePractice = useSetAtom(leavePracticeAtom);
  const pausePractice = useSetAtom(pausePracticeAtom);
  const [section, setSection] = useState<ShellSection>('Learn');
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [focusedSection, setFocusedSection] = useState(0);
  const [acknowledgedLocation, setAcknowledgedLocation] = useState<string | null>(null);
  const [loadBusy, setLoadBusy] = useState(false);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const fileInputReference = useRef<HTMLInputElement>(null);
  const firstGAt = useRef<number | null>(null);
  const storageInteractive = startup.status === 'ready'
    && (startup.retention === 'persistent' || acknowledgedLocation === startup.location);
  const interactive = storageInteractive && !loadBusy;

  const selectSection = useCallback(async (index: number) => {
    const extrasIndex = mainMenuItems.indexOf('Extras');
    if (index === extrasIndex) {
      if (!extrasOpen && section === 'Practice' && !(await pausePractice())) {
        return;
      }
      setExtrasOpen((open) => !open);
      setFocusedSection(extrasIndex);
      return;
    }
    const practiceIndex = mainMenuItems.indexOf('Practice');
    const nextSection = index < mainMenuItems.length
      ? mainMenuItems[index]
      : extrasMenuItems[index - mainMenuItems.length];
    if (!nextSection || nextSection === 'Extras') {
      return;
    }
    if (section === 'Practice' && index !== practiceIndex && !(await leavePractice())) {
      return;
    }
    setSection(nextSection);
    setExtrasOpen(false);
    setFocusedSection(index);
    requestAnimationFrame(() => { buttons.current[index]?.focus(); });
  }, [extrasOpen, leavePractice, pausePractice, section]);

  const moveFocus = useCallback((nextAction: NavigationAction) => {
    const count = mainMenuItems.length + (extrasOpen ? extrasMenuItems.length : 0);
    const next = nextFocus(focusedSection, nextAction, count);
    setFocusedSection(next);
    buttons.current[next]?.focus();
  }, [extrasOpen, focusedSection]);

  const handleKey = useCallback(async (event: KeyboardEvent) => {
    const menuTarget = event.target instanceof Element
      && event.target.closest('[data-app-navigation]') !== null;
    if (!interactive || (section === 'Practice' && !extrasOpen && !menuTarget)
      || (section === 'Learn' && !extrasOpen && !menuTarget)
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
        if (section === 'Practice' && !(await leavePractice())) {
          return;
        }
        const helpIndex = mainMenuItems.length + extrasMenuItems.indexOf('Help');
        setExtrasOpen(true);
        setSection('Help');
        setFocusedSection(helpIndex);
        requestAnimationFrame(() => { buttons.current[helpIndex]?.focus(); });
        break;
      }
      case 'back': {
        if (extrasOpen) {
          setExtrasOpen(false);
          const extrasIndex = mainMenuItems.indexOf('Extras');
          setFocusedSection(extrasIndex);
          buttons.current[extrasIndex]?.focus();
        } else {
          await selectSection(mainMenuItems.indexOf('Learn'));
        }
        break;
      }
      case 'activate': {
        await selectSection(focusedSection);
        break;
      }
      default: {
        moveFocus(nextAction);
      }
    }
  }, [extrasOpen, focusedSection, interactive, leavePractice, moveFocus, section, selectSection]);

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); };
  }, [handleKey]);

  return (
    <LoadQuestionSet
      ready={startup.status === 'ready'}
      unavailableMessage={startup.status === 'error'
        ? 'Question sets cannot be loaded while local storage is unavailable.'
        : 'Question sets can be loaded after local storage is ready.'}
      onBusyChange={setLoadBusy}
      inputRef={fileInputReference}
      onLoaded={() => {
        setExtrasOpen(false);
        setFocusedSection(mainMenuItems.indexOf('Learn'));
        setSection('Learn');
        requestAnimationFrame(() => { buttons.current[mainMenuItems.indexOf('Learn')]?.focus(); });
      }}
    >
      {({ busy }) => {
        if (startup.status === 'loading') {
          return (
            <main className={shell} aria-busy="true">
              <h1>Quizdeck</h1>
              <output className={status}>Opening your local progress storage…</output>
            </main>
          );
        }
        if (startup.status === 'error') {
          return (
            <main className={shell}>
              <h1>Quizdeck</h1>
              <section className={error} role="alert" aria-labelledby="storage-error">
                <h2 id="storage-error">Local progress storage could not be opened</h2>
                <p className={hash}>{startup.message}</p>
                <button className={action} type="button" onClick={onReload}>Reload storage</button>
              </section>
            </main>
          );
        }
        if (!setInfo) {
          throw new Error('Ready storage must include validated question-set information.');
        }
        if (!storageInteractive) {
          return (
            <main className={shell}>
              <h1>Quizdeck</h1>
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
              <h1 className={title}>Quizdeck</h1>
              <p className={subtitle}>Study a question set with saved local progress.</p>
            </header>
            <nav aria-label="Application navigation" data-app-navigation>
              <div className={tabList}>
                {mainMenuItems.map((item, index) => {
                  const isExtras = item === 'Extras';
                  return (
                    <button
                      ref={(element) => { buttons.current[index] = element; }}
                      aria-controls={isExtras ? 'extras-menu' : undefined}
                      aria-expanded={isExtras ? extrasOpen : undefined}
                      aria-pressed={isExtras ? extrasOpen : section === item}
                      className={tab}
                      disabled={busy}
                      key={item}
                      type="button"
                      onFocus={() => { setFocusedSection(index); }}
                      onClick={async () => { await selectSection(index); }}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
              {extrasOpen && (
                <nav id="extras-menu" aria-label="Extras" className={extrasMenu}>
                  {extrasMenuItems.map((item, index) => {
                    const buttonIndex = mainMenuItems.length + index;
                    return (
                      <button
                        ref={(element) => { buttons.current[buttonIndex] = element; }}
                        aria-pressed={section === item}
                        className={tab}
                        disabled={busy}
                        key={item}
                        type="button"
                        onFocus={() => { setFocusedSection(buttonIndex); }}
                        onClick={async () => { await selectSection(buttonIndex); }}
                      >
                        {item}
                      </button>
                    );
                  })}
                </nav>
              )}
            </nav>
            {pending && <output className={status}>Saving progress…</output>}
            {practiceNotice && <output className={notice}>{practiceNotice}</output>}
            {saveError && section !== 'Practice' && <p className={error} role="alert">{saveError}</p>}
            {section === 'Learn' && (
              <Learning
                key={`${startup.set.contentHash}:${startup.set.loadedAt}`}
                keyboardEnabled={!extrasOpen && !busy}
                onExit={async () => { await selectSection(mainMenuItems.indexOf('Learn')); }}
              />
            )}
            {section === 'Practice' && (
              <Practice
                key={`${startup.set.contentHash}:${startup.set.loadedAt}`}
                keyboardEnabled={!extrasOpen && !busy}
                onExit={async () => { await selectSection(mainMenuItems.indexOf('Learn')); }}
              />
            )}
            {section !== 'Learn' && section !== 'Practice' && (
              <Panel
                section={section}
                startup={startup}
                setInfo={setInfo}
                loadQuestionSetControl={(
                  <button
                    className={action}
                    disabled={busy}
                    type="button"
                    onClick={() => { fileInputReference.current?.click(); }}
                  >
                    Load question set
                  </button>
                )}
              />
            )}
          </main>
        );
      }}
    </LoadQuestionSet>
  );
}
