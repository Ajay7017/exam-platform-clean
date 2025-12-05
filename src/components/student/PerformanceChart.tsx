// src/components/student/PerformanceChart.tsx
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const data = [
  { date: 'Oct 15', score: 72 },
  { date: 'Oct 18', score: 75 },
  { date: 'Oct 20', score: 78 },
  { date: 'Oct 23', score: 82 },
  { date: 'Oct 25', score: 85 },
  { date: 'Oct 28', score: 88 },
  { date: 'Oct 30', score: 84 }
]

export function PerformanceChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Trend</CardTitle>
        <CardDescription>Your score progression over the last 2 weeks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tick={{ fill: 'currentColor' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'currentColor' }}
                domain={[0, 100]}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
                name="Score (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}