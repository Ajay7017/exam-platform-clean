// src/components/student/ExamCardSkeleton.tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function ExamCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-0">
        <Skeleton className="h-48 w-full rounded-t-lg" />
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}