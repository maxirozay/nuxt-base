export default defineEventHandler(async (event) => {
  const body = await readMultipartFormData(event)
  if (!body) {
    throw createError({ status: 400, message: 'No file uploaded' })
  }

  const uploadedFiles = []
  const pathPart = body.find((p) => p.name === 'path')
  const isPrivatePart = body.find((p) => p.name === 'isPrivate')
  const isPrivate = isPrivatePart ? isPrivatePart.data.toString() === 'true' : true
  const path = pathPart?.data.toString().trim()

  for (const file of body) {
    if (file.filename) {
      const url = await uploadFile(event, file, path, isPrivate)
      uploadedFiles.push(url)
    }
  }

  return uploadedFiles
})
