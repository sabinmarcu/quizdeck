import {
  describe,
  expect,
  it,
} from 'vitest';
import {
  markdownLink,
  markdownText,
} from './markdown';

describe('Markdown link safety', () => {
  it.each(['https://example.com/docs', 'http://localhost:3000/', 'mailto:team@example.com', '#section'])('retains safe link %s', (url) => { expect(markdownLink(url)).toBe(url); });

  it.each([
    ['javascript', 'alert(1)'].join(':'),
    ['JaVaScRiPt', 'alert(1)'].join(':'),
    'data:text/html,<script>alert(1)</script>',
    '//example.com/path',
    'https://example.com/\u{1B}]52;clipboard',
    'java\nscript:alert(1)',
  ])('rejects unsafe link %s', (url) => { expect(markdownLink(url)).toBeUndefined(); });
});

describe('readable Markdown previews', () => {
  it('removes terminal controls from preview text while retaining readable words', () => {
    const preview = markdownText('**Visible**\u{1B}]52;clipboard\u{7}\n\nNext paragraph.');
    expect(preview).toBe('Visible]52;clipboard Next paragraph.');
    expect(preview).not.toContain('\u{1B}');
  });

  it('keeps visible wording across blocks without exposing markup or link definitions', () => {
    expect(markdownText([
      '# Heading',
      '',
      '**First** and *second* with `code`.',
      '',
      '> Quoted paragraph.',
      '>',
      '> Next paragraph.',
      '',
      '- [Documentation][docs]',
      '- Last item',
      '',
      '[docs]: https://example.com/',
      '',
      '<script>hidden()</script>',
    ].join('\n'))).toBe('Heading First and second with code. Quoted paragraph. Next paragraph. Documentation Last item');
  });
});
