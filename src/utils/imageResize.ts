/**
 * Utility functions for resizing and compressing images
 * Optimized for Firebase Firestore storage limits (~1MB per document)
 */

/**
 * Resize and compress an image file
 * @param file The image file to resize
 * @param maxWidth Maximum width in pixels (default: 800)
 * @param maxHeight Maximum height in pixels (default: 600)
 * @param quality JPEG quality (0-1, default: 0.8)
 * @param maxSizeBytes Maximum file size in bytes (default: 500KB)
 * @returns Promise<string> Base64 data URL of the resized image
 */
export async function resizeImage(
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 600,
  quality: number = 0.8,
  maxSizeBytes: number = 500 * 1024 // 500KB
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = calculateDimensions(img.width, img.height, maxWidth, maxHeight)

        // Set canvas dimensions
        canvas.width = width
        canvas.height = height

        // Draw and compress the image
        ctx!.drawImage(img, 0, 0, width, height)

        // Convert to blob and check size
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create image blob'))
              return
            }

            // If blob is still too large, reduce quality further
            if (blob.size > maxSizeBytes && quality > 0.5) {
              const newQuality = Math.max(0.5, quality - 0.1)
              resizeImage(file, maxWidth, maxHeight, newQuality, maxSizeBytes)
                .then(resolve)
                .catch(reject)
              return
            }

            // If still too large, reduce dimensions
            if (blob.size > maxSizeBytes && (maxWidth > 400 || maxHeight > 300)) {
              const newMaxWidth = Math.max(400, maxWidth - 100)
              const newMaxHeight = Math.max(300, maxHeight - 100)
              resizeImage(file, newMaxWidth, newMaxHeight, quality, maxSizeBytes)
                .then(resolve)
                .catch(reject)
              return
            }

            // Convert blob to base64 data URL
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = () => reject(new Error('Failed to read resized image'))
            reader.readAsDataURL(blob)
          },
          'image/jpeg',
          quality
        )
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => reject(new Error('Failed to load image'))

    // Create object URL for the image
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Calculate optimal dimensions while maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth
  let height = originalHeight

  // Scale down if larger than max dimensions
  if (width > maxWidth) {
    height = (height * maxWidth) / width
    width = maxWidth
  }

  if (height > maxHeight) {
    width = (width * maxHeight) / height
    height = maxHeight
  }

  return { width: Math.round(width), height: Math.round(height) }
}

/**
 * Estimate base64 size from image dimensions and quality
 * Useful for determining if resizing is needed before processing
 */
export function estimateBase64Size(width: number, height: number, quality: number = 0.8): number {
  // Rough estimation: JPEG compression ratio varies, but typically 10-30 bytes per pixel
  const pixels = width * height
  const compressionRatio = quality * 20 + 10 // Rough estimate: 10-30 bytes per pixel
  return Math.round(pixels * compressionRatio * 1.37) // Base64 encoding adds ~37% overhead
}

/**
 * Resize a data URL for Firebase storage.
 * Use original for OCR, then call this before saving.
 */
export function resizeDataUrl(
  dataUrl: string,
  maxSizeBytes: number = 500 * 1024,
  maxDim: number = 800,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('No canvas context'))
        return
      }
      let w = img.width
      let h = img.height
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = (h * maxDim) / w
          w = maxDim
        } else {
          w = (w * maxDim) / h
          h = maxDim
        }
      }
      canvas.width = w
      canvas.height = h
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'))
            return
          }
          if (blob.size > maxSizeBytes && (maxDim > 400 || quality > 0.5)) {
            const nextDim = Math.max(400, maxDim - 100)
            const nextQ = Math.max(0.5, quality - 0.1)
            resizeDataUrl(dataUrl, maxSizeBytes, nextDim, nextQ)
              .then(resolve)
              .catch(reject)
            return
          }
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(new Error('Failed to read blob'))
          reader.readAsDataURL(blob)
        },
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = dataUrl
  })
}

/**
 * Check if an image file needs resizing based on estimated size
 */
export function needsResizing(file: File, maxSizeBytes: number = 500 * 1024): boolean {
  // For rough estimation, assume a 4MP image would be ~3-5MB uncompressed
  // Most phone cameras take photos larger than our limits
  if (file.size > maxSizeBytes * 2) {
    return true
  }

  // Check file type - JPEGs are usually already compressed
  if (file.type === 'image/jpeg' && file.size <= maxSizeBytes) {
    return false
  }

  // PNGs and other formats often need resizing
  return file.type !== 'image/jpeg' || file.size > maxSizeBytes
}