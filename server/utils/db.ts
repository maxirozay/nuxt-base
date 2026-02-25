import { drizzle } from 'drizzle-orm/node-postgres'
import { relations } from '../database/relations'

export const db = drizzle(useRuntimeConfig().db, { relations, casing: 'snake_case' })
