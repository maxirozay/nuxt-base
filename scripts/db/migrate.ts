/**
 * Firebase → PostgreSQL migration script
 *
 * Usage:
 *   npx jiti scripts/db/migrate.ts
 *   npx jiti scripts/db/migrate.ts --serviceAccount ./other-creds.json
 *
 * The DB URL is read from MIGRATION_DB in .env.
 * Service account defaults to scripts/db/firebase.json.
 *
 * What it does:
 *   1. Lists all Firebase Auth users and maps their UIDs to new UUIDs
 *   2. Inserts them into auth.users via Drizzle
 *   3. Fetches all Firestore collections and runs the matching handler below
 *
 * ─── ADD YOUR COLLECTION HANDLERS HERE ───────────────────────────────────────
 * Add a key matching your Firestore collection name and implement the insert.
 * Each handler receives:
 *   - docs: Firestore documents (UID values already replaced by UUIDs)
 *   - db:   the Drizzle instance
 */

import admin from 'firebase-admin'
import { readFileSync, existsSync } from 'fs'
import { randomUUID } from 'crypto'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from '../../server/database/schema'
import { resolve } from 'path'

// ── Args ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const get = (flag: string) => {
  const i = args.indexOf(flag)
  return i !== -1 ? args[i + 1] : null
}

// Load .env file from project root if dotenv/config didn't pick it up
const envPath = resolve('.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match && !process.env[match[1].trim()]) process.env[match[1].trim()] = match[2].trim()
  }
}

const serviceAccountPath = get('--serviceAccount') || 'scripts/db/firebase.json'
const dbUrl = process.env.MIGRATION_DB

if (!dbUrl) {
  console.error('No database URL found. Set MIGRATION_DB in .env')
  process.exit(1)
}

const db = drizzle(dbUrl, { schema, casing: 'snake_case' })
type Db = typeof db

// ── Reset all tables before migration (dynamic) ──────────────────────────────
console.log('\n[0/3] Resetting all tables...')
const { rows: tableRows } = await db.$client.query(`
  SELECT schemaname, tablename
  FROM pg_tables
  WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
`)
if (tableRows.length) {
  const tableNames = tableRows.map((r) => `"${r.schemaname}"."${r.tablename}"`).join(', ')
  const truncateSql = `TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE`
  await db.$client.query(truncateSql)
  console.log(`   All tables truncated: ${tableNames}`)
} else {
  console.log('   No user tables found to truncate.')
}

// ── Collection handlers ───────────────────────────────────────────────────────
// Add a handler for each Firestore collection you want to import.
// Collections without a handler will be logged and skipped.

type FirestoreDoc = { id: string; mappedId: string; parentId?: string; data: Record<string, any> }

const collectionNames = {}
const collectionHandlers: Record<string, (docs: FirestoreDoc[], db: Db, parents) => Promise<void>> =
  {
    // Example:
    // organizations: async (docs, db) => {
    //   for (const doc of docs) {
    //     await db.insert(schema.organizations).values({
    //       id: doc.mappedId,
    //       name: doc.data.name,
    //       slug: doc.data.slug,
    //     }).onConflictDoNothing()
    //   }
    // },
    accounts: async (docs, db, parents) => {
      collectionNames.accounts = 'organizations'
      for (const doc of docs) {
        await db
          .insert(schema.organizations)
          .values({
            id: doc.mappedId,
            name: doc.id,
            slug: doc.id,
            ...parents,
          })
          .onConflictDoNothing()
        for (const userId of doc.data.users) {
          if (!userId) {
            console.warn(`   ⚠ ID ${userId} in doc ${doc.id} not found in ID map, skipping`)
            continue
          }
          await db
            .insert(schema.organizationMembers)
            .values({
              organizationId: doc.mappedId,
              userId,
            })
            .onConflictDoNothing()
        }
      }
    },
  }

// ── Firebase init ─────────────────────────────────────────────────────────────

const serviceAccount = JSON.parse(readFileSync(resolve(serviceAccountPath), 'utf8'))
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })

const firebaseAuth = admin.auth()
const firestore = admin.firestore()

// ── Step 1: List all Firebase Auth users and Documents to build ID → UUID map ─────────────

console.log('\n[1/3] Fetching Firebase Auth users...')

