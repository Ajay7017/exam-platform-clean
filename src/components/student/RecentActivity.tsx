// src/components/student/RecentActivity.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Clock } from 'lucide-react'
import Link from 'next/link'

const activities = [
  {
    id: 1,
    type: 'completed',
    title: 'GATE CS Mock Test 2025 - 1',
    score: 78.5,
    time: '2 days ago',
    status: 'passed'
  },
  {
    id: 2,
    type: 'completed',
    title: 'SSC CGL Tier 1 Practice Test',
    score: 82.5,
    time: '5 days ago',
    status: 'passed'
  },
  {
    id: 3,
    type: 'in-progress',
    title: 'JEE Advanced Mathematics',
    progress: 45,
    time: 'Started yesterday',
    status: 'in-progress'
  }
]

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Your latest exam attempts and progress</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <Link
              key={activity.id}
              href={activity.status === 'in-progress' ? `/exam-interface/${activity.id}` : `/results/${activity.id}`}
              className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted transition-colors group"
            >
              <div className={`p-2 rounded-full ${
                activity.status === 'passed' 
                  ? 'bg-green-100 dark:bg-green-900' 
                  : 'bg-blue-100 dark:bg-blue-900'
              }`}>
                {activity.status === 'passed' ? (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              
              <div className="flex-1 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium group-hover:text-primary transition-colors">
                    {activity.title}
                  </p>
                  {activity.status === 'passed' && (
                    <Badge variant="secondary" className="text-xs">
                      {activity.score}%
                    </Badge>
                  )}
                  {activity.status === 'in-progress' && (
                    <Badge variant="outline" className="text-xs">
                      {activity.progress}% done
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{activity.time}</p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}