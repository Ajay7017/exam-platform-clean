'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, CalendarDays, CheckCircle2, XCircle, Pencil, Trash2, Loader2, Bell } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminExamEventsPage() {
  const [examEvents, setExamEvents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchExamEvents()
  }, [])

  const fetchExamEvents = async () => {
    try {
      const res = await fetch('/api/admin/exam-events')
      const data = await res.json()
      setExamEvents(data.examEvents || [])
    } catch (error) {
      console.error('Failed to fetch exam events:', error)
      toast.error('Failed to load exam events')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${title}"? This will also delete all its resources.`)
    if (!confirmed) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/exam-events/${id}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete')
      toast.success('Exam event deleted successfully')
      setExamEvents(prev => prev.filter(e => e.id !== id))
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Exam Events</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage answer key pages for NEET, JEE, CUET and other exams.
          </p>
        </div>
        <Link
          href="/admin/exam-events/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm w-fit"
        >
          <Plus className="w-4 h-4" />
          New Exam Event
        </Link>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              <tr>
                <th className="px-6 py-4 font-medium">Event</th>
                <th className="px-6 py-4 font-medium">Exam Date</th>
                <th className="px-6 py-4 font-medium">Resources</th>
                <th className="px-6 py-4 font-medium">Popup</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading exam events...
                  </td>
                </tr>
              ) : examEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    No exam events yet. Click 'New Exam Event' to create one.
                  </td>
                </tr>
              ) : (
                examEvents.map((event) => (
                  <tr
                    key={event.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    {/* Event title + slug */}
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {event.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">/{event.slug}</p>
                    </td>

                    {/* Exam date */}
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {formatDate(event.examDate)}
                      </span>
                    </td>

                    {/* Resource count */}
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                        {event.resourceCount} resource{event.resourceCount !== 1 ? 's' : ''}
                      </span>
                    </td>

                    {/* Popup status */}
                    <td className="px-6 py-4">
                      {event.popupEnabled ? (
                        <span className="flex items-center gap-1 text-amber-600 text-xs font-medium">
                          <Bell className="w-3.5 h-3.5" /> On
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Off</span>
                      )}
                    </td>

                    {/* Published status */}
                    <td className="px-6 py-4">
                      {event.status === 'PUBLISHED' ? (
                        <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                          <CheckCircle2 className="w-4 h-4" /> Published
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-500 text-xs font-medium">
                          <XCircle className="w-4 h-4" /> Draft
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/exam-events/${event.id}/edit`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <Pencil className="w-3 h-3" /> Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(event.id, event.title)}
                          disabled={deletingId === event.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {deletingId === event.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Trash2 className="w-3 h-3" />
                          }
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}