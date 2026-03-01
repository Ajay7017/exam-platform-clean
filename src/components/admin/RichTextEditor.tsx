'use client';

import { useEditor, EditorContent, Node, mergeAttributes } from '@tiptap/react';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Bold, Italic, UnderlineIcon, ImageIcon, Loader2 } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// ─── Math Node ────────────────────────────────────────────────────────────────
function MathNodeView({ node }: { node: any }) {
  const { latex, display } = node.attrs;
  const isDisplay = display === 'true' || display === true;
  const rendered = (() => {
    try {
      return katex.renderToString(latex || '', { throwOnError: false, displayMode: isDisplay });
    } catch {
      return `<span style="color:red">[invalid math]</span>`;
    }
  })();

  return (
    <NodeViewWrapper
      as={isDisplay ? 'div' : 'span'}
      style={{
        display: isDisplay ? 'block' : 'inline-block',
        textAlign: isDisplay ? 'center' : undefined,
        margin: isDisplay ? '8px 0' : '0 2px',
        verticalAlign: isDisplay ? undefined : 'middle',
        cursor: 'default',
        userSelect: 'none',
      }}
      contentEditable={false}
    >
      <span dangerouslySetInnerHTML={{ __html: rendered }} />
    </NodeViewWrapper>
  );
}

const MathNode = Node.create({
  name: 'mathNode',
  group: 'inline',
  inline: true,
  atom: true,
  addAttributes() {
    return {
      latex: { default: '' },
      display: { default: 'false' },
    };
  },
  parseHTML() { return [{ tag: 'math-node' }]; },
  renderHTML({ HTMLAttributes }) { return ['math-node', mergeAttributes(HTMLAttributes)]; },
  addNodeView() { return ReactNodeViewRenderer(MathNodeView); },
});

