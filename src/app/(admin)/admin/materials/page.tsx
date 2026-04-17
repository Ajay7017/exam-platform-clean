// src/app/(admin)/admin/materials/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, FileText, CheckCircle2, XCircle, ExternalLink } from 'lucide-react'

export default function AdminMaterialsPage() {
  const [materials, setMaterials] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchMaterials()
  }, [])

  const fetchMaterials = async () => {
    try {
      const res = await fetch('/api/admin/materials')
      const data = await res.json()
      setMaterials(data.materials || [])
    } catch (error) {
      console.error('Failed to fetch materials:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Study Materials</h1>
          <p className="text-gray-500 text-sm mt-1">Manage PDFs, Drive links, and resources.</p>
        </div>
        <Link 
          href="/admin/materials/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm w-fit"
        >
          <Plus className="w-4 h-4" />
          Add Material
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              <tr>
                <th className="px-6 py-4 font-medium">Title</th>
                <th className="px-6 py-4 font-medium">Subject</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading materials...</td>
                </tr>
              ) : materials.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No study materials found. Click 'Add Material' to create one.</td>
                </tr>
              ) : (
                materials.map((material) => (
                  <tr key={material.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 dark:text-white">{material.title}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                        {material.subject}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> {material.type}
                    </td>
                    <td className="px-6 py-4">
                      {material.isPublished ? (
                        <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                          <CheckCircle2 className="w-4 h-4" /> Published
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-500 text-xs font-medium">
                          <XCircle className="w-4 h-4" /> Draft
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a 
                        href={material.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium text-xs"
                      >
                        View Link <ExternalLink className="w-3 h-3" />
                      </a>
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