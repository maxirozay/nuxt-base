export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const body = await readMultipartFormData(event)
  if (!body) {
    throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })
  }

  const uploadedFiles = []

  let folder = ''
  const pathPart = body.find((p) => p.name === 'path')
  if (pathPart) {
    folder = pathPart.data.toString().trim()
    // Prevent directory traversal
    if (folder.includes('..') || folder.startsWith('/')) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid path' })
    }
  }

  for (const file of body) {
    if (file.filename) {
      const url = await uploadFile(file, folder)
      uploadedFiles.push(url)
    }
  }

  return {
    success: true,
    files: uploadedFiles,
  }
})