// ─── Resizable Image Node ─────────────────────────────────────────────────────
function ResizableImageView({ node, updateAttributes, selected }: {
  node: any;
  updateAttributes: (attrs: Record<string, any>) => void;
  selected: boolean;
}) {
  const { src, alt, width } = node.attrs;
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = containerRef.current?.offsetWidth || parseInt(width) || 300;

    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const diff = e.clientX - startX.current;
      const newWidth = Math.max(20, Math.min(800, startWidth.current + diff));
      updateAttributes({ width: `${Math.round(newWidth)}px` });
    };

    const onMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [updateAttributes]);

  return (
    <NodeViewWrapper as="span" style={{ display: 'inline-block', position: 'relative', verticalAlign: 'middle' }}>
      <div
        ref={containerRef}
        contentEditable={false}
        style={{
          display: 'inline-block',
          position: 'relative',
          width: width || '300px',
          maxWidth: '100%',
          marginBottom: selected ? '20px' : '0',
        }}
      >
        <img
          src={src}
          alt={alt || ''}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            borderRadius: '4px',
            border: selected ? '2px solid hsl(var(--primary))' : '2px solid transparent',
            objectFit: 'contain',
          }}
          draggable={false}
        />

        {selected && (
          <div
            onMouseDown={handleMouseDown}
            title="Drag to resize"
            style={{
              position: 'absolute',
              right: -6,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 14,
              height: 40,
              background: 'hsl(var(--primary))',
              borderRadius: 7,
              cursor: 'ew-resize',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 2, height: 2, borderRadius: 1, background: 'white', opacity: 0.9 }} />
              ))}
            </div>
          </div>
        )}

        {selected && width && (
          <div style={{
            position: 'absolute',
            bottom: -18,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 10,
            color: 'hsl(var(--muted-foreground))',
            whiteSpace: 'nowrap',
            background: 'hsl(var(--background))',
            padding: '1px 5px',
            borderRadius: 3,
            border: '1px solid hsl(var(--border))',
          }}>
            {width}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

const ResizableImage = Node.create({
  name: 'resizableImage',
  group: 'inline',
  inline: true,
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      width: { default: '300px' },
      height: { default: null },
    };
  },

  parseHTML() {
    return [{
      tag: 'img[src]',
      getAttrs: (el) => {
        const img = el as HTMLImageElement;
        const styleWidth = img.style.width;
        return {
          src: img.getAttribute('src'),
          alt: img.getAttribute('alt'),
          width: styleWidth || img.getAttribute('width') || '300px',
        };
      },
    }];
  },

  renderHTML({ HTMLAttributes }) {
    const { width, height, ...rest } = HTMLAttributes;
    return ['img', mergeAttributes(rest, {
      style: `width: ${width || '300px'}; max-width: 100%; height: auto; border-radius: 4px; object-fit: contain;`,
      class: 'inline-image',
    })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});

// ─── RichTextEditor ───────────────────────────────────────────────────────────

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  disabled?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Type here...',
  minHeight = '80px',
  disabled = false,
}: RichTextEditorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track whether the last HTML change originated from the editor itself (user
  // typing) or from the outside (parent reset). This prevents the sync effect
  // from calling setContent while the user is mid-type, which would reset the
  // cursor position.
  const isInternalChange = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Underline,
      Placeholder.configure({ placeholder }),
      MathNode,
      ResizableImage,
    ],
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor }) => {
      // Mark as internal so the sync effect below knows not to fight back
      isInternalChange.current = true;
      const html = editor.getHTML();
      onChange(html === '<p></p>' ? '' : html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none px-3 py-2',
        style: `min-height: ${minHeight}`,
      },
      handlePaste(view, event) {
        const items = Array.from(event.clipboardData?.items || []);
        const imageItem = items.find((item) => item.type.startsWith('image/'));
        if (imageItem) {
          event.preventDefault();
          const file = imageItem.getAsFile();
          if (file) uploadImageFile(file);
          return true;
        }
        return false;
      },
      handleDrop(view, event) {
        const files = Array.from(event.dataTransfer?.files || []);
        const imageFile = files.find((f) => f.type.startsWith('image/'));
        if (imageFile) {
          event.preventDefault();
          uploadImageFile(imageFile);
          return true;
        }
        return false;
      },
    },
  });

  // ── Sync external value changes into the editor ──────────────────────────
  //
  // This runs whenever the parent changes `value` (e.g. react-hook-form reset).
  // We skip the sync when the change came from the editor itself (isInternalChange)
  // to avoid resetting the cursor mid-type.
  //
  // The key fix: we now handle ALL values (empty AND non-empty), not just empty.
  // Before this fix, when reset() set statement='' the editor cleared, but when
  // the next question's value arrived it was never pushed back into the editor,
  // so the form still held the previous question's stale content at submit time.
  useEffect(() => {
    if (!editor) return;

    // If this value change came from the editor's own onUpdate, skip — the
    // editor already has this content and we'd just be setting it again.
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    const incoming = value || '';
    const current = editor.getHTML();

    // Normalise empty states so '<p></p>' and '' are treated the same
    const normalise = (html: string) =>
      html === '<p></p>' || html === '' ? '' : html;

    if (normalise(incoming) !== normalise(current)) {
      // setContent replaces the entire document — safe here because we only
      // reach this branch when the parent explicitly changed the value
      editor.commands.setContent(incoming, false /* don't emit update */)
    }
  }, [value, editor]);

  const uploadImageFile = useCallback(
    async (file: File) => {
      if (!editor) return;
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only JPG, PNG, WEBP images are allowed');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image must be under 10MB');
        return;
      }
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('images', file);
        const res = await fetch('/api/admin/images/upload', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        const uploaded = data.uploaded?.[0];
        if (!uploaded?.success || !uploaded?.url) throw new Error(uploaded?.error || 'Upload failed');
        editor.chain().focus().insertContent({
          type: 'resizableImage',
          attrs: { src: uploaded.url, alt: file.name, width: '300px' },
        }).run();
        toast.success('Image inserted — click it then drag the right edge to resize');
      } catch (error: any) {
        toast.error(error.message || 'Failed to upload image');
      } finally {
        setIsUploading(false);
      }
    },
    [editor]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { uploadImageFile(file); e.target.value = ''; }
  };

  const insertMath = useCallback(
    (latex: string, displayMode: boolean) => {
      if (!editor) return;
      editor.chain().focus().insertContent({
        type: 'mathNode',
        attrs: { latex, display: String(displayMode) },
      }).run();
    },
    [editor]
  );

  if (!editor) return null;

  return (
    <div
      className={`rounded-md border border-input bg-background transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <div className="flex items-center gap-0.5 border-b border-input px-2 py-1.5 bg-muted/40 rounded-t-md flex-wrap">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Bold" disabled={disabled}>
          <Bold className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italic" disabled={disabled}>
          <Italic className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Underline" disabled={disabled}>
          <UnderlineIcon className="w-3.5 h-3.5" />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarButton
          onClick={() => {
            const { from, to } = editor.state.selection;
            const text = editor.state.doc.textBetween(from, to);
            if (text) {
              editor.chain().focus().insertContent(text.split('').map((c) => subscriptMap[c] || c).join('')).run();
            } else {
              toast('Select text first to convert to subscript');
            }
          }}
          title="Subscript (select text first)" disabled={disabled}
        >
          <span className="text-xs font-bold leading-none">X<sub>2</sub></span>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => {
            const { from, to } = editor.state.selection;
            const text = editor.state.doc.textBetween(from, to);
            if (text) {
              editor.chain().focus().insertContent(text.split('').map((c) => superscriptMap[c] || c).join('')).run();
            } else {
              toast('Select text first to convert to superscript');
            }
          }}
          title="Superscript (select text first)" disabled={disabled}
        >
          <span className="text-xs font-bold leading-none">X<sup>2</sup></span>
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-1" />

        <SymbolPicker onInsert={(s) => editor.chain().focus().insertContent(s).run()} disabled={disabled} />

        <div className="w-px h-4 bg-border mx-1" />

        <MathKeyboard onInsert={insertMath} disabled={disabled} />

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarButton
          onClick={() => fileInputRef.current?.click()}
          title="Insert image (click image then drag right edge to resize)"
          disabled={disabled || isUploading}
        >
          {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
        </ToolbarButton>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleFileInputChange} />
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}

// ─── Toolbar Button ───────────────────────────────────────────────────────────
function ToolbarButton({ onClick, isActive, title, disabled, children }: {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      className={`flex items-center justify-center w-7 h-7 rounded text-sm transition-colors
        ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}
        disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

// ─── Symbol Picker ────────────────────────────────────────────────────────────
const SYMBOLS = [
  '±','×','÷','≠','≤','≥','≈','∞','√','π',
  'α','β','γ','δ','θ','λ','μ','σ','Σ','Ω',
  '∫','∂','∆','→','←','↑','↓','⇒','∈','∉',
  '∩','∪','⊂','⊃','°',
].map(s => ({ label: s, value: s }));

function SymbolPicker({ onInsert, disabled }: { onInsert: (s: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <ToolbarButton onClick={() => setOpen(o => !o)} title="Insert special symbol" disabled={disabled} isActive={open}>
        <span className="text-xs font-bold">Ω</span>
      </ToolbarButton>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border rounded-md shadow-md p-2 w-52">
          <p className="text-xs text-muted-foreground mb-2 px-1">Special Symbols</p>
          <div className="grid grid-cols-7 gap-0.5">
            {SYMBOLS.map(s => (
              <button key={s.value} type="button" onClick={() => { onInsert(s.value); setOpen(false); }}
                className="flex items-center justify-center w-6 h-6 text-sm rounded hover:bg-muted transition-colors">
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Math Keyboard ────────────────────────────────────────────────────────────
const MATH_TEMPLATES = {
  'Fraction': [
    { label: 'a/b',        latex: '\\frac{a}{b}',               hint: 'Basic fraction' },
    { label: 'M/6',        latex: '\\frac{M}{6}',               hint: 'Example: M over 6' },
    { label: 'a/b²',       latex: '\\frac{a}{b^{2}}',           hint: 'Squared denominator' },
    { label: 'a²/b',       latex: '\\frac{a^{2}}{b}',           hint: 'Squared numerator' },
  ],
  'Powers & Roots': [
    { label: 'x²',         latex: 'x^{2}',                      hint: 'Square' },
    { label: 'xⁿ',         latex: 'x^{n}',                      hint: 'Power n' },
    { label: '√x',         latex: '\\sqrt{x}',                  hint: 'Square root' },
    { label: 'ⁿ√x',        latex: '\\sqrt[n]{x}',               hint: 'nth root' },
    { label: 'x²/√y',      latex: '\\frac{x^{2}}{\\sqrt{y}}',  hint: 'Fraction with root' },
    { label: 'a×b',        latex: 'a \\times b',                hint: 'Multiplication ×' },
    { label: 'a·b',        latex: 'a \\cdot b',                 hint: 'Dot multiplication ·' },
    { label: 'a×b/c',      latex: '\\frac{a \\times b}{c}',    hint: 'Multiplication in fraction' },
    { label: '2×3',        latex: '2 \\times 3',                hint: 'Example: 2 × 3' },
  ],
  'Integrals': [
    { label: '∫',          latex: '\\int',                      hint: 'Basic integral' },
    { label: '∫dx',        latex: '\\int f(x)\\,dx',            hint: 'Indefinite integral' },
    { label: '∫_a^b',      latex: '\\int_{a}^{b} f(x)\\,dx',   hint: 'Definite integral' },
    { label: '∮',          latex: '\\oint',                     hint: 'Contour integral' },
    { label: '∑',          latex: '\\sum_{i=1}^{n} x_i',       hint: 'Summation' },
    { label: '∏',          latex: '\\prod_{i=1}^{n} x_i',      hint: 'Product' },
  ],
  'Trig & Log': [
    { label: 'sin',        latex: '\\sin(x)',                   hint: 'Sine' },
    { label: 'cos',        latex: '\\cos(x)',                   hint: 'Cosine' },
    { label: 'tan',        latex: '\\tan(x)',                   hint: 'Tangent' },
    { label: 'sin²',       latex: '\\sin^{2}(x)',              hint: 'Sine squared' },
    { label: 'cos²',       latex: '\\cos^{2}(x)',              hint: 'Cosine squared' },
    { label: 'sin²+cos²',  latex: '\\sin^{2}x + \\cos^{2}x',  hint: 'Pythagorean identity' },
    { label: 'log',        latex: '\\log(x)',                   hint: 'Logarithm' },
    { label: 'logₐ',       latex: '\\log_{a}(x)',              hint: 'Log base a' },
    { label: 'ln',         latex: '\\ln(x)',                    hint: 'Natural log' },
  ],
  'Limits & Deriv': [
    { label: 'lim',        latex: '\\lim_{x \\to a} f(x)',                   hint: 'Limit' },
    { label: 'x→∞',        latex: 'x \\to \\infty',                          hint: 'Approaches infinity' },
    { label: 'dy/dx',      latex: '\\frac{dy}{dx}',                          hint: 'Derivative' },
    { label: 'd²y/dx²',    latex: '\\frac{d^{2}y}{dx^{2}}',                 hint: 'Second derivative' },
    { label: '∂f/∂x',      latex: '\\frac{\\partial f}{\\partial x}',       hint: 'Partial derivative' },
  ],
  'Brackets': [
    { label: '(a)',        latex: '\\left( a \\right)',                       hint: 'Parentheses' },
    { label: '[a]',        latex: '\\left[ a \\right]',                       hint: 'Square brackets' },
    { label: '|a|',        latex: '\\left| a \\right|',                       hint: 'Absolute value' },
    { label: '(a/b)³',     latex: '\\left( \\frac{a}{b} \\right)^{3}',      hint: 'Fraction in brackets' },
    { label: '(sin/cos)³', latex: '\\left( \\frac{\\sin x + \\cos x}{\\sin x \\cos x} \\right)^{3}', hint: 'Trig fraction' },
  ],
} as const;

type CategoryKey = keyof typeof MATH_TEMPLATES;

function MathKeyboard({ onInsert, disabled }: {
  onInsert: (latex: string, displayMode: boolean) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('Fraction');
  const [latex, setLatex] = useState('');
  const [displayMode, setDisplayMode] = useState(false);
  const [preview, setPreview] = useState('');
  const [previewError, setPreviewError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!latex.trim()) { setPreview(''); setPreviewError(false); return; }
    try {
      const rendered = katex.renderToString(latex, { throwOnError: true, displayMode });
      setPreview(rendered);
      setPreviewError(false);
    } catch {
      setPreviewError(true);
      setPreview('');
    }
  }, [latex, displayMode]);

  const handleInsert = () => {
    if (!latex.trim()) { toast.error('Enter a math expression first'); return; }
    if (previewError) { toast.error('Fix the expression before inserting'); return; }
    onInsert(latex, displayMode);
    setLatex('');
    setOpen(false);
  };

  const categories = Object.keys(MATH_TEMPLATES) as CategoryKey[];

  return (
    <div ref={ref} className="relative">
      <ToolbarButton onClick={() => setOpen(o => !o)} title="Insert math equation" disabled={disabled} isActive={open}>
        <span className="text-xs font-bold" style={{ fontFamily: 'serif' }}>∑</span>
      </ToolbarButton>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-xl" style={{ width: '440px' }}>
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40 rounded-t-lg">
            <span className="text-sm font-semibold">Math Equation Builder</span>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <input type="checkbox" checked={displayMode} onChange={e => setDisplayMode(e.target.checked)} className="w-3 h-3" />
              Block (centered)
            </label>
          </div>

          <div className="p-3 space-y-3">
            <div className="flex flex-wrap gap-1">
              {categories.map(cat => (
                <button key={cat} type="button" onClick={() => setActiveCategory(cat)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${activeCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80 text-muted-foreground'}`}>
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5 min-h-8">
              {MATH_TEMPLATES[activeCategory].map((tmpl) => (
                <button key={tmpl.latex} type="button"
                  onClick={() => { setLatex(tmpl.latex); setTimeout(() => inputRef.current?.focus(), 50); }}
                  title={tmpl.hint}
                  className="px-2.5 py-1 text-sm bg-muted hover:bg-primary hover:text-primary-foreground rounded border border-border transition-colors">
                  {tmpl.label}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Expression (edit values after clicking a template)</label>
                {latex && (
                  <button type="button" onClick={() => setLatex('')} className="text-xs text-muted-foreground hover:text-foreground underline">Clear</button>
                )}
              </div>
              <textarea ref={inputRef} value={latex} onChange={e => setLatex(e.target.value)}
                placeholder='Click a template above, or type LaTeX directly'
                rows={2}
                className="w-full text-sm font-mono px-2 py-1.5 rounded border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>

            <div className="text-xs text-muted-foreground bg-muted/40 rounded px-2 py-1.5 flex flex-wrap gap-x-4 gap-y-1 border border-border/50">
              <span className="font-medium text-foreground/60 w-full mb-0.5">Quick reference:</span>
              <span><code className="font-mono bg-background px-1 rounded">\times</code> → ×</span>
              <span><code className="font-mono bg-background px-1 rounded">\cdot</code> → ·</span>
              <span><code className="font-mono bg-background px-1 rounded">\div</code> → ÷</span>
              <span><code className="font-mono bg-background px-1 rounded">\pm</code> → ±</span>
              <span><code className="font-mono bg-background px-1 rounded">\neq</code> → ≠</span>
              <span><code className="font-mono bg-background px-1 rounded">\leq</code> → ≤</span>
            </div>

            <div className="min-h-14 px-3 py-2 bg-white border border-border rounded flex items-center justify-center overflow-x-auto">
              {!latex.trim() ? (
                <span className="text-xs text-muted-foreground italic">Live preview appears here</span>
              ) : previewError ? (
                <span className="text-xs text-red-500">⚠ Invalid expression — keep editing</span>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: preview }} />
              )}
            </div>

            <button type="button" onClick={handleInsert} disabled={!latex.trim() || previewError}
              className="w-full py-2 text-sm font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              ✓ Insert into editor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Unicode Maps ─────────────────────────────────────────────────────────────
const superscriptMap: Record<string, string> = {
  '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹',
  'a':'ᵃ','b':'ᵇ','c':'ᶜ','d':'ᵈ','e':'ᵉ','f':'ᶠ','g':'ᵍ','h':'ʰ','i':'ⁱ','j':'ʲ',
  'k':'ᵏ','l':'ˡ','m':'ᵐ','n':'ⁿ','o':'ᵒ','p':'ᵖ','r':'ʳ','s':'ˢ','t':'ᵗ','u':'ᵘ',
  'v':'ᵛ','w':'ʷ','x':'ˣ','y':'ʸ','z':'ᶻ','+':'⁺','-':'⁻','=':'⁼','(':'⁽',')':'⁾',
};
const subscriptMap: Record<string, string> = {
  '0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉',
  'a':'ₐ','e':'ₑ','i':'ᵢ','o':'ₒ','u':'ᵤ','r':'ᵣ','v':'ᵥ','x':'ₓ','+':'₊','-':'₋',
  '=':'₌','(':'₍',')':'₎',
};