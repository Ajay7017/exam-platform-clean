//src/lib/image-optimizer.ts
import sharp from 'sharp'

interface OptimizeOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
}

/**
 * Optimize image before upload
 * - Resize if too large
 * - Compress
 * - Convert to optimal format
 */
export async function optimizeImage(
  buffer: Buffer,
  options: OptimizeOptions = {}
): Promise<Buffer> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 85,
  } = options

  let image = sharp(buffer)

  // Get metadata
  const metadata = await image.metadata()

  // Resize if needed (maintain aspect ratio)
  if (
    metadata.width &&
    metadata.height &&
    (metadata.width > maxWidth || metadata.height > maxHeight)
  ) {
    image = image.resize(maxWidth, maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    })
  }

  // Optimize based on format
  const format = metadata.format

  if (format === 'jpeg' || format === 'jpg') {
    return await image.jpeg({ quality, progressive: true }).toBuffer()
  } else if (format === 'png') {
    return await image.png({ quality, compressionLevel: 9 }).toBuffer()
  } else if (format === 'webp') {
    return await image.webp({ quality }).toBuffer()
  } else {
    // Convert other formats to WebP
    return await image.webp({ quality }).toBuffer()
  }
}

/**
 * Validate image file
 */
export function validateImage(file: File): { valid: boolean; error?: string } {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.',
    }
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 10MB.',
    }
  }

  return { valid: true }
}

/**
 * Generate filename from original name
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}