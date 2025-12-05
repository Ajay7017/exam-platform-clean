// src/components/student/ExamFilters.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

const subjects = [
  'Computer Science',
  'Mathematics',
  'General Awareness',
  'Biology',
  'General Studies',
  'Quantitative Aptitude'
]

const difficulties = ['Easy', 'Medium', 'Hard']

const durations = [
  { label: 'Less than 1 hour', value: '<60' },
  { label: '1-2 hours', value: '60-120' },
  { label: 'More than 2 hours', value: '>120' }
]

interface ExamFiltersProps {
  onFilterChange?: (filters: any) => void
}

export function ExamFilters({ onFilterChange }: ExamFiltersProps) {
  const [priceRange, setPriceRange] = useState([0])

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="text-lg">Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Subject Filter */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Subject</Label>
          <div className="space-y-2">
            {subjects.map((subject) => (
              <div key={subject} className="flex items-center space-x-2">
                <Checkbox id={subject} />
                <label
                  htmlFor={subject}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {subject}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Difficulty Filter */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Difficulty</Label>
          <div className="space-y-2">
            {difficulties.map((difficulty) => (
              <div key={difficulty} className="flex items-center space-x-2">
                <Checkbox id={difficulty} />
                <label
                  htmlFor={difficulty}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {difficulty}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Price Range Filter */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Price Range</Label>
            <span className="text-sm text-muted-foreground">
              ₹0 - ₹{priceRange[0]}
            </span>
          </div>
          <Slider
            value={priceRange}
            onValueChange={setPriceRange}
            max={1000}
            step={50}
            className="w-full"
          />
        </div>

        {/* Duration Filter */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Duration</Label>
          <div className="space-y-2">
            {durations.map((duration) => (
              <div key={duration.value} className="flex items-center space-x-2">
                <Checkbox id={duration.value} />
                <label
                  htmlFor={duration.value}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {duration.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-4 border-t">
          <Button className="w-full">Apply Filters</Button>
          <Button variant="outline" className="w-full">Reset All</Button>
        </div>
      </CardContent>
    </Card>
  )
}