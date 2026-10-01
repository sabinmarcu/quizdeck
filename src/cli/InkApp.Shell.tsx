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
  bankInfoAtom,
  pendingAtom,
  startupAtom,
} from '../state/application';
import type {
  AppSession,
  BankInfo,
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
import { InkLearning } from './InkLearning';

interface ExtrasContent {
  section: ExtrasSection | null;
  startup: Startup;
  bankInfo: BankInfo | null;
}

function sectionText({
  section, startup, bankInfo,
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
    return 'Choose Learn or open Extras for Overview, Storage, and Help.';
  }
  if (section === 'Storage') {
    return [
      'Storage',
      'Backend: SQLite',
      `Location: ${startup.location}`,
      `Retention: ${startup.retention}`,
      `Revision: ${startup.snapshot.revision}`,
      `Bank version: ${startup.bank.version}`,
    ].join('\n');
  }
  if (!bankInfo) {
    throw new Error('Ready storage must include validated bank information.');
  }
  return [
    'Overview',
    `Questions: ${bankInfo.questionCount}`,
    `Answers: ${bankInfo.answerCount}`,
    `Answers without source explanations: ${bankInfo.missingExplanationCount}`,
    `Saved learning answers: ${startup.snapshot.learning.length}`,
    `Saved practice runs: ${startup.snapshot.runs.length}`,
  ].join('\n');
}

export namespace InkShell {
  export interface Props { session: AppSession; onQuit(): void }
}

export function InkShell({ session, onQuit }: InkShell.Props) {
  const startup = useAtomValue(startupAtom);
  const bankInfo = useAtomValue(bankInfoAtom);
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
      section: active === 'Learn' ? null : active,
      startup,
      bankInfo,
    }),
    Math.max(1, size.columns - 2),
    {
      hard: true,
      trim: false,
    },
  ).split('\n'), [active, startup, bankInfo, size.columns]);
  const visibleOffset = Math.min(offset, Math.max(0, lines.length - pageSize));
  const menuItems = extrasOpen ? extrasMenuItems : mainMenuItems;

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
          setActive('Learn');
        }
        setOffset(0);

        break;
      }
      default: {
        setFocused((current) => nextFocus(current, nextAction, menuItems.length));
      }
    }
  }, { isActive: active !== 'Learn' });

  const exitLearning = () => {
    setActive(null);
    setExtrasOpen(false);
    setFocused(0);
    setOffset(0);
  };

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold>Claude certification</Text>
      <Box marginTop={1}>
        {mainMenuItems.map((item, index) => (
          <Text
            key={item}
            inverse={!extrasOpen && index === focused}
            color={item === 'Learn' && active === 'Learn' ? 'cyan' : undefined}
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
      {active === 'Learn'
        ? (
          <InkLearning onExit={exitLearning} onQuit={onQuit} />
        )
        : (
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
