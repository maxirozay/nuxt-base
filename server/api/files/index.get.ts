import { z } from 'zod'

const querySchema = z.object({
  path: z
    .string()
    .min(1)
    .refine((p) => !p.includes('.')),
})

export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  const query = getQuery(event)
  const { path } = querySchema.parse(query)
  return listFolder(path)
})
