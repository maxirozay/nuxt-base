import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { reset } from 'drizzle-seed'
import * as schema from './schema'

async function seed() {
  const db = drizzle(process.env.NUXT_DB!)
  await reset(db, schema)
}

seed()
