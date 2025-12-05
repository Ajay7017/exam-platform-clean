// src/components/student/RecommendedExams.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, FileText, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import examsData from '@/data/exams.json'

export function RecommendedExams() {
  // Get first 3 exams as recommended
  const recommended = examsData.exams.slice(0, 3)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recommended for You</CardTitle>
        <CardDescription>Based on your performance and study pattern</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recommended.map((exam) => (
            <div key={exam.id} className="flex gap-4 p-4 rounded-lg border hover:border-primary transition-colors group">
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Badge variant="outline" className="mb-2">
                      {exam.subject}
                    </Badge>
                    <h4 className="font-semibold group-hover:text-primary transition-colors">
                      {exam.title}
                    </h4>
                  </div>
                  {exam.isFree && (
                    <Badge className="bg-green-500">Free</Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{exam.duration} min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    <span>{exam.totalQuestions} questions</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/exams/${exam.slug}`}>
                      View Details
                    </Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href={`/exam-interface/${exam.id}`}>
                      Start Exam
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}