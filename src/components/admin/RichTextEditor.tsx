'use client';

import { useEditor, EditorContent, Node, mergeAttributes } from '@tiptap/react';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
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
      // ── Proper TipTap sub/sup extensions (replaces Unicode hack) ──
      Subscript,
      Superscript,
      Placeholder.configure({ placeholder }),
      MathNode,
      ResizableImage,
    ],
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor }) => {
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
  useEffect(() => {
    if (!editor) return;
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    const incoming = value || '';
    const current = editor.getHTML();
    const normalise = (html: string) =>
      html === '<p></p>' || html === '' ? '' : html;
    if (normalise(incoming) !== normalise(current)) {
      editor.commands.setContent(incoming, false);
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

        {/* ── Text formatting ── */}
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

        {/* ── Subscript / Superscript — now real HTML tags via TipTap extensions ── */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          isActive={editor.isActive('subscript')}
          title="Subscript — select text then click, or click then type"
          disabled={disabled}
        >
          {/* Visual: X with a properly positioned subscript 2 */}
          <span className="text-xs font-bold leading-none" style={{ fontFamily: 'serif' }}>
            X<sub style={{ fontSize: '0.65em' }}>2</sub>
          </span>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          isActive={editor.isActive('superscript')}
          title="Superscript — select text then click, or click then type"
          disabled={disabled}
        >
          {/* Visual: X with a properly positioned superscript 2 */}
          <span className="text-xs font-bold leading-none" style={{ fontFamily: 'serif' }}>
            X<sup style={{ fontSize: '0.65em' }}>2</sup>
          </span>
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-1" />

        {/* ── Symbol Picker ── */}
        <SymbolPicker onInsert={(s) => editor.chain().focus().insertContent(s).run()} disabled={disabled} />

        <div className="w-px h-4 bg-border mx-1" />

        {/* ── Chemistry / Physics Picker (NEW) ── */}
        <ChemistryPicker editor={editor} disabled={disabled} />

        <div className="w-px h-4 bg-border mx-1" />

        {/* ── Math Keyboard ── */}
        <MathKeyboard onInsert={insertMath} disabled={disabled} />

        <div className="w-px h-4 bg-border mx-1" />

        {/* ── Image upload ── */}
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

// ─── Chemistry / Physics Picker ───────────────────────────────────────────────
//
// Each entry is either:
//   { label, insert: string }          → inserts plain text at cursor
//   { label, insert: 'SUB:...' }       → wraps "..." in <sub> tag
//   { label, insert: 'SUP:...' }       → wraps "..." in <sup> tag
//   { label, insert: 'HTML:...' }      → inserts raw HTML string
//
// The HTML: prefix lets us combine normal text + sub/sup in one click,
// e.g. "NO₃⁻" is really  NO<sub>3</sub><sup>−</sup>

type ChemEntry = {
  label: string;      // what the button displays
  title: string;      // tooltip
  insert: string;     // plain string OR prefixed command (see above)
};

type ChemCategory = {
  key: string;
  label: string;
  entries: ChemEntry[];
};

const CHEM_CATEGORIES: ChemCategory[] = [
  {
    key: 'ions',
    label: '⚗ Ions',
    entries: [
      { label: 'H⁺',    title: 'Hydrogen ion',        insert: 'HTML:H<sup>+</sup>' },
      { label: 'OH⁻',   title: 'Hydroxide',           insert: 'HTML:OH<sup>−</sup>' },
      { label: 'Na⁺',   title: 'Sodium ion',          insert: 'HTML:Na<sup>+</sup>' },
      { label: 'K⁺',    title: 'Potassium ion',       insert: 'HTML:K<sup>+</sup>' },
      { label: 'Ca²⁺',  title: 'Calcium ion',         insert: 'HTML:Ca<sup>2+</sup>' },
      { label: 'Mg²⁺',  title: 'Magnesium ion',       insert: 'HTML:Mg<sup>2+</sup>' },
      { label: 'Fe²⁺',  title: 'Iron(II)',             insert: 'HTML:Fe<sup>2+</sup>' },
      { label: 'Fe³⁺',  title: 'Iron(III)',            insert: 'HTML:Fe<sup>3+</sup>' },
      { label: 'Cu²⁺',  title: 'Copper(II)',           insert: 'HTML:Cu<sup>2+</sup>' },
      { label: 'Zn²⁺',  title: 'Zinc ion',            insert: 'HTML:Zn<sup>2+</sup>' },
      { label: 'Al³⁺',  title: 'Aluminium ion',       insert: 'HTML:Al<sup>3+</sup>' },
      { label: 'NH₄⁺',  title: 'Ammonium',            insert: 'HTML:NH<sub>4</sub><sup>+</sup>' },
      { label: 'Cl⁻',   title: 'Chloride',            insert: 'HTML:Cl<sup>−</sup>' },
      { label: 'F⁻',    title: 'Fluoride',            insert: 'HTML:F<sup>−</sup>' },
      { label: 'Br⁻',   title: 'Bromide',             insert: 'HTML:Br<sup>−</sup>' },
      { label: 'I⁻',    title: 'Iodide',              insert: 'HTML:I<sup>−</sup>' },
      { label: 'S²⁻',   title: 'Sulfide',             insert: 'HTML:S<sup>2−</sup>' },
      { label: 'O²⁻',   title: 'Oxide',               insert: 'HTML:O<sup>2−</sup>' },
      { label: 'NO₃⁻',  title: 'Nitrate',             insert: 'HTML:NO<sub>3</sub><sup>−</sup>' },
      { label: 'NO₂⁻',  title: 'Nitrite',             insert: 'HTML:NO<sub>2</sub><sup>−</sup>' },
      { label: 'SO₄²⁻', title: 'Sulfate',             insert: 'HTML:SO<sub>4</sub><sup>2−</sup>' },
      { label: 'SO₃²⁻', title: 'Sulfite',             insert: 'HTML:SO<sub>3</sub><sup>2−</sup>' },
      { label: 'CO₃²⁻', title: 'Carbonate',           insert: 'HTML:CO<sub>3</sub><sup>2−</sup>' },
      { label: 'HCO₃⁻', title: 'Bicarbonate',         insert: 'HTML:HCO<sub>3</sub><sup>−</sup>' },
      { label: 'PO₄³⁻', title: 'Phosphate',           insert: 'HTML:PO<sub>4</sub><sup>3−</sup>' },
      { label: 'HPO₄²⁻',title: 'Hydrogen phosphate',  insert: 'HTML:HPO<sub>4</sub><sup>2−</sup>' },
      { label: 'CrO₄²⁻',title: 'Chromate',            insert: 'HTML:CrO<sub>4</sub><sup>2−</sup>' },
      { label: 'MnO₄⁻', title: 'Permanganate',        insert: 'HTML:MnO<sub>4</sub><sup>−</sup>' },
      { label: 'CN⁻',   title: 'Cyanide',             insert: 'HTML:CN<sup>−</sup>' },
      { label: 'SCN⁻',  title: 'Thiocyanate',         insert: 'HTML:SCN<sup>−</sup>' },
    ],
  },
  {
    key: 'compounds',
    label: '🧪 Compounds',
    entries: [
      { label: 'H₂O',   title: 'Water',               insert: 'HTML:H<sub>2</sub>O' },
      { label: 'CO₂',   title: 'Carbon dioxide',      insert: 'HTML:CO<sub>2</sub>' },
      { label: 'CO',    title: 'Carbon monoxide',     insert: 'HTML:CO' },
      { label: 'H₂',    title: 'Hydrogen gas',        insert: 'HTML:H<sub>2</sub>' },
      { label: 'O₂',    title: 'Oxygen gas',          insert: 'HTML:O<sub>2</sub>' },
      { label: 'N₂',    title: 'Nitrogen gas',        insert: 'HTML:N<sub>2</sub>' },
      { label: 'Cl₂',   title: 'Chlorine gas',        insert: 'HTML:Cl<sub>2</sub>' },
      { label: 'HCl',   title: 'Hydrochloric acid',   insert: 'HTML:HCl' },
      { label: 'H₂SO₄', title: 'Sulfuric acid',       insert: 'HTML:H<sub>2</sub>SO<sub>4</sub>' },
      { label: 'HNO₃',  title: 'Nitric acid',         insert: 'HTML:HNO<sub>3</sub>' },
      { label: 'NaOH',  title: 'Sodium hydroxide',    insert: 'HTML:NaOH' },
      { label: 'NaCl',  title: 'Sodium chloride',     insert: 'HTML:NaCl' },
      { label: 'CaCO₃', title: 'Calcium carbonate',   insert: 'HTML:CaCO<sub>3</sub>' },
      { label: 'CaO',   title: 'Calcium oxide',       insert: 'HTML:CaO' },
      { label: 'NH₃',   title: 'Ammonia',             insert: 'HTML:NH<sub>3</sub>' },
      { label: 'CH₄',   title: 'Methane',             insert: 'HTML:CH<sub>4</sub>' },
      { label: 'C₂H₅OH',title: 'Ethanol',             insert: 'HTML:C<sub>2</sub>H<sub>5</sub>OH' },
      { label: 'C₆H₁₂O₆',title:'Glucose',            insert: 'HTML:C<sub>6</sub>H<sub>12</sub>O<sub>6</sub>' },
      { label: 'Fe₂O₃', title: 'Iron(III) oxide',     insert: 'HTML:Fe<sub>2</sub>O<sub>3</sub>' },
      { label: 'Al₂O₃', title: 'Aluminium oxide',     insert: 'HTML:Al<sub>2</sub>O<sub>3</sub>' },
      { label: 'MgO',   title: 'Magnesium oxide',     insert: 'HTML:MgO' },
      { label: 'KMnO₄', title: 'Potassium permanganate', insert: 'HTML:KMnO<sub>4</sub>' },
      { label: 'K₂Cr₂O₇',title:'Potassium dichromate',insert:'HTML:K<sub>2</sub>Cr<sub>2</sub>O<sub>7</sub>'},
      { label: 'H₂O₂',  title: 'Hydrogen peroxide',  insert: 'HTML:H<sub>2</sub>O<sub>2</sub>' },
      { label: 'SO₂',   title: 'Sulfur dioxide',      insert: 'HTML:SO<sub>2</sub>' },
      { label: 'SO₃',   title: 'Sulfur trioxide',     insert: 'HTML:SO<sub>3</sub>' },
    ],
  },
  {
    key: 'orbitals',
    label: '🔬 Orbitals',
    entries: [
      { label: '1s¹',   title: '1s¹',   insert: 'HTML:1s<sup>1</sup>' },
      { label: '1s²',   title: '1s²',   insert: 'HTML:1s<sup>2</sup>' },
      { label: '2s¹',   title: '2s¹',   insert: 'HTML:2s<sup>1</sup>' },
      { label: '2s²',   title: '2s²',   insert: 'HTML:2s<sup>2</sup>' },
      { label: '2p¹',   title: '2p¹',   insert: 'HTML:2p<sup>1</sup>' },
      { label: '2p²',   title: '2p²',   insert: 'HTML:2p<sup>2</sup>' },
      { label: '2p³',   title: '2p³',   insert: 'HTML:2p<sup>3</sup>' },
      { label: '2p⁴',   title: '2p⁴',   insert: 'HTML:2p<sup>4</sup>' },
      { label: '2p⁵',   title: '2p⁵',   insert: 'HTML:2p<sup>5</sup>' },
      { label: '2p⁶',   title: '2p⁶',   insert: 'HTML:2p<sup>6</sup>' },
      { label: '3s¹',   title: '3s¹',   insert: 'HTML:3s<sup>1</sup>' },
      { label: '3s²',   title: '3s²',   insert: 'HTML:3s<sup>2</sup>' },
      { label: '3p¹',   title: '3p¹',   insert: 'HTML:3p<sup>1</sup>' },
      { label: '3p⁶',   title: '3p⁶',   insert: 'HTML:3p<sup>6</sup>' },
      { label: '3d¹',   title: '3d¹',   insert: 'HTML:3d<sup>1</sup>' },
      { label: '3d⁵',   title: '3d⁵',   insert: 'HTML:3d<sup>5</sup>' },
      { label: '3d¹⁰',  title: '3d¹⁰',  insert: 'HTML:3d<sup>10</sup>' },
      { label: '4s¹',   title: '4s¹',   insert: 'HTML:4s<sup>1</sup>' },
      { label: '4s²',   title: '4s²',   insert: 'HTML:4s<sup>2</sup>' },
      { label: '4p⁶',   title: '4p⁶',   insert: 'HTML:4p<sup>6</sup>' },
      { label: '4d¹⁰',  title: '4d¹⁰',  insert: 'HTML:4d<sup>10</sup>' },
      { label: '4f¹⁴',  title: '4f¹⁴',  insert: 'HTML:4f<sup>14</sup>' },
      { label: 'dxy',   title: 'dxy orbital',   insert: 'HTML:d<sub>xy</sub>' },
      { label: 'dyz',   title: 'dyz orbital',   insert: 'HTML:d<sub>yz</sub>' },
      { label: 'dxz',   title: 'dxz orbital',   insert: 'HTML:d<sub>xz</sub>' },
      { label: 'dx²-y²',title: 'dx²-y² orbital',insert: 'HTML:d<sub>x²−y²</sub>' },
      { label: 'dz²',   title: 'dz² orbital',   insert: 'HTML:d<sub>z²</sub>' },
      { label: 'px',    title: 'px orbital',    insert: 'HTML:p<sub>x</sub>' },
      { label: 'py',    title: 'py orbital',    insert: 'HTML:p<sub>y</sub>' },
      { label: 'pz',    title: 'pz orbital',    insert: 'HTML:p<sub>z</sub>' },
    ],
  },
  {
    key: 'arrows',
    label: '→ Arrows',
    entries: [
      { label: '→',   title: 'Reaction arrow (forward)',       insert: ' → ' },
      { label: '←',   title: 'Reaction arrow (backward)',      insert: ' ← ' },
      { label: '⇌',   title: 'Reversible reaction / equilibrium', insert: ' ⇌ ' },
      { label: '⇒',   title: 'Implies / yields',              insert: ' ⇒ ' },
      { label: '⇔',   title: 'Double implies',                insert: ' ⇔ ' },
      { label: '↑',   title: 'Gas evolved (upward arrow)',     insert: '↑' },
      { label: '↓',   title: 'Precipitate formed (downward)',  insert: '↓' },
      { label: '↔',   title: 'Resonance arrow',               insert: ' ↔ ' },
      { label: '⟶',   title: 'Long forward arrow',            insert: ' ⟶ ' },
      { label: '⟵',   title: 'Long backward arrow',           insert: ' ⟵ ' },
      { label: '⟷',   title: 'Long double arrow',             insert: ' ⟷ ' },
      { label: '△',   title: 'Heat (triangle above arrow)',    insert: 'Δ' },
      { label: 'hν',  title: 'Photon / light energy',         insert: 'hν' },
      { label: '→Δ',  title: 'Reaction with heat',            insert: 'HTML:&nbsp;→<sup>Δ</sup>&nbsp;' },
      { label: '→hν', title: 'Reaction with light',           insert: 'HTML:&nbsp;→<sup>hν</sup>&nbsp;' },
    ],
  },
  {
    key: 'physics',
    label: '⚡ Physics',
    entries: [
      { label: 'e⁻',    title: 'Electron',              insert: 'HTML:e<sup>−</sup>' },
      { label: 'e⁺',    title: 'Positron',              insert: 'HTML:e<sup>+</sup>' },
      { label: 'α',     title: 'Alpha particle',        insert: 'α' },
      { label: 'β',     title: 'Beta particle',         insert: 'β' },
      { label: 'γ',     title: 'Gamma ray',             insert: 'γ' },
      { label: 'ν',     title: 'Nu (frequency)',        insert: 'ν' },
      { label: 'λ',     title: 'Lambda (wavelength)',   insert: 'λ' },
      { label: 'ρ',     title: 'Rho (density)',         insert: 'ρ' },
      { label: 'ω',     title: 'Omega (angular vel.)',  insert: 'ω' },
      { label: 'τ',     title: 'Tau (time constant)',   insert: 'τ' },
      { label: 'η',     title: 'Eta (efficiency)',      insert: 'η' },
      { label: 'ε₀',    title: 'Permittivity of free space', insert: 'HTML:ε<sub>0</sub>' },
      { label: 'μ₀',    title: 'Permeability of free space', insert: 'HTML:μ<sub>0</sub>' },
      { label: 'kB',    title: 'Boltzmann constant',   insert: 'HTML:k<sub>B</sub>' },
      { label: 'NA',    title: "Avogadro's number",     insert: 'HTML:N<sub>A</sub>' },
      { label: 'c',     title: 'Speed of light',        insert: 'c' },
      { label: 'ħ',     title: 'h-bar (reduced Planck)', insert: 'ħ' },
      { label: '°C',    title: 'Degrees Celsius',       insert: '°C' },
      { label: '°K',    title: 'Kelvin',                insert: 'K' },
      { label: 'Å',     title: 'Angstrom',              insert: 'Å' },
      { label: 'μm',    title: 'Micrometre',            insert: 'μm' },
      { label: 'nm',    title: 'Nanometre',             insert: 'nm' },
      { label: 'eV',    title: 'Electronvolt',          insert: 'eV' },
      { label: 'J/K',   title: 'Joules per Kelvin',     insert: 'J/K' },
      { label: 'mol⁻¹', title: 'per mole',              insert: 'HTML:mol<sup>−1</sup>' },
      { label: 'kg/m³', title: 'kilograms per cubic metre', insert: 'kg/m³' },
      { label: 'ms⁻¹',  title: 'metres per second',    insert: 'HTML:ms<sup>−1</sup>' },
      { label: 'ms⁻²',  title: 'metres per second²',   insert: 'HTML:ms<sup>−2</sup>' },
      { label: 'Ω',     title: 'Ohm',                  insert: 'Ω' },
      { label: 'μF',    title: 'Microfarad',            insert: 'μF' },
    ],
  },
  {
    key: 'states',
    label: '(s) States',
    entries: [
      { label: '(s)',   title: 'Solid state',           insert: '(s)' },
      { label: '(l)',   title: 'Liquid state',          insert: '(l)' },
      { label: '(g)',   title: 'Gas state',             insert: '(g)' },
      { label: '(aq)',  title: 'Aqueous solution',      insert: '(aq)' },
      { label: '(ppt)', title: 'Precipitate',           insert: '(ppt)' },
      { label: '⊕',    title: 'Positive charge circle', insert: '⊕' },
      { label: '⊖',    title: 'Negative charge circle', insert: '⊖' },
      { label: 'δ+',   title: 'Partial positive',      insert: 'HTML:δ<sup>+</sup>' },
      { label: 'δ−',   title: 'Partial negative',      insert: 'HTML:δ<sup>−</sup>' },
      { label: '∝',    title: 'Proportional to',       insert: '∝' },
      { label: '≡',    title: 'Identical to',          insert: '≡' },
      { label: '∴',    title: 'Therefore',             insert: '∴' },
      { label: '∵',    title: 'Because',               insert: '∵' },
    ],
  },
];

function ChemistryPicker({ editor, disabled }: { editor: any; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ions');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleInsert = (entry: ChemEntry) => {
    if (!editor) return;

    if (entry.insert.startsWith('HTML:')) {
      // Insert raw HTML — TipTap will parse sub/sup tags correctly
      const html = entry.insert.slice(5);
      editor.chain().focus().insertContent(html, {
        parseOptions: { preserveWhitespace: 'full' },
      }).run();
    } else {
      // Plain text insertion
      editor.chain().focus().insertContent(entry.insert).run();
    }

    // Keep panel open so users can insert multiple symbols quickly
  };

  const activeCategory = CHEM_CATEGORIES.find(c => c.key === activeTab)!;

  return (
    <div ref={ref} className="relative">
      <ToolbarButton
        onClick={() => setOpen(o => !o)}
        title="Chemistry & Physics symbols"
        disabled={disabled}
        isActive={open}
      >
        {/* Flask icon using text — distinguishable from Ω and Σ */}
        <span className="text-xs font-bold leading-none">⚗</span>
      </ToolbarButton>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-xl"
          style={{ width: '420px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40 rounded-t-lg">
            <span className="text-sm font-semibold">Chemistry &amp; Physics</span>
            <span className="text-xs text-muted-foreground">Click to insert • panel stays open</span>
          </div>

          {/* Category tabs */}
          <div className="flex gap-0.5 px-2 pt-2 flex-wrap">
            {CHEM_CATEGORIES.map(cat => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveTab(cat.key)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors font-medium ${
                  activeTab === cat.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Symbol grid */}
          <div className="p-2 max-h-52 overflow-y-auto">
            <div className="grid grid-cols-6 gap-1">
              {activeCategory.entries.map((entry) => (
                <button
                  key={entry.insert}
                  type="button"
                  onClick={() => handleInsert(entry)}
                  title={entry.title}
                  className="flex items-center justify-center px-1 py-2 text-xs rounded border border-border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors font-mono leading-none"
                  style={{ minHeight: '36px' }}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>

          {/* Footer hint */}
          <div className="px-3 py-1.5 border-t border-border bg-muted/30 rounded-b-lg">
            <p className="text-xs text-muted-foreground">
              Tip: Use <strong>X₂</strong> / <strong>X²</strong> toolbar buttons for custom sub/superscript on any selected text
            </p>
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