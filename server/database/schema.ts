import { WebAuthnCredential } from '#auth-utils'
import { pgTable, text, integer, timestamp, uuid, boolean, primaryKey } from 'drizzle-orm/pg-core'

export const auth = pgTable('auth', {
  id: uuid().primaryKey().defaultRandom(),
  email: text().notNull().unique(),
  password: text(),
  createdAt: timestamp().notNull().defaultNow(),
  totp: text(),
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
