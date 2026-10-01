import {
  describe,
  expect,
  it,
} from 'vitest';
import { createPracticeAnswerGate } from './practice-input';

describe('practice answer key ownership', () => {
  it('rejects legacy held-key repeats regardless of the initial repeat delay', () => {
    const gate = createPracticeAnswerGate();
    expect(gate.accept('a')).toBe(true);
    expect(gate.accept('a')).toBe(false);
    expect(gate.accept('A')).toBe(false);
    expect(gate.accept('Enter')).toBe(true);
    expect(gate.accept('Enter')).toBe(false);
  });

  it('permits deliberate re-arming through navigation or a different shortcut', () => {
    const gate = createPracticeAnswerGate();
    expect(gate.accept('a')).toBe(true);
    expect(gate.accept('1')).toBe(true);
    gate.reset();
    expect(gate.accept('1')).toBe(true);
  });

  it('uses enhanced keyboard event types to distinguish a new press from a repeat or release', () => {
    const gate = createPracticeAnswerGate();
    expect(gate.accept('a', 'press')).toBe(true);
    expect(gate.accept('a', 'repeat')).toBe(false);
    expect(gate.accept('a', 'release')).toBe(false);
    expect(gate.accept('a', 'press')).toBe(true);
    expect(gate.accept('a', 'repeat')).toBe(false);
  });
});
