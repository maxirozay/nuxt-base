import { z } from 'zod'

const querySchema = z.object({
  isPrivate: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  maxAge: z.coerce.number().optional(),
  serverCache: z.string().optional(),
  expireIn: z.coerce.number().optional(),
})

export default defineEventHandler((event) => {
  const path = event.context.params?.path || ''
  const query = getQuery(event)
  const { isPrivate = false, maxAge, serverCache, expireIn } = querySchema.parse(query)

  let cache = `public, max-age=${maxAge || 31536000}`
  if (maxAge === 0) {
    cache = 'no-store, no-cache'
  } else if (isPrivate) {
    cache = `private, max-age=${maxAge || 3600}`
  }
  setHeader(event, 'Cache-Control', cache)
  return getFile(event, decodeURIComponent(path), isPrivate, serverCache as RequestCache, expireIn)
})
