import { useAtomValue } from 'jotai';
import {
  Box,
  Text,
  useInput,
  useStdout,
} from 'ink';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import wrapAnsi from 'wrap-ansi';
import {
  actionErrorAtom,
  setInfoAtom,
  pendingAtom,
  startupAtom,
} from '../state/application';
import type {
  AppSession,
  SetInfo,
  Startup,
} from '../state/application';
import {
  navigationAction,
  nextFocus,
  mainMenuItems,
  extrasMenuItems,
} from '../state/navigation';
import type {
  ExtrasSection,
  ShellSection,
} from '../state/navigation';
import {
  practiceNoticeAtom,
} from '../state/practice';
import { InkLearning } from './InkLearning';
import { InkPractice } from './InkPractice';

interface ExtrasContent {
  section: ExtrasSection | null;
  startup: Startup;
  setInfo: SetInfo | null;
}

function sectionText({
  section, startup, setInfo,
}: ExtrasContent): string {
  if (section === 'Help') {
    return [
      'Keyboard help',
      'j/k, h/l, and arrows move menu focus. Enter opens the focused item.',
      'gg/Home focuses the first item; G/End focuses the last.',
      '? opens Extras > Help. Escape returns to the parent menu.',
      'Ctrl-d/u scrolls the content half a page.',
      'q or Ctrl-c exits. On a storage error, r reloads storage.',
    ].join('\n');
  }
  if (startup.status === 'loading') {
    return 'Opening persisted progress storage…';
  }
  if (startup.status === 'error') {
    return `Storage error: ${startup.message}\nPress r to reload or q to exit.`;
  }
  if (section === null) {
    return 'Choose Learn or Practice; open Extras for Overview, Storage, and Help.';
  }
  if (section === 'Storage') {
    return [
      'Storage',
      'Backend: SQLite',
      `Location: ${startup.location}`,
      `Retention: ${startup.retention}`,
      `Revision: ${startup.snapshot.revision}`,
      `Content hash: ${startup.set.contentHash}`,
    ].join('\n');
  }
  if (!setInfo) {
    throw new Error('Ready storage must include validated question-set information.');
  }
  return [
    'Overview',
    `Set: ${startup.set.name}`,
    `Source: ${startup.set.source}`,
    `Loaded: ${new Date(startup.set.loadedAt).toLocaleString()}`,
    `Questions: ${setInfo.questionCount}`,
    `Answers: ${setInfo.answerCount}`,
    `Answers without source explanations: ${setInfo.missingExplanationCount}`,
    `Saved learning answers: ${startup.snapshot.learning.length}`,
    `Saved practice runs: ${startup.snapshot.runs.length}`,
    'Replace this set with: quizdeck load <path>',
  ].join('\n');
}

export namespace InkShell {
  export interface Props { session: AppSession; onQuit(): void }
}

