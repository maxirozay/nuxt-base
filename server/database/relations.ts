import * as schema from './schema'
import { defineRelations } from 'drizzle-orm'

export const relations = defineRelations(schema, (r) => ({
  auth: {
    credentials: r.many.credentials({
      from: r.auth.id,
      to: r.credentials.userId,
    }),
  },
  credentials: {
    auth: r.one.auth({
      from: r.credentials.userId,
      to: r.auth.id,
    }),
  },
}))
