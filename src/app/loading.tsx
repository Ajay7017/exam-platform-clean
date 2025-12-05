// src/app/loading.tsx
import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary-500" />
        <p className="mt-4 text-sm text-gray-600">Loading...</p>
      </div>
    </div>
  );
}