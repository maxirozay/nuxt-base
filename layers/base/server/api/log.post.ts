import z from 'zod'

const bodySchema = z.object({
  summary: z.string(),
  data: z.any().optional(),
  origin: z.string().optional(),
  type: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const { summary, data, origin, type } = await readValidatedBody(event, bodySchema.parse)
  await log(summary, data, origin, type, event)
})
