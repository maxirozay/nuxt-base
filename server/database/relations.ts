import * as schema from './schema'
import { defineRelations } from 'drizzle-orm'

export const relations = defineRelations(schema, (r) => ({
  auth: {
    credentials: r.many.credentials({
      from: r.auth.id,
      to: r.credentials.userId,
    }),
    refreshTokens: r.many.refreshTokens({
      from: r.auth.id,
      to: r.refreshTokens.userId,
    }),
  },
  credentials: {
    auth: r.one.auth({
      from: r.credentials.userId,
      to: r.auth.id,
    }),
  },
  logs: {
    auth: r.one.auth({
      from: r.logs.userId,
      to: r.auth.id,
    }),
  },
  refreshTokens: {
    auth: r.one.auth({
      from: r.refreshTokens.userId,
      to: r.auth.id,
    }),
  },
}))
