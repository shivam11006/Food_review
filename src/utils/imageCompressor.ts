// src/utils/imageCompressor.ts
// Client-side image compression using HTML5 Canvas — no external library needed

export interface CompressOptions {
  /** Maximum width in pixels (default: 1280) */
  maxWidth?: number
  /** Maximum height in pixels (default: 1280) */
  maxHeight?: number
  /** JPEG quality 0–1 (default: 0.75) */
  quality?: number
  /** Output MIME type (default: 'image/webp' with jpeg fallback) */
  mimeType?: 'image/webp' | 'image/jpeg' | 'image/png'
}

/**
 * Compresses an image File using the Canvas API.
 * Preserves aspect ratio. Returns a new compressed File.
 *
 * Typical results:
 *   - 4 MB JPEG  → ~150–300 KB
 *   - 2 MB PNG   → ~80–200 KB
 *   - Cover image (1280×720) → ~80–150 KB
 *   - Food thumbnail (800×800) → ~40–90 KB
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.75,
    mimeType = 'image/webp',
  } = options

  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      // Calculate new dimensions while preserving aspect ratio
      let { width, height } = img
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      // Draw onto canvas
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas not supported'))
        return
      }

      // White background (for transparent PNGs converted to JPEG/WebP)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)

      // Try preferred mimeType, fall back to jpeg if webp unsupported
      const tryMime = (mime: string): Promise<Blob | null> =>
        new Promise(res => canvas.toBlob(res, mime, quality))

      const finalize = async () => {
        let blob = await tryMime(mimeType)

        // Safari doesn't support webp encoding — fall back to jpeg
        if (!blob || blob.size === 0) {
          blob = await tryMime('image/jpeg')
        }

        if (!blob) {
          reject(new Error('Image compression failed'))
          return
        }

        // Build output filename with correct extension
        const ext = mimeType === 'image/webp' ? 'webp'
          : mimeType === 'image/png' ? 'png'
          : 'jpg'
        const baseName = file.name.replace(/\.[^/.]+$/, '')
        const compressedFile = new File([blob], `${baseName}.${ext}`, {
          type: blob.type,
          lastModified: Date.now(),
        })

        console.info(
          `[imageCompressor] ${file.name}: ${(file.size / 1024).toFixed(0)} KB → ` +
          `${(compressedFile.size / 1024).toFixed(0)} KB ` +
          `(${Math.round((1 - compressedFile.size / file.size) * 100)}% saved)`
        )

        resolve(compressedFile)
      }

      finalize().catch(reject)
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image for compression'))
    }

    img.src = objectUrl
  })
}

/** Preset for cover / hero images (wider, slightly lower quality) */
export const compressCover = (file: File) =>
  compressImage(file, { maxWidth: 1280, maxHeight: 720, quality: 0.72 })

/** Preset for food item thumbnails (square-ish, balanced quality) */
export const compressFood = (file: File) =>
  compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.78 })
