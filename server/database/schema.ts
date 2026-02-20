import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  password: text('password'),
  created: timestamp().defaultNow(),
  totp: text('totp')
})
