'use client';

// src/components/admin/KetcherModal.tsx

import { useEffect, useRef, useState } from 'react';
import { Loader2, X, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface KetcherModalProps {
  open: boolean;
  onClose: () => void;
  onInsert: (imageUrl: string) => void;
}

let ketcherInstance: any = null;

export function KetcherModal({ open, onClose, onInsert }: KetcherModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady]         = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading]     = useState(false);
  const mountedRef = useRef(false);
  const rootRef    = useRef<any>(null);

  useEffect(() => {
    if (!open || mountedRef.current) return;
    if (typeof window === 'undefined') return;

    // ── Inject Ketcher CSS once from public folder ─────────────────────────
    // Run: copy node_modules\ketcher-react\dist\index.css public\ketcher.css
    if (!document.getElementById('ketcher-css')) {
      const link = document.createElement('link');
      link.id = 'ketcher-css';
      link.rel = 'stylesheet';
      link.href = '/ketcher.css';
      document.head.appendChild(link);
    }

    let cancelled = false;

    const init = async () => {
      setLoading(true);
      try {
        const [
          React,
          ReactDOM,
          { Editor },
          { StandaloneStructServiceProvider },
        ] = await Promise.all([
          import('react'),
          import('react-dom/client'),
          import('ketcher-react'),
          import('ketcher-standalone'),
        ]);

        if (cancelled || !containerRef.current) return;

        const structServiceProvider = new StandaloneStructServiceProvider();

        if (!rootRef.current) {
          rootRef.current = ReactDOM.createRoot(containerRef.current);
        }

        rootRef.current.render(
          React.createElement(Editor, {
            staticResourcesUrl: '',
            structServiceProvider,
            onInit: (ketcher: any) => {
              ketcherInstance = ketcher;
              mountedRef.current = true;
              setReady(true);
            },
            errorHandler: (err: string) => {
              console.error('Ketcher error:', err);
            },
          })
        );
      } catch (err) {
        console.error('Failed to load Ketcher:', err);
        toast.error('Failed to load structure editor');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();
    return () => { cancelled = true; };
  }, [open]);

const handleInsert = async () => {
  if (!ketcherInstance) { toast.error('Editor not ready yet'); return; }
  try {
    setUploading(true);

    console.log('ketcher instance methods:', Object.keys(ketcherInstance));

    const smiles = await ketcherInstance.getSmiles();
    console.log('smiles:', smiles);

    if (!smiles || smiles.trim() === '') {
      toast.error('Please draw a structure first');
      return;
    }

    const molfile = await ketcherInstance.getMolfile();
    console.log('molfile:', molfile);

    const pngBlob: Blob = await ketcherInstance.generateImage(molfile, {
      outputFormat: 'png',
      scaling: 3,
    });
    console.log('pngBlob:', pngBlob, 'type:', pngBlob?.type, 'size:', pngBlob?.size);

    const file = new File([pngBlob], `structure-${Date.now()}.png`, {
      type: 'image/png',
    });

    const formData = new FormData();
    formData.append('images', file);

    const res = await fetch('/api/admin/images/upload', { method: 'POST', body: formData });
    const data = await res.json();
    console.log('upload response:', data);

    const uploaded = data.uploaded?.[0];
    if (!uploaded?.success || !uploaded?.url) throw new Error(uploaded?.error || 'Upload failed');

    onInsert(uploaded.url);
    onClose();
    toast.success('Structure inserted into editor');
  } catch (err: any) {
    console.error('FULL ERROR:', err);
    toast.error(err.message || 'Failed to insert structure');
  } finally {
    setUploading(false);
  }
};

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative flex flex-col bg-white rounded-xl shadow-2xl"
        style={{ width: '90vw', maxWidth: '1100px', height: '85vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-gray-900">Structure Editor</h2>
            <span className="text-xs text-gray-400 ml-1">Draw your structure, then click Insert</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Ketcher container */}
        <div className="relative flex-1 overflow-hidden">
          {(loading || !ready) && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-gray-500">Loading structure editor…</p>
              <p className="text-xs text-gray-400">First load may take a few seconds</p>
            </div>
          )}
          <div
            ref={containerRef}
            className="w-full h-full"
            style={{ visibility: ready ? 'visible' : 'hidden' }}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl flex-shrink-0">
          <p className="text-xs text-gray-400">
            Tip: Use <strong>Templates</strong> in the toolbar for benzene, cyclohexane &amp; other ring structures
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={uploading}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleInsert} disabled={!ready || uploading}>
              {uploading
                ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Inserting…</>
                : <><FlaskConical className="h-3.5 w-3.5 mr-1.5" />Insert Structure</>
              }
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}