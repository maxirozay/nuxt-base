import { drizzle } from 'drizzle-orm/node-postgres'
import 'dotenv/config'

async function seed() {
  const db = drizzle(process.env.NUXT_DB!)
}

seed()
