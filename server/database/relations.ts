import * as schema from './schema'
import { defineRelations } from 'drizzle-orm'

export const relations = defineRelations(schema, (r) => ({
  auth: {
    refreshTokens: r.many.refreshTokens({
      from: r.auth.id,
      to: r.refreshTokens.userId,
    }),
    credentials: r.many.credentials({
      from: r.auth.id,
      to: r.credentials.userId,
    }),
  },
  refreshTokens: {
    auth: r.one.auth({
      from: r.refreshTokens.userId,
      to: r.auth.id,
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
  organizations: {
    members: r.many.organizationMembers({
      from: r.organizations.id,
      to: r.organizationMembers.organizationId,
    }),
  },
}))
