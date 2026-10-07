import type { Key } from 'ink';
import {
  describe,
  expect,
  it,
} from 'vitest';
import {
  questionAction,
  questionContentLines,
} from './question-presentation';

const unmodified: Key = {
  upArrow: false,
  downArrow: false,
  leftArrow: false,
  rightArrow: false,
  pageDown: false,
  pageUp: false,
  home: false,
  end: false,
  return: false,
  escape: false,
  ctrl: false,
  shift: false,
  tab: false,
  backspace: false,
  delete: false,
  meta: false,
  super: false,
  hyper: false,
  capsLock: false,
  numLock: false,
};

describe('shared CLI question interactions', () => {
  it('moves choice focus without giving an answer and maps both question-navigation keys', () => {
    expect(questionAction('j', unmodified)).toEqual({
      type: 'choice',
      step: 1,
    });
    expect(questionAction('k', unmodified)).toEqual({
      type: 'choice',
      step: -1,
    });
    expect(questionAction('h', unmodified)).toEqual({
      type: 'question',
      step: -1,
    });
    expect(questionAction('', {
      ...unmodified,
      rightArrow: true,
    }))
      .toEqual({
        type: 'question',
        step: 1,
      });
  });

  it('uses the focused choice for Enter and an explicit index only for valid shortcuts', () => {
    expect(questionAction('', {
      ...unmodified,
      return: true,
    })).toEqual({
      type: 'answer',
      index: null,
    });
    expect(questionAction('D', unmodified)).toEqual({
      type: 'answer',
      index: 3,
    });
    expect(questionAction('', {
      ...unmodified,
      delete: true,
    })).toBeNull();
    expect(questionAction('ab', unmodified)).toBeNull();
  });

  it('maps every multi-answer activation to one choice selection', () => {
    expect(questionAction('D', unmodified, true)).toEqual({
      type: 'answer',
      index: 3,
    });
    expect(questionAction(' ', unmodified, true)).toEqual({
      type: 'answer',
      index: null,
    });
    expect(questionAction('', {
      ...unmodified,
      return: true,
    }, true)).toEqual({
      type: 'answer',
      index: null,
    });
  });

  it('shows accepted progressive selections without correctness feedback', () => {
    const lines = questionContentLines({
      title: 'Question 1',
      description: 'Choose every applicable answer.',
      canAnswer: true,
      choices: [
        {
          text: 'First choice',
          selected: true,
        },
        {
          text: 'Second choice',
          selected: false,
        },
      ],
    }, 80).map((line) => line.text);
    expect(lines).toContain('  A. First choice [selected]');
    expect(lines.join('\n')).not.toContain('correct');
  });

  it('ignores releases, repeated answers, and modified shortcuts while allowing held focus movement', () => {
    expect(questionAction('a', {
      ...unmodified,
      eventType: 'release',
    })).toBeNull();
    expect(questionAction('a', {
      ...unmodified,
      eventType: 'repeat',
    })).toBeNull();
    expect(questionAction('j', {
      ...unmodified,
      ctrl: true,
    })).toBeNull();
    expect(questionAction('a', {
      ...unmodified,
      meta: true,
    })).toBeNull();
    expect(questionAction('j', {
      ...unmodified,
      eventType: 'repeat',
    }))
      .toEqual({
        type: 'choice',
        step: 1,
      });
  });
});
