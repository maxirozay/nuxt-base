import { WebAuthnCredential } from '#auth-utils'
import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  boolean,
  primaryKey,
  pgEnum,
} from 'drizzle-orm/pg-core'

export const appRoleEnum = pgEnum('app_role', ['admin', 'user'])
export const auth = pgTable('auth', {
  id: uuid().primaryKey().defaultRandom(),
  email: text().notNull().unique(),
  password: text(),
  createdAt: timestamp().notNull().defaultNow(),
  totp: text(),
  role: appRoleEnum('role').notNull().default('user'),
})

export const credentials = pgTable(
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

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
})

export const memberRoleEnum = pgEnum('member_role', ['admin', 'member'])
export const organizationMembers = pgTable(
  'organization_members',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => auth.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    role: memberRoleEnum('role').notNull().default('member'),
  },
  (table) => [primaryKey({ columns: [table.userId, table.organizationId] })],
)
