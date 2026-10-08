import { stripVTControlCharacters } from 'node:util';
import {
  describe,
  expect,
  it,
} from 'vitest';
import { terminalMarkdown } from './markdown';

const visible = (source: string, options?: terminalMarkdown.Options) => (
  stripVTControlCharacters(terminalMarkdown(source, options))
);

describe('terminal Markdown content', () => {
  it('reflows soft line breaks while preserving paragraphs, list numbering, and code indentation', () => {
    const text = visible([
      '**First** paragraph',
      'continues here.',
      '',
      '*Second* paragraph.',
      '',
      '3. First item',
      '1. Second item',
      '   - Nested item',
      '',
      '> Quoted paragraph',
      '',
      '```ts',
      'const value = 1;',
      'return value;',
      '```',
    ].join('\n'));
    expect(text).toContain('First paragraph continues here.\n\nSecond paragraph.');
    expect(text).toContain('3. First item');
    expect(text).toContain('4. Second item');
    expect(text).toMatch(/^\s+- Nested item$/mu);
    expect(text).toContain('│ Quoted paragraph');
    expect(text).toContain('    const value = 1;\n    return value;');
    expect(text).not.toContain('```');
    expect(text).not.toContain('**First**');
  });

  it('resolves safe reference links but leaves unsafe links inert', () => {
    const text = visible('[Guide][guide] and [unsafe](javascript:alert)\n\n[guide]: https://example.com/docs');
    expect(text).toBe('Guide (https://example.com/docs) and unsafe');
  });

  it('uses the first reference definition, including definitions inside blockquotes', () => {
    const text = visible([
      '> [guide]: https://example.com/first',
      '>',
      '> Quoted note.',
      '',
      '[guide]: https://example.com/second',
      '',
      '[Guide][guide]',
    ].join('\n'));
    expect(text).toContain('Guide (https://example.com/first)');
    expect(text).not.toContain('https://example.com/second');
  });

  it('keeps answer choices inline without URL duplication or block markup', () => {
    expect(visible('**Choose** [this](https://example.com)\n\n`value`', { inline: true }))
      .toBe('Choose this value');
  });

  it('does not execute raw HTML or source terminal escape sequences', () => {
    const text = terminalMarkdown('Visible\u{1B}]52;clipboard\u{7}\n\n<script>hidden()</script>');
    expect(text).toContain('Visible]52;clipboard');
    expect(text).not.toContain('\u{1B}');
    expect(text).not.toContain('hidden()');
  });
});
