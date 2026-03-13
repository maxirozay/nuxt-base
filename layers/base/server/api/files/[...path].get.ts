import { z } from 'zod'

const querySchema = z.object({
  isPrivate: z.coerce.boolean().optional(),
  maxAge: z.coerce.number().optional(),
})

export default defineEventHandler((event) => {
  const path = event.context.params?.path || ''
  const query = getQuery(event)
  const { isPrivate = false, maxAge } = querySchema.parse(query)

  const stream = getFile(event, decodeURIComponent(path), isPrivate, maxAge)
  if (isPrivate) {
    setHeader(event, 'Cache-Control', `private, max-age=${maxAge || 3600}`)
  } else {
    setHeader(event, 'Cache-Control', `public, max-age=${maxAge || 31536000}`)
  }
  return stream
})
