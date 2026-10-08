import ReactMarkdown from 'react-markdown';
import type { ReactNode } from 'react';
import type {
  Heading,
  Nodes,
  Root,
} from 'mdast';
import { markdownLink } from '../data/markdown';
import {
  block,
  inline,
} from './Markdown.css';

function InlineContent({ children }: { children?: ReactNode }) {
  return <span>{children}</span>;
}

function InlineListItem({ children }: { children?: ReactNode }) {
  return (
    <span>
      {children}
      {' '}
    </span>
  );
}

function ImageText({ alt }: { alt?: string }) {
  return <span>{alt}</span>;
}

function scopedHeadings({ level }: { level: 3 | 4 }) {
  return (tree: Root) => {
    const headings: Array<{ node: Heading; siblings: Nodes[]; index: number }> = [];
    const collect = (siblings: Nodes[]) => {
      for (const [index, node] of siblings.entries()) {
        if (node.type === 'heading') {
          headings.push({
            node,
            siblings,
            index,
          });
        }
        if ('children' in node) collect(node.children);
      }
    };
    collect(tree.children);
    if (headings.length === 0) return;
    const minimum = Math.min(...headings.map(({ node }) => node.depth));
    for (const {
      node, siblings, index,
    } of headings) {
      const depth = Math.min(6, level + node.depth - minimum) as Heading['depth'];
      siblings.splice(index, 1, {
        ...node,
        depth,
      });
    }
  };
}

export namespace Markdown {
  export type Props = {
    children: string;
    headingLevel?: 3 | 4;
    mode?: 'block' | 'inline';
  };
}

export function Markdown({
  children, headingLevel = 3, mode = 'block',
}: Markdown.Props) {
  if (mode === 'inline') {
    return (
      <span className={inline}>
        <ReactMarkdown
          components={{
            a: InlineContent,
            blockquote: InlineContent,
            h1: InlineContent,
            h2: InlineContent,
            h3: InlineContent,
            h4: InlineContent,
            h5: InlineContent,
            h6: InlineContent,
            hr: () => null,
            img: ImageText,
            li: InlineListItem,
            ol: InlineContent,
            p: InlineListItem,
            pre: InlineContent,
            ul: InlineContent,
          }}
          skipHtml
          urlTransform={markdownLink}
        >
          {children}
        </ReactMarkdown>
      </span>
    );
  }

  return (
    <div className={block}>
      <ReactMarkdown
        components={{
          img: ImageText,
          a: ({ children: linkChildren, href }) => (href
            ? <a href={href}>{linkChildren}</a>
            : linkChildren),
        }}
        remarkPlugins={[[scopedHeadings, { level: headingLevel }]]}
        skipHtml
        urlTransform={markdownLink}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
