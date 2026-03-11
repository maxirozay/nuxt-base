import type { WebAuthnCredential } from '#auth-utils'
import {
  pgSchema,
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  boolean,
  primaryKey,
  pgEnum,
  jsonb,
} from 'drizzle-orm/pg-core'

export const authSchema = pgSchema('auth')

export const appRoleEnum = pgEnum('app_role', ['admin', 'user'])
export const auth = authSchema.table('users', {
  id: uuid().primaryKey().defaultRandom(),
  email: text().unique(),
  password: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  totp: text(),
  role: appRoleEnum().notNull().default('user'),
})

export const refreshTokens = authSchema.table('refresh_tokens', {
  token: text().primaryKey(),
  userId: uuid()
    .notNull()
    .references(() => auth.id, { onDelete: 'cascade' }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

export const credentials = authSchema.table(
  'credentials',
  {
    userId: uuid()
      .notNull()
      .references(() => auth.id, { onDelete: 'cascade' }),
    id: text().unique().notNull(),
    name: text().notNull(),
    publicKey: text().notNull(),
    counter: integer().notNull(),
    backedUp: boolean().notNull(),
    transports: text().array().notNull().$type<WebAuthnCredential['transports']>(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.id] })],
)

export const logs = authSchema.table('logs', {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid().references(() => auth.id, { onDelete: 'cascade' }),
  type: text().notNull().default('info'),
  origin: text(),
  summary: text(),
  data: jsonb(),
  time: timestamp({ withTimezone: true }).notNull().defaultNow(),
  ipAddress: text(),
  userAgent: text(),
})

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
})

export const memberRoleEnum = pgEnum('member_role', ['admin', 'member'])
export const organizationMembers = pgTable(
  'organization_members',
  {
    userId: uuid()
      .notNull()
      .references(() => auth.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    role: memberRoleEnum().notNull().default('member'),
  },
  (table) => [primaryKey({ columns: [table.userId, table.organizationId] })],
)
