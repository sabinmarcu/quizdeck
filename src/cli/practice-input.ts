export type PracticeKeyEvent = 'press' | 'repeat' | 'release';

export interface PracticeAnswerGate {
  accept(key: string, eventType?: PracticeKeyEvent): boolean;
  reset(): void;
}

export function createPracticeAnswerGate(): PracticeAnswerGate {
  let heldKey: string | null = null;
  return {
    accept(key, eventType) {
      const normalized = key.toLowerCase();
      if (eventType === 'release') {
        if (heldKey === normalized) {
          heldKey = null;
        }
        return false;
      }
      if (eventType === 'repeat') {
        return false;
      }
      if (eventType === 'press') {
        heldKey = normalized;
        return true;
      }
      // Legacy terminals have no release signal. Require a different key or navigation
      // before reusing the same shortcut so a delayed auto-repeat cannot answer twice.
      if (heldKey === normalized) {
        return false;
      }
      heldKey = normalized;
      return true;
    },
    reset() {
      heldKey = null;
    },
  };
}
