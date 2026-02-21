import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const auth = pgTable('auth', {
  id: uuid().primaryKey().defaultRandom(),
  email: text().notNull().unique(),
  password: text(),
  created: timestamp().defaultNow(),
  totp: text(),
})
