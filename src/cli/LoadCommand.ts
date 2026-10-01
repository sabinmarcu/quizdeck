import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import {
  Command,
  Option,
  UsageError,
} from 'clipanion';
import {
  parseQuestionSet,
  QuestionSetParseError,
} from '../data/question-set-file';
import type { QuestionSet } from '../data/question-set';
import type { ProgressStorage } from '../data/storage';
import { openInkStorage } from './sqlite';

function usageError(error: unknown): UsageError {
  if (error instanceof UsageError) {
    return error;
  }
  return new UsageError(error instanceof Error ? error.message : 'Question set could not be loaded.');
}

function isInteractiveTerminal(
  input: NodeJS.ReadableStream & { isTTY?: boolean },
  output: NodeJS.WritableStream & { isTTY?: boolean },
): boolean {
  return input.isTTY === true && output.isTTY === true;
}

async function confirmReplacement(
  input: NodeJS.ReadableStream,
  output: NodeJS.WritableStream,
  set: Pick<QuestionSet, 'name' | 'questionCount'>,
  learningCount: number,
  runCount: number,
): Promise<boolean> {
  const prompt = [
    `Load ${set.name} (${set.questionCount} questions)?`,
    `This clears ${learningCount} learning answer${learningCount === 1 ? '' : 's'} and ${runCount} practice run${runCount === 1 ? '' : 's'}.`,
    'Continue? [y/N] ',
  ].join(' ');
  const readline = createInterface({
    input,
    output,
  });
  try {
    const answer = await readline.question(prompt);
    return answer.trim().toLowerCase() === 'y';
  } finally {
    readline.close();
  }
}

export class LoadCommand extends Command {
  public static override paths = [['load']];

  public static override usage = Command.Usage({
    description: 'Replace the saved question set from a JSON file.',
    examples: [['Load a question set', '$0 load sets/questions.json']],
  });

  public readonly filename = Option.String({
    name: 'path',
    required: true,
  });

  public readonly yes = Option.Boolean('--yes', false, {
    description: 'Replace without prompting when saved progress exists.',
  });

  public async execute(): Promise<number> {
    const resolvedPath = path.resolve(process.cwd(), this.filename);
    let text: string;
    try {
      text = await readFile(resolvedPath, 'utf8');
    } catch (error) {
      throw usageError(error);
    }

    let parsed: Awaited<ReturnType<typeof parseQuestionSet>>;
    try {
      parsed = await parseQuestionSet(text, resolvedPath);
    } catch (error) {
      if (error instanceof QuestionSetParseError) {
        throw new UsageError(error.message);
      }
      throw usageError(error);
    }

    let storage: ProgressStorage | undefined;
    try {
      storage = await openInkStorage();
      const snapshot = await storage.load();
      const learningCount = snapshot.learning.length;
      const runCount = snapshot.runs.length;
      if ((learningCount > 0 || runCount > 0) && !this.yes) {
        if (!isInteractiveTerminal(this.context.stdin, this.context.stdout)) {
          throw new UsageError('Saved learning progress or practice runs would be erased. Re-run with --yes to confirm.');
        }
        const confirmed = await confirmReplacement(
          this.context.stdin,
          this.context.stdout,
          parsed,
          learningCount,
          runCount,
        );
        if (!confirmed) {
          throw new UsageError('Question set replacement cancelled.');
        }
      }
      const set: QuestionSet = {
        ...parsed,
        source: 'file',
        loadedAt: Math.max(Date.now(), (snapshot.currentSet?.loadedAt ?? -1) + 1),
      };
      await storage.commit({
        expectedRevision: snapshot.revision,
        changes: [{
          kind: 'replaceSet',
          set,
        }],
      });
      this.context.stdout.write(`${[
        `Loaded ${set.name} (${set.questionCount} questions).`,
        `Cleared ${learningCount} learning answer${learningCount === 1 ? '' : 's'} and ${runCount} practice run${runCount === 1 ? '' : 's'}.`,
      ].join('\n')}\n`);
      return 0;
    } catch (error) {
      throw usageError(error);
    } finally {
      storage?.close();
    }
  }
}
