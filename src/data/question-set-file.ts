import {
  questionsSchema,
  questionContentHash,
} from './question-set';
import type { QuestionSet } from './question-set';

const maximumDisplayedIssues = 20;
function issueLocation(path: PropertyKey[]): string {
  const location = path.reduce<string>((value, segment) => {
    if (typeof segment === 'number') return `${value}[${segment}]`;
    return value.length === 0 ? String(segment) : `${value}.${String(segment)}`;
  }, '');
  return location.length > 0 ? location : '$';
}

function formatIssues(issues: readonly QuestionSetParseError.Issue[]): string {
  const displayed = issues.slice(0, maximumDisplayedIssues).map((issue) => (
    `${issue.location}: ${issue.message}`
  ));
  const omitted = issues.length - displayed.length;
  if (omitted > 0) {
    displayed.push(`+${omitted} more`);
  }
  return displayed.join('\n');
}

export class QuestionSetParseError extends Error {
  readonly issues: readonly QuestionSetParseError.Issue[];

  constructor(issues: readonly QuestionSetParseError.Issue[]) {
    super(formatIssues(issues));
    this.name = 'QuestionSetParseError';
    this.issues = issues;
  }
}

export namespace QuestionSetParseError {
  export interface Issue {
    location: string;
    message: string;
  }
}

export namespace parseQuestionSet {
  export type Result = Pick<QuestionSet, 'name' | 'questions' | 'contentHash' | 'questionCount'>;
}

export function setDisplayName(fileName: string): string {
  const baseName = fileName.split(/[\\/]/u).at(-1)?.replace(/\.json$/iu, '') ?? '';
  const words = baseName
    .replaceAll(/([a-z\d])([A-Z])/gu, '$1 $2')
    .replaceAll(/([A-Z])([A-Z][a-z])/gu, '$1 $2')
    .split(/[-_.\s]+/u)
    .filter((word) => word.length > 0)
    .map((word) => `${word[0]!.toUpperCase()}${word.slice(1)}`);
  return words.length > 0 ? words.join(' ') : 'Untitled Set';
}

export async function parseQuestionSet(
  text: string,
  fileName: string,
): Promise<parseQuestionSet.Result> {
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch (error) {
    throw new QuestionSetParseError([{
      location: 'JSON',
      message: error instanceof Error ? error.message : 'Invalid JSON',
    }]);
  }

  const parsed = questionsSchema.safeParse(input);
  if (!parsed.success) {
    throw new QuestionSetParseError(parsed.error.issues.map((issue) => ({
      location: issueLocation(issue.path),
      message: issue.message,
    })));
  }

  const questions = parsed.data.toSorted((left, right) => left.id - right.id);
  return {
    name: setDisplayName(fileName),
    questions,
    contentHash: await questionContentHash(questions),
    questionCount: questions.length,
  };
}
