'use client'

import { useState } from 'react'
import {
  FileText, Download, CheckCircle2, Clock,
  BookOpen, ExternalLink, X, Upload
} from 'lucide-react'

interface Resource {
  id: string
  label: string
  type: string
  driveLink: string | null
  fileUrl: string | null
  status: 'COMING_SOON' | 'LIVE' | 'REMOVED'
  sortOrder: number
}

const TYPE_LABELS: Record<string, string> = {
  QUESTION_PAPER: 'Question Paper',
  ANSWER_KEY: 'Answer Key',
  SOLUTIONS: 'Solutions / Explanations',
  OTHER: 'Resource',
}

const TYPE_ICONS: Record<string, any> = {
  QUESTION_PAPER: FileText,
  ANSWER_KEY: CheckCircle2,
  SOLUTIONS: BookOpen,
  OTHER: Download,
}

// ── PDF Viewer Modal ───────────────────────────────────────────────────────
function PDFViewerModal({
  url,
  label,
  onClose,
}: {
  url: string
  label: string
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-500" />
          <span className="font-semibold text-sm text-gray-800 truncate max-w-xs">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          
            <a href={`/api/pdf-proxy?url=${encodeURIComponent(url)}`}
            download="document.pdf"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </a>
          <button
            onClick={onClose}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Close
          </button>
        </div>
      </div>

      {/* PDF iframe — Google viewer proxy handles Cloudinary's attachment header */}
      <iframe
        src={`/api/pdf-proxy?url=${encodeURIComponent(url)}`}
        className="flex-1 w-full"
        title={label}
        style={{ border: 'none' }}
      />
    </div>
  )
}

// ── Resource Card ──────────────────────────────────────────────────────────
function ResourceCard({
  resource,
  onView,
}: {
  resource: Resource
  onView: (resource: Resource) => void
}) {
  const Icon = TYPE_ICONS[resource.type] || FileText
  const isLive = resource.status === 'LIVE'
  const hasCloudinaryPdf = isLive && !!resource.fileUrl
  const hasDriveLink = isLive && !!resource.driveLink

  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
      isLive
        ? 'bg-white border-gray-200 hover:border-blue-200 hover:shadow-sm'
        : 'bg-gray-50 border-gray-100'
    }`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isLive ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'
      }`}>
        <Icon className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm ${isLive ? 'text-gray-900' : 'text-gray-400'}`}>
          {resource.label}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {TYPE_LABELS[resource.type] || resource.type}
        </p>
      </div>

      {/* Actions */}
      {hasCloudinaryPdf ? (
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onView(resource)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            View PDF
          </button>
          
            <a href={`/api/pdf-proxy?url=${encodeURIComponent(resource.fileUrl!)}`}
            download="document.pdf"
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </a>
        </div>
      ) : hasDriveLink ? (
        
          <a href={resource.driveLink!}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open
        </a>
      ) : isLive ? (
        <span className="flex items-center gap-1 text-xs text-green-600 font-medium shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5" /> Available
        </span>
      ) : (
        <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-100 rounded-lg shrink-0">
          <Clock className="w-3 h-3" />
          Coming Soon
        </span>
      )}
    </div>
  )
}

// ── Main Export ────────────────────────────────────────────────────────────
export function ResourceSection({ resources }: { resources: Resource[] }) {
  const [viewingResource, setViewingResource] = useState<Resource | null>(null)

  if (resources.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm font-medium">Resources coming soon</p>
        <p className="text-xs mt-1">Check back after the exam</p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Downloads & Resources</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Click 'View PDF' to read in browser, or 'Download' to save.
          </p>
        </div>
        <div className="p-4 space-y-3">
          {resources.map(resource => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onView={setViewingResource}
            />
          ))}
        </div>
      </div>

      {/* PDF Modal */}
      {viewingResource?.fileUrl && (
        <PDFViewerModal
          url={viewingResource.fileUrl}
          label={viewingResource.label}
          onClose={() => setViewingResource(null)}
        />
      )}
    </>
  )
}