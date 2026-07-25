// Phone camera photos routinely run 3-8MB — resized/recompressed
// client-side before upload so a single photo doesn't eat a large chunk of
// the Storage free-tier quota. 1600px is plenty for a feed image viewed on
// a phone screen (callers needing a smaller render, like an avatar, pass a
// lower maxDimension); JPEG at 0.82 keeps visible quality while cutting
// size significantly versus the original.
const DEFAULT_MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.82

export async function compressImage(
  file: File,
  maxDimension: number = DEFAULT_MAX_DIMENSION,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error("Impossible de traiter l'image.")
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Échec de la compression de l'image."))),
      'image/jpeg',
      JPEG_QUALITY,
    )
  })
}
