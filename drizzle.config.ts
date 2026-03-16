import { defineConfig } from 'drizzle-kit'

const url = process.env.REMOTE_PUSH ? process.env.REMOTE_DB : process.env.NUXT_DB
export default defineConfig({
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  dialect: 'postgresql',
  dbCredentials: { url },
  casing: 'snake_case',
})
