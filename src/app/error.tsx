// src/app/error.tsx
'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-error-100">
          <AlertTriangle className="h-8 w-8 text-error-500" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          Something went wrong!
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          We encountered an unexpected error. Please try again.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={() => reset()}>Try again</Button>
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            Go home
          </Button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 rounded-lg bg-gray-100 p-4 text-left">
            <p className="text-xs font-mono text-gray-700">{error.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}