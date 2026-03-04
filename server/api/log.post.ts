import z from 'zod'

const bodySchema = z.object({
  info: z.string().optional(),
  type: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const { info, type } = await readValidatedBody(event, bodySchema.parse)
  await logEvent(event, info, type)
})
