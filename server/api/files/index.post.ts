export default defineEventHandler(async (event) => {
  const body = await readMultipartFormData(event)
  if (!body) {
    throw createError({ status: 400, message: 'No file uploaded' })
  }

  const uploadedFiles = []

  let folder = ''
  const pathPart = body.find((p) => p.name === 'path')
  if (pathPart) {
    folder = pathPart.data.toString().trim()
    // Prevent directory traversal
    if (folder.includes('..') || folder.startsWith('/')) {
      throw createError({ status: 400, message: 'Invalid path' })
    }
  }

  for (const file of body) {
    if (file.filename) {
      const url = await uploadFile(event, file, folder)
      uploadedFiles.push(url)
    }
  }

  return uploadedFiles
})
