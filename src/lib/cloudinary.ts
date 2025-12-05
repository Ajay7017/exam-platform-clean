//src/lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

// Disable SSL verification for development (fixes certificate issues)
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

export default cloudinary

/**
 * Upload image to Cloudinary
 * @param file File buffer
 * @param filename Original filename
 * @returns Public URL of uploaded image
 */
export async function uploadImage(
  buffer: Buffer,
  filename: string
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'exam-questions', // Organize in folder
        public_id: filename.replace(/\.[^/.]+$/, ''), // Remove extension
        resource_type: 'image',
        // Optimize settings
        format: 'webp', // Convert to WebP for better compression
        quality: 'auto:good',
        fetch_format: 'auto',
      },
      (error, result) => {
        if (error) {
          reject(error)
        } else if (result) {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          })
        }
      }
    )

    uploadStream.end(buffer)
  })
}

/**
 * Delete image from Cloudinary
 */
export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId)
}

/**
 * Delete multiple images
 */
export async function deleteImages(publicIds: string[]): Promise<void> {
  await cloudinary.api.delete_resources(publicIds)
}