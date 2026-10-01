export const shellSections = ['Overview', 'Storage', 'Help'] as const;
export type ShellSection = typeof shellSections[number];
export type NavigationAction = 'next' | 'previous' | 'first' | 'last' | 'activate' | 'help' | 'back' | 'pageDown' | 'pageUp';

export interface NavigationInput {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  meta?: boolean;
  editing?: boolean;
  composing?: boolean;
}

export function navigationAction(input: NavigationInput): NavigationAction | null {
  if (input.editing || input.composing || input.alt || input.meta) {
    return null;
  }
  if (input.ctrl) {
    if (input.key === 'd') {
      return 'pageDown';
    }
    if (input.key === 'u') {
      return 'pageUp';
    }
    return null;
  }
  switch (input.key) {
    case 'j':
    case 'l':
    case 'ArrowDown':
    case 'ArrowRight': { return 'next';
    }
    case 'k':
    case 'h':
    case 'ArrowUp':
    case 'ArrowLeft': { return 'previous';
    }
    case 'Home':
    case 'gg': { return 'first';
    }
    case 'End':
    case 'G': { return 'last';
    }
    case 'Enter': { return 'activate';
    }
    case '?': { return 'help';
    }
    case 'Escape': { return 'back';
    }
    default: { return null;
    }
  }
}

export function nextFocus(index: number, action: NavigationAction): number {
  switch (action) {
    case 'next': { return Math.min(shellSections.length - 1, index + 1);
    }
    case 'previous': { return Math.max(0, index - 1);
    }
    case 'first': { return 0;
    }
    case 'last': { return shellSections.length - 1;
    }
    default: { return index;
    }
  }
}
