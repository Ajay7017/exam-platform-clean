//src/app/not-found.tsx
import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <FileQuestion className="h-8 w-8 text-gray-400" />
        </div>
        <h1 className="mt-6 text-6xl font-bold text-gray-900">404</h1>
        <p className="mt-2 text-xl font-semibold text-gray-900">Page not found</p>
        <p className="mt-2 text-sm text-gray-600">
          Sorry, we couldn't find the page you're looking for.
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link href="/">Go back home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}