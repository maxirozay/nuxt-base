import { drizzle } from 'drizzle-orm/node-postgres'
import { relations } from './relations'

export const db = drizzle(useRuntimeConfig().db, { relations, casing: 'snake_case' })
