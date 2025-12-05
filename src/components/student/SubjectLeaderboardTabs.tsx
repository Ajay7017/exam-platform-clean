// src/components/student/SubjectLeaderboardTabs.tsx
'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeaderboardCard } from './LeaderboardCard';
import { Globe } from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  slug: string;
}

export function SubjectLeaderboardTabs() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const response = await fetch('/api/subjects');
      if (!response.ok) throw new Error('Failed to fetch subjects');
      const data = await response.json();
      setSubjects(data.subjects || []);
    } catch (error) {
      console.error('Failed to load subjects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 rounded w-full" />
        <div className="h-96 bg-gray-100 rounded" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="global" className="space-y-4">
      <TabsList className="grid w-full" style={{ 
        gridTemplateColumns: `repeat(${Math.min(subjects.length + 1, 5)}, 1fr)` 
      }}>
        <TabsTrigger value="global" className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          All Time
        </TabsTrigger>
        {subjects.slice(0, 4).map(subject => (
          <TabsTrigger key={subject.id} value={subject.id}>
            {subject.name}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="global" className="space-y-4">
        <LeaderboardCard type="global" limit={25} showTitle={false} />
      </TabsContent>

      {subjects.map(subject => (
        <TabsContent key={subject.id} value={subject.id} className="space-y-4">
          <LeaderboardCard 
            type="subject" 
            subjectId={subject.id} 
            limit={25} 
            showTitle={false}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}