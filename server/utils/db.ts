import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from '../database/schema'

export const db = drizzle(useRuntimeConfig().db, { schema, casing: 'snake_case' })