export function InkShell({ session, onQuit }: InkShell.Props) {
  const startup = useAtomValue(startupAtom);
  const setInfo = useAtomValue(setInfoAtom);
  const practiceNotice = useAtomValue(practiceNoticeAtom);
  const saveError = useAtomValue(actionErrorAtom);
  const pending = useAtomValue(pendingAtom);
  const { stdout } = useStdout();
  const [size, setSize] = useState({
    rows: stdout.rows || 24,
    columns: stdout.columns || 80,
  });
  const [focused, setFocused] = useState(0);
  const [active, setActive] = useState<ShellSection | null>(null);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const firstGAt = useRef<number | null>(null);
  const pageSize = Math.max(1, size.rows - 8);
  const lines = useMemo(() => wrapAnsi(
    sectionText({
      section: active === 'Learn' || active === 'Practice' ? null : active,
      startup,
      setInfo,
    }),
    Math.max(1, size.columns - 2),
    {
      hard: true,
      trim: false,
    },
  ).split('\n'), [active, startup, setInfo, size.columns]);
  const visibleOffset = Math.min(offset, Math.max(0, lines.length - pageSize));
  const menuItems = extrasOpen ? extrasMenuItems : mainMenuItems;
  const setIdentity = startup.status === 'ready'
    ? `${startup.set.contentHash}:${startup.set.loadedAt}`
    : 'not-ready';

  useEffect(() => {
    const resize = () => {
      setSize({
        rows: stdout.rows || 24,
        columns: stdout.columns || 80,
      });
    };
    stdout.on('resize', resize);
    return () => { stdout.off('resize', resize); };
  }, [stdout]);

  useInput((input, key) => {
    if (input === 'q' && !key.ctrl && !key.meta) {
      onQuit();
      return;
    }
    if (startup.status === 'error' && input === 'r' && !key.ctrl && !key.meta) {
      session.start();
      return;
    }
    let navigationKey = input;
    if (input === 'g' && !key.ctrl && !key.meta) {
      const now = performance.now();
      navigationKey = firstGAt.current !== null && now - firstGAt.current < 800 ? 'gg' : '';
      firstGAt.current = navigationKey ? null : now;
    } else {
      firstGAt.current = null;
    }
    if (key.upArrow) navigationKey = 'ArrowUp';
    if (key.downArrow) navigationKey = 'ArrowDown';
    if (key.leftArrow) navigationKey = 'ArrowLeft';
    if (key.rightArrow) navigationKey = 'ArrowRight';
    if (key.home) navigationKey = 'Home';
    if (key.end) navigationKey = 'End';
    if (key.return) navigationKey = 'Enter';
    if (key.escape) navigationKey = 'Escape';
    const nextAction = navigationAction({
      key: navigationKey,
      ctrl: key.ctrl,
      meta: key.meta,
    });
    if (!nextAction) {
      return;
    }
    switch (nextAction) {
      case 'pageDown':
      case 'pageUp': {
        const step = Math.max(1, Math.floor(pageSize / 2));
        setOffset(Math.max(0, Math.min(
          lines.length - pageSize,
          visibleOffset + (nextAction === 'pageDown' ? step : -step),
        )));

        break;
      }
      case 'help': {
        setExtrasOpen(true);
        setActive('Help');
        setFocused(extrasMenuItems.indexOf('Help'));
        setOffset(0);

        break;
      }
      case 'back': {
        setActive(null);
        setFocused(extrasOpen ? mainMenuItems.indexOf('Extras') : 0);
        setExtrasOpen(false);
        setOffset(0);

        break;
      }
      case 'activate': {
        if (extrasOpen) {
          setActive(extrasMenuItems[focused] ?? 'Overview');
        } else if (mainMenuItems[focused] === 'Extras') {
          setExtrasOpen(true);
          setActive(null);
          setFocused(0);
        } else {
          const section = mainMenuItems[focused];
          setActive(section === 'Practice' ? section : 'Learn');
        }
        setOffset(0);

        break;
      }
      default: {
        setFocused((current) => nextFocus(current, nextAction, menuItems.length));
      }
    }
  }, { isActive: active !== 'Learn' && active !== 'Practice' });

  const exitLearning = () => {
    setActive(null);
    setExtrasOpen(false);
    setFocused(0);
    setOffset(0);
  };

  const exitPractice = () => {
    setActive(null);
    setExtrasOpen(false);
    setFocused(mainMenuItems.indexOf('Practice'));
    setOffset(0);
  };

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold>Quizdeck</Text>
      <Box marginTop={1}>
        {mainMenuItems.map((item, index) => (
          <Text
            key={item}
            inverse={!extrasOpen && index === focused}
            color={(item === 'Learn' && active === 'Learn')
              || (item === 'Practice' && active === 'Practice')
              ? 'cyan'
              : undefined}
          >
            {`[${item}] `}
          </Text>
        ))}
      </Box>
      {extrasOpen && (
        <Box marginTop={1}>
          <Text>Extras › </Text>
          {extrasMenuItems.map((item, index) => (
            <Text key={item} inverse={index === focused} color={item === active ? 'cyan' : undefined}>
              {`[${item}] `}
            </Text>
          ))}
        </Box>
      )}
      {practiceNotice && <Text color="yellow">{practiceNotice}</Text>}
      {active === 'Learn' && <InkLearning key={setIdentity} onExit={exitLearning} onQuit={onQuit} />}
      {active === 'Practice' && <InkPractice key={setIdentity} onExit={exitPractice} onQuit={onQuit} />}
      {active !== 'Learn' && active !== 'Practice' && (
        <>
          <Box marginTop={1}><Text>{lines.slice(visibleOffset, visibleOffset + pageSize).join('\n')}</Text></Box>
          {pending && <Text>Saving progress…</Text>}
          {saveError && <Text color="red">{`Save error: ${saveError}`}</Text>}
          <Text dimColor>
            {`j/k focus · Enter open · ? help · q quit · lines ${visibleOffset + 1}-${Math.min(lines.length, visibleOffset + pageSize)}/${lines.length}`}
          </Text>
        </>
      )}
    </Box>
  );
}
