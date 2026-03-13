import { z } from 'zod'

const querySchema = z.object({
  path: z
    .string()
    .min(1)
    .refine((p) => !p.includes('.')),
  isPrivate: z.coerce.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const { path, isPrivate = false } = querySchema.parse(query)
  return listFolder(event, path, isPrivate)
})
