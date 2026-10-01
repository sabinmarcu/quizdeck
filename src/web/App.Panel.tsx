import type {
  BankInfo,
  Startup,
} from '../state/application';
import type { ShellSection } from '../state/navigation';
import {
  panel,
  details,
  list,
} from './App.css';
import { Detail } from './App.Detail';
import { defaultProgressDatabaseName } from './IndexedDbProgressStorage';

export namespace Panel {
  export interface Props {
    section: ShellSection;
    startup: Extract<Startup, { status: 'ready' }>;
    bankInfo: BankInfo;
  }
}

export function Panel({
  section, startup, bankInfo,
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
        </dl>
      </section>
    );
  }
  if (section === 'Help') {
    return (
      <section className={panel} aria-labelledby="help-heading">
        <h2 id="help-heading">Keyboard help</h2>
        <ul className={list}>
          <li>j/k, h/l, and arrows move section focus; Enter opens the focused section.</li>
          <li>gg/Home focuses the first section; G/End focuses the last.</li>
          <li>? opens help; Escape returns to Overview.</li>
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
        <Detail term="Questions" value={String(bankInfo.questionCount)} />
        <Detail term="Answers" value={String(bankInfo.answerCount)} />
        <Detail term="Answers without source explanations" value={String(bankInfo.missingExplanationCount)} />
        <Detail term="Saved learning answers" value={String(startup.snapshot.learning.length)} />
        <Detail term="Saved practice runs" value={String(startup.snapshot.runs.length)} />
      </dl>
      <p>This screen reports your local question bank and saved records.</p>
    </section>
  );
}
