// src/app/(admin)/admin/images/page.tsx
'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Upload, Download, Trash2, Image as ImageIcon, Loader2, CheckCircle, XCircle } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface UploadedImage {
  filename: string
  originalName: string
  url: string
  publicId: string
  size: number
  success: boolean
  error?: string
}

export default function AdminImagesPage() {
  const [uploading, setUploading] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [csvContent, setCsvContent] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Validate files
    const validFiles: File[] = []
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name}: Invalid file type`)
        continue
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: File too large (max 10MB)`)
        continue
      }
      validFiles.push(file)
    }

    if (validFiles.length === 0) {
      return
    }

    if (validFiles.length > 50) {
      toast.error('Maximum 50 files allowed per upload')
      return
    }

    await uploadFiles(validFiles)
  }

  const uploadFiles = async (files: File[]) => {
    setUploading(true)
    toast.info(`Uploading ${files.length} images...`)

    try {
      const formData = new FormData()
      files.forEach(file => {
        formData.append('images', file)
      })

      const response = await fetch('/api/admin/images/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const data = await response.json()

      setUploadedImages(data.uploaded)
      setCsvContent(data.csvContent)

      toast.success(
        `Successfully uploaded ${data.summary.successful} of ${data.summary.total} images`
      )

      if (data.summary.failed > 0) {
        toast.warning(`${data.summary.failed} images failed to upload`)
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Failed to upload images')
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const downloadCSV = () => {
    if (!csvContent) {
      toast.error('No CSV data available')
      return
    }

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `image-mapping-${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    toast.success('CSV downloaded')
  }

  const clearResults = () => {
    setUploadedImages([])
    setCsvContent('')
    toast.info('Results cleared')
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Image Upload</h1>
        <p className="text-gray-600 mt-1">
          Upload question diagrams and images for bulk import
        </p>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg border p-8 mb-6">
        <div className="flex flex-col items-center justify-center">
          <div className="w-full max-w-xl">
            {/* Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                uploading
                  ? 'border-gray-300 bg-gray-50'
                  : 'border-gray-300 hover:border-primary cursor-pointer'
              }`}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />

              {uploading ? (
                <>
                  <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
                  <p className="text-lg font-medium">Uploading images...</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Please wait while we process your files
                  </p>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-sm text-gray-500">
                    JPEG, PNG, WebP (max 10MB per file, 50 files max)
                  </p>
                </>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                Select Files
              </Button>

              {uploadedImages.length > 0 && (
                <>
                  <Button
                    onClick={downloadCSV}
                    variant="outline"
                    disabled={!csvContent}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV
                  </Button>
                  <Button
                    onClick={clearResults}
                    variant="outline"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      {uploadedImages.length > 0 && (
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Upload Results</h2>
            <p className="text-sm text-gray-600 mt-1">
              {uploadedImages.filter(i => i.success).length} successful,{' '}
              {uploadedImages.filter(i => !i.success).length} failed
            </p>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Status</TableHead>
                  <TableHead>Filename</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>URL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploadedImages.map((image, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {image.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {image.filename}
                    </TableCell>
                    <TableCell>
                      {image.success ? (
                        <img
                          src={image.url}
                          alt={image.filename}
                          className="w-16 h-16 object-cover rounded border"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatFileSize(image.size)}
                    </TableCell>
                    <TableCell>
                      {image.success ? (
                        <a
                          href={image.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline truncate block max-w-xs"
                        >
                          {image.url}
                        </a>
                      ) : (
                        <span className="text-sm text-red-600">
                          {image.error}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">How to use:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
          <li>Upload all your question diagrams/images (max 50 at once)</li>
          <li>Download the CSV file (contains filename → URL mapping)</li>
          <li>Use the CSV when importing questions from Word document</li>
          <li>
            In your Word doc, reference images like:{' '}
            <code className="bg-blue-100 px-2 py-0.5 rounded">
              [IMAGE: diagram-1.png]
            </code>
          </li>
        </ol>
      </div>
    </div>
  )
}