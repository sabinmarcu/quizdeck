import type { ReactNode } from 'react';
import type {
  SetInfo,
  Startup,
} from '../state/application';
import type { ExtrasSection } from '../state/navigation';
import {
  panel,
  details,
  list,
} from './App.css';
import { Detail } from './App.Detail';
import { defaultProgressDatabaseName } from './IndexedDbProgressStorage';

export namespace Panel {
  export interface Props {
    loadQuestionSetControl: ReactNode;
    section: ExtrasSection;
    startup: Extract<Startup, { status: 'ready' }>;
    setInfo: SetInfo;
  }
}

export function Panel({
  loadQuestionSetControl, section, startup, setInfo,
}: Panel.Props) {
  if (section === 'Storage') {
    return (
      <section className={panel} aria-labelledby="storage-heading">
        <h2 id="storage-heading">Storage</h2>
        <dl className={details}>
          <Detail term="Backend" value="Native IndexedDB" />
          <Detail term="Origin" value={document.location.origin} />
          <Detail term="Database" value={defaultProgressDatabaseName} />
          <Detail term="Location" value={startup.location} />
          <Detail term="Retention" value={startup.retention} />
          <Detail term="Revision" value={String(startup.snapshot.revision)} />
          <Detail term="Content hash" value={startup.set.contentHash} />
        </dl>
      </section>
    );
  }
  if (section === 'Help') {
    return (
      <section className={panel} aria-labelledby="help-heading">
        <h2 id="help-heading">Keyboard help</h2>
        <ul className={list}>
          <li>j/k, h/l, and arrows move menu focus; Enter opens the focused item.</li>
          <li>gg/Home and G/End focus the first and last visible menu items.</li>
          <li>? opens Extras → Help. Escape closes Extras or returns focus to Learn.</li>
          <li>Ctrl-d/u scrolls half a page. Tab, click, and touch remain available.</li>
          <li>Typing or composing in a text control never invokes navigation shortcuts.</li>
        </ul>
      </section>
    );
  }
  return (
    <section className={panel} aria-labelledby="overview-heading">
      <h2 id="overview-heading">Overview</h2>
      <dl className={details}>
        <Detail term="Question set" value={startup.set.name} />
        <Detail term="Source" value={startup.set.source} />
        <Detail term="Loaded" value={new Date(startup.set.loadedAt).toLocaleString()} />
        <Detail term="Questions" value={String(setInfo.questionCount)} />
        <Detail term="Answers" value={String(setInfo.answerCount)} />
        <Detail term="Answers without source explanations" value={String(setInfo.missingExplanationCount)} />
        <Detail term="Saved learning answers" value={String(startup.snapshot.learning.length)} />
        <Detail term="Saved practice runs" value={String(startup.snapshot.runs.length)} />
      </dl>
      <p>This screen reports your current question set and saved records.</p>
      <div>{loadQuestionSetControl}</div>
    </section>
  );
}
