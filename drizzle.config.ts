import { defineConfig } from 'drizzle-kit'

const url = process.env.NUXT_DB
export default defineConfig({
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  dialect: 'postgresql',
  dbCredentials: { url },
})
