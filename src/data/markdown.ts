import { fromMarkdown } from 'mdast-util-from-markdown';
import type { Nodes } from 'mdast';

export function markdownLink(url: string): string | undefined {
  if (/[\p{Cc}\s]/u.test(url)) {
    return undefined;
  }
  if (url.startsWith('#')) {
    return url;
  }
  try {
    const { protocol } = new URL(url);
    return ['http:', 'https:', 'mailto:'].includes(protocol) ? url : undefined;
  } catch {
    return undefined;
  }
}

function nodeText(node: Nodes): string {
  if (node.type === 'html' || node.type === 'definition') {
    return '';
  }
  if (node.type === 'image' || node.type === 'imageReference') {
    return node.alt ?? '';
  }
  if ('value' in node) {
    return node.value;
  }
  if (node.type === 'break') {
    return ' ';
  }
  if ('children' in node) {
    const blocks = ['root', 'list', 'listItem', 'blockquote'].includes(node.type);
    return node.children.map(nodeText).join(blocks ? ' ' : '');
  }
  return '';
}

export function markdownText(source: string): string {
  return nodeText(fromMarkdown(source)).replaceAll(/\p{Cc}/gu, (character) => (
    '\n\r\t'.includes(character) ? ' ' : ''
  )).replaceAll(/\s+/gu, ' ').trim();
}
