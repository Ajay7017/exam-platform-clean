// src/lib/utils/safe-html.tsx
// Shared component for safely rendering rich text HTML including math-node tags.
// Used in: admin question view dialog, QuestionDisplay (student exam), results page.

'use client';

import { useEffect, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * Processes stored HTML and replaces <math-node> custom tags with
 * rendered KaTeX HTML before passing to DOMPurify for safe rendering.
 */
function processMathNodes(html: string): string {
  if (!html) return '';

  // Replace <math-node latex="..." display="..."></math-node> with rendered KaTeX
  return html.replace(
    /<math-node([^>]*)><\/math-node>/g,
    (_, attrs) => {
      // Extract latex attribute
      const latexMatch = attrs.match(/latex="([^"]*)"/);
      const displayMatch = attrs.match(/display="([^"]*)"/);
      const latex = latexMatch ? decodeURIComponent(latexMatch[1]) : '';
      const isDisplay = displayMatch ? displayMatch[1] === 'true' : false;

      if (!latex) return '';

      try {
        const rendered = katex.renderToString(latex, {
          throwOnError: false,
          displayMode: isDisplay,
          output: 'html',
        });

        return isDisplay
          ? `<div style="text-align:center;margin:8px 0;overflow-x:auto;">${rendered}</div>`
          : `<span style="display:inline-block;vertical-align:middle;">${rendered}</span>`;
      } catch {
        return `<span style="color:red;">[math error: ${latex}]</span>`;
      }
    }
  );
}

interface SafeHtmlProps {
  html: string;
  className?: string;
}

export function SafeHtml({ html, className }: SafeHtmlProps) {
  const [sanitized, setSanitized] = useState('');

  useEffect(() => {
    if (!html) { setSanitized(''); return; }

    // Step 1: Process math-node tags → KaTeX HTML
    const withMath = processMathNodes(html);

    // Step 2: Sanitize with DOMPurify (allow KaTeX output tags)
    import('dompurify').then((mod) => {
      const DOMPurify = mod.default;
      const clean = DOMPurify.sanitize(withMath, {
        ALLOWED_TAGS: [
          // Standard text
          'p', 'br', 'strong', 'em', 'u', 's',
          'ul', 'ol', 'li',
          'span', 'div',
          'sup', 'sub',
          // Images (Cloudinary URLs)
          'img',
          // KaTeX output tags
          'math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'mfrac',
          'msup', 'msub', 'msubsup', 'msqrt', 'mroot', 'mover',
          'munder', 'munderover', 'mtable', 'mtr', 'mtd', 'mtext',
          'annotation', 'annotation-xml',
          'svg', 'path', 'line', 'rect', 'g', 'use', 'defs',
        ],
        ALLOWED_ATTR: [
          'src', 'alt', 'class', 'style', 'width', 'height',
          // Math/SVG attrs
          'xmlns', 'encoding', 'display', 'fence', 'stretchy',
          'viewBox', 'd', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
          'stroke', 'stroke-width', 'fill', 'transform',
          'aria-hidden', 'focusable',
        ],
        ALLOWED_URI_REGEXP: /^(https:\/\/res\.cloudinary\.com\/|data:)/,
        // Allow SVG and MathML
        ADD_TAGS: ['math', 'svg'],
        FORCE_BODY: false,
      });
      setSanitized(clean);
    });
  }, [html]);

  if (!html) return null;

  // Plain text fallback for old questions (no HTML tags at all)
  if (!html.includes('<')) {
    return <span className={className}>{html}</span>;
  }

  return (
    <div
      className={`rich-content ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}