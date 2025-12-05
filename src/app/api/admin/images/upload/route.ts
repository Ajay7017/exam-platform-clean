// src/app/api/admin/images/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'
import { uploadImage } from '@/lib/cloudinary'
import { optimizeImage, sanitizeFilename } from '@/lib/image-optimizer'

interface UploadResult {
  filename: string
  originalName: string
  url: string
  publicId: string
  size: number
  success: boolean
  error?: string
}

/**
 * POST /api/admin/images/upload
 * Upload multiple images at once
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const formData = await request.formData()
    const files = formData.getAll('images') as File[]

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    if (files.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 files allowed per upload' },
        { status: 400 }
      )
    }

    const results: UploadResult[] = []
    const uploadPromises = files.map(async (file) => {
      try {
        // Validate file
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
          return {
            filename: file.name,
            originalName: file.name,
            url: '',
            publicId: '',
            size: file.size,
            success: false,
            error: 'Invalid file type',
          }
        }

        const maxSize = 10 * 1024 * 1024 // 10MB
        if (file.size > maxSize) {
          return {
            filename: file.name,
            originalName: file.name,
            url: '',
            publicId: '',
            size: file.size,
            success: false,
            error: 'File too large (max 10MB)',
          }
        }

        // Read file buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Optimize image
        const optimizedBuffer = await optimizeImage(buffer, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 85,
        })

        // Sanitize filename
        const sanitizedName = sanitizeFilename(file.name)

        // Upload to Cloudinary
        const { url, publicId } = await uploadImage(optimizedBuffer, sanitizedName)

        return {
          filename: sanitizedName,
          originalName: file.name,
          url,
          publicId,
          size: file.size,
          success: true,
        }
      } catch (error: any) {
        console.error(`Error uploading ${file.name}:`, error)
        return {
          filename: file.name,
          originalName: file.name,
          url: '',
          publicId: '',
          size: file.size,
          success: false,
          error: error.message || 'Upload failed',
        }
      }
    })

    const uploadResults = await Promise.all(uploadPromises)

    // Generate CSV content
    const successfulUploads = uploadResults.filter(r => r.success)
    const csvContent = [
      'filename,url',
      ...successfulUploads.map(r => `${r.filename},${r.url}`),
    ].join('\n')

    return NextResponse.json({
      success: true,
      uploaded: uploadResults,
      csvContent,
      summary: {
        total: uploadResults.length,
        successful: successfulUploads.length,
        failed: uploadResults.length - successfulUploads.length,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}