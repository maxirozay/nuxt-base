import { z } from 'zod'

const bodySchema = z.object({
  path: z.string().default('files'),
  filename: z.string(),
  contentType: z.string(),
  isPrivate: z.boolean().default(true),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { path, filename, contentType, isPrivate } = bodySchema.parse(body)

  return getUploadPresignedUrl(event, path, filename, contentType, isPrivate)
})
