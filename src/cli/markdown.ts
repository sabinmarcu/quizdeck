import { styleText } from 'node:util';
import { fromMarkdown } from 'mdast-util-from-markdown';
import type {
  Definition,
  Nodes,
} from 'mdast';
import { markdownLink } from '../data/markdown';

interface Context {
  definitions: ReadonlyMap<string, Definition>;
  links: boolean;
}

function collectDefinitions(node: Nodes, definitions: Map<string, Definition>): void {
  if (node.type === 'definition') {
    const identifier = node.identifier.toLowerCase();
    if (!definitions.has(identifier)) definitions.set(identifier, node);
  } else if ('children' in node) {
    for (const child of node.children) collectDefinitions(child, definitions);
  }
}

function inline(node: Nodes, context: Context): string {
  const children = () => ('children' in node
    ? node.children.map((child) => inline(child, context)).join('')
    : '');
  switch (node.type) {
    case 'text': { return node.value.replaceAll(/\s*\n\s*/gu, ' ');
    }
    case 'inlineCode': { return styleText('inverse', node.value, { validateStream: false });
    }
    case 'code': { return styleText('inverse', node.value.replaceAll(/\s*\n\s*/gu, ' '), {
      validateStream: false,
    });
    }
    case 'strong': { return styleText('bold', children(), { validateStream: false });
    }
    case 'emphasis': { return styleText('italic', children(), { validateStream: false });
    }
    case 'break': { return '\n';
    }
    case 'link':
    case 'linkReference': {
      const label = children();
      const target = node.type === 'link'
        ? node.url
        : context.definitions.get(node.identifier.toLowerCase())?.url;
      const url = target ? markdownLink(target) : undefined;
      return context.links && url
        ? `${styleText('underline', label, { validateStream: false })} (${url})`
        : label;
    }
    case 'image':
    case 'imageReference': { return node.alt ?? '';
    }
    case 'html':
    case 'definition': { return '';
    }
    default: { return children();
    }
  }
}

function blocks(nodes: readonly Nodes[], context: Context): string {
  return nodes.map((node) => {
    switch (node.type) {
      case 'paragraph': { return inline(node, context);
      }
      case 'heading': { return styleText('bold', inline(node, context), { validateStream: false });
      }
      case 'code': { return node.value.split('\n').map((line) => `    ${line}`).join('\n');
      }
      case 'blockquote': { return blocks(node.children, context).split('\n')
        .map((line) => `│ ${line}`).join('\n');
      }
      case 'list': { return node.children.map((item, index) => {
        const marker = node.ordered ? `${(node.start ?? 1) + index}. ` : '- ';
        const indentation = ' '.repeat(marker.length);
        return blocks(item.children, context).split('\n')
          .map((line, position) => `${position === 0 ? marker : indentation}${line}`).join('\n');
      }).join(node.spread ? '\n\n' : '\n');
      }
      case 'thematicBreak': { return '────────';
      }
      case 'html':
      case 'definition': { return '';
      }
      default: { return inline(node, context);
      }
    }
  }).filter((text) => text.length > 0).join('\n\n');
}

export namespace terminalMarkdown {
  export interface Options {
    inline?: boolean;
  }
}

export function terminalMarkdown(source: string, options: terminalMarkdown.Options = {}): string {
  const safeSource = source.replaceAll(/\p{Cc}/gu, (character) => (
    '\n\r\t'.includes(character) ? character : ''
  ));
  const document = fromMarkdown(safeSource);
  const definitions = new Map<string, Definition>();
  collectDefinitions(document, definitions);
  const context: Context = {
    definitions,
    links: !options.inline,
  };
  return options.inline
    ? document.children.map((node) => inline(node, context)).filter(Boolean).join(' ')
    : blocks(document.children, context);
}
