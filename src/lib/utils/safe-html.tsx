// src/lib/utils/safe-html.tsx
// Shared component for safely rendering rich text HTML including math-node tags.
// Used in: admin question view dialog, QuestionDisplay (student exam), results page.

'use client';

import { useEffect, useState, useMemo } from 'react';
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
      const latexMatch = attrs.match(/latex="([^"]*)"/);
        const displayMatch = attrs.match(/display="([^"]*)"/);
        let latex = ''
        if (latexMatch) {
          try {
            latex = decodeURIComponent(latexMatch[1])
          } catch {
            latex = latexMatch[1] // use raw value if decode fails
          }
        }
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

// ─── DOMPurify config (defined once, reused for every sanitize call) ──────────

const DOMPURIFY_CONFIG = {
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
  ADD_TAGS: ['math', 'svg'],
  FORCE_BODY: false,
}

// ─── Module-level DOMPurify singleton ────────────────────────────────────────

let DOMPurifyInstance: any = null
let purifyLoadPromise: Promise<void> | null = null

function getSanitized(html: string): string | null {
  if (!DOMPurifyInstance) return null // still loading
  const withMath = processMathNodes(html)
  return DOMPurifyInstance.sanitize(withMath, DOMPURIFY_CONFIG)
}

// Kick off the load immediately (client-side only)
if (typeof window !== 'undefined' && !purifyLoadPromise) {
  purifyLoadPromise = import('dompurify').then((mod) => {
    DOMPurifyInstance = mod.default
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SafeHtmlProps {
  html: string;
  className?: string;
}

export function SafeHtml({ html, className }: SafeHtmlProps) {
  // Track whether DOMPurify has finished loading
  const [ready, setReady] = useState(!!DOMPurifyInstance)

  // On first mount: if DOMPurify isn't loaded yet, wait then trigger a re-render
  useEffect(() => {
    if (DOMPurifyInstance) {
      setReady(true)
      return
    }
    purifyLoadPromise?.then(() => {
      setReady(true)
    })
  }, [])

  // Sanitize synchronously every time `html` changes.
  const sanitized = useMemo(() => {
    if (!html || !ready) return ''
    return getSanitized(html) ?? ''
  }, [html, ready])

  // ✅ THE FIX: Create a unique content-based key.
  // This forces React to completely unmount the old <div> and mount a new one 
  // whenever the HTML string changes. This bypasses the browser repaint bug 
  // where old images stay visible despite the DOM `src` updating.
  const contentKey = useMemo(() => {
    if (!html) return 'empty';
    let hash = 0;
    for (let i = 0; i < html.length; i++) {
      hash = ((hash << 5) - hash) + html.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return `html-${hash}`;
  }, [html]);

  if (!html) return null

  // Plain text fallback for old questions with no HTML tags
  if (!html.includes('<')) {
    return <span className={className}>{html}</span>
  }

  // While DOMPurify loads on first page visit, render nothing.
  if (!ready) return null

  return (
    <div
      key={contentKey} // ✅ Apply the unique key to force a hard DOM replacement
      className={`rich-content ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
}