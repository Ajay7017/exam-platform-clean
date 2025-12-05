// src/app/(student)/profile.page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  User, Mail, Camera, Save, Trophy, Target, Clock, Flame, Loader2, Phone, CheckCircle
} from 'lucide-react'

interface ProfileData {
  user: {
    id: string
    name: string | null
    email: string | null
    image: string | null
    phone: string | null
    phoneVerified: boolean
    role: string
    memberSince: string
  }
  stats: {
    rank: number | null
    accuracy: number
    timeSpent: number
    streak: number
    totalExams: number
  }
  achievements: {
    perfectScore: boolean
    speedDemon: boolean
    weekStreak: boolean
    fiftyExams: boolean
    top100: boolean
    allRounder: boolean
  }
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  })

  // Fetch profile data
  useEffect(() => {
    fetchProfileData()
  }, [])

  const fetchProfileData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/student/profile')
      if (!response.ok) throw new Error('Failed to fetch profile')
      
      const data = await response.json()
      setProfileData(data)
      setFormData({
        name: data.user.name || '',
        phone: data.user.phone || '',
      })
    } catch (error) {
      console.error('Error fetching profile:', error)
      setError('Failed to load profile data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)
      setSuccessMessage(null)

      // Validate phone number
      if (formData.phone && !/^[6-9]\d{9}$/.test(formData.phone)) {
        setError('Please enter a valid 10-digit Indian mobile number')
        setIsSaving(false)
        return
      }
      
      const response = await fetch('/api/student/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }
      
      // Update local state
      if (profileData) {
        setProfileData({
          ...profileData,
          user: {
            ...profileData.user,
            name: data.user.name,
            phone: data.user.phone,
          }
        })
      }

      setSuccessMessage('Profile updated successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
      
      setIsEditing(false)
    } catch (error: any) {
      console.error('Error updating profile:', error)
      setError(error.message || 'Failed to update profile')
      setTimeout(() => setError(null), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const getInitials = (name: string | null) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const achievementsList = [
    { 
      icon: '🎯', 
      name: 'Perfect Score', 
      earned: profileData?.achievements.perfectScore || false,
      description: 'Get 100% in an exam'
    },
    { 
      icon: '⚡', 
      name: 'Speed Demon', 
      earned: profileData?.achievements.speedDemon || false,
      description: 'Complete exam in record time'
    },
    { 
      icon: '🔥', 
      name: '7 Day Streak', 
      earned: profileData?.achievements.weekStreak || false,
      description: 'Practice for 7 consecutive days'
    },
    { 
      icon: '📚', 
      name: '50 Exams', 
      earned: profileData?.achievements.fiftyExams || false,
      description: 'Complete 50 exams'
    },
    { 
      icon: '🏆', 
      name: 'Top 100', 
      earned: profileData?.achievements.top100 || false,
      description: 'Reach top 100 rank'
    },
    { 
      icon: '⭐', 
      name: 'All Rounder', 
      earned: profileData?.achievements.allRounder || false,
      description: 'Master multiple subjects'
    },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!profileData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load profile data</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  <Avatar className="w-32 h-32 border-4 border-background shadow-lg">
                    <AvatarImage 
                      src={profileData.user.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileData.user.email}`} 
                      alt={profileData.user.name || 'User'} 
                    />
                    <AvatarFallback className="text-2xl">
                      {getInitials(profileData.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    className="absolute bottom-0 right-0 rounded-full shadow-lg"
                    disabled
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-1">
                  <h2 className="text-2xl font-bold">
                    {profileData.user.name || 'User'}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {profileData.user.email}
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    {profileData.user.role === 'admin' ? 'Admin' : 'Student'}
                  </Badge>
                </div>

                <Separator />

                <div className="w-full space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm">Rank</span>
                    </div>
                    <span className="font-semibold">
                      {profileData.stats.rank ? `#${profileData.stats.rank}` : 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Accuracy</span>
                    </div>
                    <span className="font-semibold">
                      {profileData.stats.accuracy.toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">Time Spent</span>
                    </div>
                    <span className="font-semibold">
                      {profileData.stats.timeSpent} hrs
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span className="text-sm">Streak</span>
                    </div>
                    <span className="font-semibold">
                      {profileData.stats.streak} days
                    </span>
                  </div>
                </div>

                <div className="w-full pt-2">
                  <p className="text-xs text-muted-foreground">
                    Member since {new Date(profileData.user.memberSince).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Achievement Badges */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Achievements</CardTitle>
              <CardDescription>
                {achievementsList.filter(a => a.earned).length} of {achievementsList.length} unlocked
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {achievementsList.map((badge, i) => (
                  <div
                    key={i}
                    className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                      badge.earned
                        ? 'bg-primary/10 border-primary hover:shadow-md'
                        : 'bg-muted/50 border-muted opacity-50'
                    }`}
                    title={badge.description}
                  >
                    <span className="text-3xl mb-1">{badge.icon}</span>
                    <span className="text-xs text-center font-medium leading-tight">
                      {badge.name}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </div>
              {!isEditing ? (
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false)
                      setFormData({ 
                        name: profileData.user.name || '',
                        phone: profileData.user.phone || ''
                      })
                    }}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Enter your name"
                    className="pl-10"
                    disabled={!isEditing}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-10"
                    disabled
                    value={profileData.user.email || ''}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    className="pl-10"
                    disabled={!isEditing}
                    value={formData.phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                      setFormData({ ...formData, phone: value })
                    }}
                    maxLength={10}
                  />
                  {profileData.user.phoneVerified && !isEditing && (
                    <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500" />
                  )}
                </div>
                {!profileData.user.phone && (
                  <p className="text-xs text-red-500">
                    Please add your phone number to continue
                  </p>
                )}
                {isEditing && (
                  <p className="text-xs text-muted-foreground">
                    Enter a valid 10-digit Indian mobile number (starting with 6-9)
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Exam Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Exam Statistics</CardTitle>
              <CardDescription>Your overall performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total Exams Taken</p>
                  <p className="text-3xl font-bold">{profileData.stats.totalExams}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Average Accuracy</p>
                  <p className="text-3xl font-bold">{profileData.stats.accuracy.toFixed(1)}%</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Current Streak</p>
                  <p className="text-3xl font-bold">{profileData.stats.streak} days</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Time Investment</p>
                  <p className="text-3xl font-bold">{profileData.stats.timeSpent}h</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>Irreversible account actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full sm:w-auto" disabled>
                Reset Progress
              </Button>
              <Button variant="destructive" className="w-full sm:w-auto" disabled>
                Delete Account
              </Button>
              <p className="text-xs text-muted-foreground">
                These features are currently disabled
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}