export async function uploadFiles(
  files: File[],
  path: string,
  isPrivate: boolean,
  onProgress?: (progress: number) => void,
) {
  let totalSize = files.reduce((sum, f) => sum + f.size, 0)

  onProgress?.(1)
  let urls = []
  if (totalSize <= getChunkSize()) {
    const formData = new FormData()
    files.forEach((file) => formData.append('file', file))
    formData.append('path', path)
    formData.append('isPrivate', String(isPrivate))
    urls = await $fetch('/api/files', { method: 'POST', body: formData })
  } else {
    let uploadedSize = 0
    for (const file of files) {
      if (file.size <= getChunkSize()) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('path', path)
        formData.append('isPrivate', String(isPrivate))
        urls.push(await $fetch('/api/files', { method: 'POST', body: formData }))
        uploadedSize += file.size
        const progress = (uploadedSize / totalSize) * 100
        onProgress?.(Math.round(progress))
      } else {
        const onChunkProgress = (chunkUploaded: number) => {
          uploadedSize += chunkUploaded
          const progress = (uploadedSize / totalSize) * 100
          onProgress?.(Math.round(progress))
        }
        const url = await uploadInChunks(file, path, isPrivate, onChunkProgress)
        if (url) urls.push(url)
      }
    }
  }
  onProgress?.(100)
  return urls
}

export async function uploadInChunks(
  file: File,
  path: string,
  isPrivate: boolean,
  onProgress?: (progress: number) => void,
) {
  let uploadId
  let parts: any[] = []
  const chunkSize = getChunkSize()
  const totalChunks = Math.ceil(file.size / chunkSize)
  let result: any

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize
    const formData = new FormData()
    formData.append('chunk', file.slice(start, start + chunkSize))
    formData.append('type', file.type)
    formData.append('uploadId', uploadId || '')
    formData.append('parts', JSON.stringify(parts))
    formData.append('chunkIndex', String(i))
    formData.append('totalChunks', String(totalChunks))
    formData.append('filename', file.name)
    formData.append('path', path)
    formData.append('isPrivate', String(isPrivate))

    result = await $fetch('/api/files/chunk', { method: 'POST', body: formData })
    if (i + 1 < totalChunks) {
      uploadId = result.uploadId
      parts = result.parts
    }
    onProgress?.(start + chunkSize)
  }

  return result
}

export function getChunkSize() {
  const config = useRuntimeConfig()
  return (Number(config.public.files.chunkSize) || 1) * 1024 * 1024 // 1MB
}

export function deleteFiles(path: string, isPrivate?: boolean) {
  return $fetch('/api/files', {
    method: 'DELETE',
    body: { path, isPrivate },
  })
}
