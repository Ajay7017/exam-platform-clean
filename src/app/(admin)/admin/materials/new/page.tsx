// src/app/(admin)/admin/materials/new/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Loader2, X, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner' // Using your existing sonner toast

export default function NewMaterialPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [thumbnailUploading, setThumbnailUploading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: 'Physics',
    type: 'PDF',
    link: '',
    thumbnailUrl: '',
    isPublished: true
  })

  // 1. EXACT SAME UPLOAD LOGIC FROM EXAM CREATION
  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setThumbnailUploading(true)
    try {
      const fd = new FormData()
      fd.append('images', file)
      const res = await fetch('/api/admin/images/upload', { method: 'POST', body: fd })
      const data = await res.json()
      const result = data.uploaded?.[0]
      if (!result?.success) throw new Error(result?.error || 'Upload failed')
      setFormData(p => ({ ...p, thumbnailUrl: result.url }))
      toast.success('Thumbnail uploaded successfully')
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload thumbnail')
    } finally {
      setThumbnailUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/admin/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to create material')
      
      toast.success('Material created successfully')
      router.push('/admin/materials')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/materials" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Material</h1>
          <p className="text-sm text-gray-500">Upload a new study resource for students.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-6">
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Resource Title *</label>
            <input
              required
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="e.g., JEE Main Physics Formula Sheet"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description *</label>
            <textarea
              required
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              placeholder="Briefly describe what this resource contains..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subject *</label>
              <select
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Biology">Biology</option>
                <option value="General">General / All Subjects</option>
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Resource Format *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="PDF">PDF Document (.pdf)</option>
                <option value="Word">Word Document (.docx)</option>
                <option value="Excel">Excel Spreadsheet (.xlsx)</option>
                <option value="PowerPoint">PowerPoint (.pptx)</option>
                <option value="Drive Folder">Google Drive Folder</option>
                <option value="Video">Video Link</option>
                <option value="Web Link">External Web Link</option>
              </select>
            </div>
          </div>

          {/* Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Resource URL (Drive/External Link) *</label>
            <input
              required
              type="url"
              value={formData.link}
              onChange={(e) => setFormData({...formData, link: e.target.value})}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="https://drive.google.com/..."
            />
          </div>

          {/* 2. EXACT SAME CLOUDINARY UPLOAD UI FROM EXAM CREATION */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Resource Thumbnail (Optional)</label>
            <p className="text-xs text-gray-400 mt-0.5 mb-2">
              Shown on the resource cards. If not set, a placeholder icon is used.
            </p>

            {formData.thumbnailUrl ? (
              <div className="relative w-full max-w-sm h-40 rounded-lg overflow-hidden border border-gray-200 group">
                <img
                  src={formData.thumbnailUrl}
                  alt="Thumbnail preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, thumbnailUrl: '' }))}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className={`flex flex-col items-center justify-center w-full max-w-sm h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                thumbnailUploading
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800'
              }`}>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  disabled={thumbnailUploading}
                  onChange={handleThumbnailUpload}
                />
                {thumbnailUploading ? (
                  <div className="flex flex-col items-center gap-2 text-blue-500">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-xs">Uploading to Cloudinary...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-gray-400">
                    <ImageIcon className="h-7 w-7" />
                    <span className="text-sm font-medium">Click to upload thumbnail</span>
                    <span className="text-xs">JPG, PNG, WEBP — max 10MB</span>
                  </div>
                )}
              </label>
            )}
          </div>

          {/* Publish Toggle */}
          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="isPublished"
              checked={formData.isPublished}
              onChange={(e) => setFormData({...formData, isPublished: e.target.checked})}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="isPublished" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              Publish immediately (visible to students on the Study Materials page)
            </label>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-200 dark:border-gray-800 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {isSubmitting ? 'Saving...' : 'Save Material'}
          </button>
        </div>
      </form>
    </div>
  )
}