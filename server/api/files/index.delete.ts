import { z } from 'zod'

const bodySchema = z.object({
  path: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const { path } = await readValidatedBody(event, bodySchema.parse)
  await deleteFile(event, path)
  return { success: true }
})
