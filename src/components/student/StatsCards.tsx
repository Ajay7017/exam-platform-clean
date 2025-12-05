// src/components/student/StatsCards.tsx
import { Card, CardContent } from '@/components/ui/card'
import { FileText, Target, Trophy, Clock } from 'lucide-react'

const stats = [
  {
    icon: FileText,
    label: 'Exams Taken',
    value: '12',
    change: '+3 this week',
    changeType: 'positive' as const,
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-400'
  },
  {
    icon: Target,
    label: 'Average Score',
    value: '84.5%',
    change: '+5.2% from last month',
    changeType: 'positive' as const,
    color: 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-400'
  },
  {
    icon: Trophy,
    label: 'Current Rank',
    value: '#147',
    change: 'Top 5% nationwide',
    changeType: 'neutral' as const,
    color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-400'
  },
  {
    icon: Clock,
    label: 'Time Spent',
    value: '45 hrs',
    change: 'This month',
    changeType: 'neutral' as const,
    color: 'text-purple-600 bg-purple-100 dark:bg-purple-900 dark:text-purple-400'
  }
]

export function StatsCards() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.label} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className={`text-xs ${
                    stat.changeType === 'positive' 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-muted-foreground'
                  }`}>
                    {stat.change}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}