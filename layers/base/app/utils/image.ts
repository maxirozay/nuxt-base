export async function formatImage(
  file: File,
  maxHeight?: number,
  format: string = 'webp',
  quality: number = 0.8,
): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })

  try {
    const ratio = maxHeight ? Math.min(1, maxHeight / bitmap.height) : 1
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * ratio)
    canvas.height = Math.round(bitmap.height * ratio)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no canvas')

    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, `image/${format}`, quality),
    )
    if (!blob) throw new Error('blob failed')

    return new File([blob], `${file.name.replace(/\.[^./\\]+$/, '')}.${blob.type.split('/')[1]}`, {
      type: blob.type,
    })
  } finally {
    bitmap.close()
  }
}