const idToUuid: Record<string, string> = {}
const usersToInsert: { uuid: string; email: string | null; createdAt: Date }[] = []

let pageToken: string | undefined
do {
  const result = await firebaseAuth.listUsers(1000, pageToken)
  for (const user of result.users) {
    const newUuid = randomUUID()
    idToUuid[user.uid] = newUuid
    if (user.email) {
      idToUuid[user.email] = newUuid
    }
    usersToInsert.push({
      uuid: newUuid,
      email: user.email || null,
      createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime) : new Date(),
    })
  }
  pageToken = result.pageToken
} while (pageToken)

async function getDocumentsIDs(collections) {
  for (const col of collections) {
    const snapshot = await col.get()
    snapshot.docs.map((doc) => {
      idToUuid[doc.id] = randomUUID()
    })

    for (const doc of snapshot.docs) {
      await getDocumentsIDs(await doc.ref.listCollections())
    }
  }
}
await getDocumentsIDs(await firestore.listCollections(), {})

console.log(`   Found ${usersToInsert.length} users`)

// ── Step 2: Insert users into PostgreSQL auth.users ───────────────────────────

console.log('\n[2/3] Inserting users into PostgreSQL...')

let inserted = 0
let skipped = 0

for (const user of usersToInsert) {
  const result = await db
    .insert(schema.auth)
    .values({ id: user.uuid, email: user.email, createdAt: user.createdAt })
    .onConflictDoNothing()
  const count = result.rowCount ?? 0
  inserted += count
  if (count === 0) skipped++
}

console.log(`   Inserted: ${inserted}, Skipped (already exist): ${skipped}`)

// ── Step 3: Dump all Firestore collections ────────────────────────────────────

console.log('\n[3/3] Importing Firestore collections...')

async function migrateCollections(collections, parents) {
  for (const col of collections) {
    const colName = col.id
    const handler = collectionHandlers[colName]
    const snapshot = await col.get()

    if (!handler) {
      console.log(`   No handler for "${colName}" — inserting raw data...`)
      let rawInserted = 0
      for (const doc of snapshot.docs) {
        const data = replaceUids(doc.data())
        const columns = [
          'id',
          ...Object.keys(data).map(toSnakeCase),
          ...Object.keys(parents).map(toSnakeCase),
        ]
        const values = [idToUuid[doc.id], ...Object.values(data), ...Object.values(parents)]
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ')
        try {
          await db.$client.query(
            `INSERT INTO "${colName}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
            values,
          )
          rawInserted++
        } catch (err: any) {
          console.warn(`   ⚠ Could not insert doc ${doc.id}: ${err.message}`)
        }
      }
      console.log(`   → ${rawInserted}/${snapshot.size} documents inserted`)
      continue
    }

    console.log(`   Importing collection: ${colName}`)
    const docs: FirestoreDoc[] = snapshot.docs.map((doc) => {
      return {
        id: doc.id,
        mappedId: idToUuid[doc.id],
        data: replaceUids(doc.data(), idToUuid),
      }
    })

    await handler(docs, db, parents)
    for (const doc of snapshot.docs) {
      const newParents = {
        ...parents,
        [singularize(collectionNames[colName] || colName) + '_id']: idToUuid[doc.id],
      }
      await migrateCollections(await doc.ref.listCollections(), newParents)
    }
    console.log(`   → ${docs.length} documents processed`)
  }
}
await migrateCollections(await firestore.listCollections(), {})
// ── Done ──────────────────────────────────────────────────────────────────────

console.log('\nMigration complete.')

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Recursively walks a Firestore document and replaces any Firebase UIDs
 * found as values with their mapped UUIDs.
 */
function singularize(name: string): string {
  if (name.endsWith('ies')) return name.slice(0, -3) + 'y'
  if (name.endsWith('s')) return name.slice(0, -1)
  return name
}

function toSnakeCase(str: string): string {
  return str.replace(/([a-z0-9])([A-Z0-9])/g, '$1_$2').toLowerCase()
}

function replaceUids(obj: any): any {
  if (typeof obj === 'string') return idToUuid[obj] ?? obj
  if (Array.isArray(obj)) return obj.map((v) => replaceUids(v))
  if (obj && typeof obj === 'object') {
    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(obj)) out[k] = replaceUids(v)
    return out
  }
  return obj
}
