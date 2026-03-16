/**
 * Firebase Firestore → Drizzle schema generator
 *
 * Usage:
 *   npx jiti scripts/db/introspect.ts
 *   npx jiti scripts/db/introspect.ts --serviceAccount ./other-creds.json --samples 20
 *
 * Service account defaults to scripts/db/firebase.json.
 * Samples N documents per collection to infer types (default: 10).
 *
 * Output: scripts/db/generated-schema.ts
 */

import admin from 'firebase-admin'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { resolve } from 'path'

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const get = (flag: string) => {
  const i = args.indexOf(flag)
  return i !== -1 ? args[i + 1] : null
}

const envPath = resolve('.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match && !process.env[match[1].trim()]) process.env[match[1].trim()] = match[2].trim()
  }
}

const serviceAccountPath = get('--serviceAccount') || 'scripts/db/firebase.json'
const sampleCount = parseInt(get('--samples') || '10', 10)
const outputPath = resolve('scripts/db/generated-schema.ts')

// ── Firebase init ─────────────────────────────────────────────────────────────

const serviceAccount = JSON.parse(readFileSync(resolve(serviceAccountPath), 'utf8'))
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
const firestore = admin.firestore()

// ── Type inference ────────────────────────────────────────────────────────────

type FieldType =
  | 'text'
  | 'integer'
  | 'numeric'
  | 'boolean'
  | 'timestamp'
  | 'date'
  | 'jsonb'
  | 'text[]'
  | 'uuid'

function inferType(value: any): FieldType {
  if (value === null || value === undefined) return 'text'
  if (value instanceof admin.firestore.Timestamp) return 'timestamp'
  if (value instanceof admin.firestore.DocumentReference) return 'text'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') {
    if (isUnixTimestamp(value)) return 'timestamp'
    return Number.isInteger(value) ? 'integer' : 'numeric'
  }
  if (typeof value === 'string') {
    // UUID pattern
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return 'uuid'
    // Date/datetime string pattern
    if (isDateOnlyString(value)) return 'date'
    if (isDateTimeString(value)) return 'timestamp'
    return 'text'
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return 'jsonb[]'
    return value.every((v) => typeof v === 'string') ? 'text[]' : 'jsonb[]'
  }
  if (typeof value === 'object') return 'jsonb'
  return 'text'
}

// Returns true for Unix timestamps in seconds (10 digits) or milliseconds (13 digits)
function isUnixTimestamp(n: number): boolean {
  const s = Math.abs(Math.trunc(n))
  const digits = s.toString().length
  // seconds: ~1e9 range (2001–2286), milliseconds: ~1e12 range
  return (digits === 10 || digits === 13) && Number.isInteger(n)
}

// Returns true for ISO date / datetime strings
function isDateOnlyString(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

function isDateTimeString(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?(\. \d+)?(Z|[+-]\d{2}:?\d{2})?$/.test(s)
}

// Merge two inferred types, preferring the more general one
function mergeTypes(a: FieldType, b: FieldType): FieldType {
  if (a === b) return a
  // integer + numeric → numeric
  if ((a === 'integer' && b === 'numeric') || (a === 'numeric' && b === 'integer')) return 'numeric'
  // timestamp + date → timestamp
  if ((a === 'timestamp' && b === 'date') || (a === 'date' && b === 'timestamp')) return 'timestamp'
  // uuid + text → text
  if ((a === 'uuid' && b === 'text') || (a === 'text' && b === 'uuid')) return 'text'
  // anything conflicting → jsonb
  return 'jsonb'
}

// ── Drizzle code generation ───────────────────────────────────────────────────

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase()
}

function singularize(name: string): string {
  if (name.endsWith('ies')) return name.slice(0, -3) + 'y'
  if (name.endsWith('s')) return name.slice(0, -1)
  return name
}

function toPascalCase(str: string): string {
  const camel = toCamelCase(str)
  return camel.charAt(0).toUpperCase() + camel.slice(1)
}

function drizzleColumn(fieldName: string, type: FieldType, isNullable: boolean): string {
  const camel = toCamelCase(fieldName)
  const nullable = isNullable ? '' : '.notNull()'

  switch (type) {
    case 'uuid':
      return `  ${camel}: uuid()${nullable},`
    case 'integer':
      return `  ${camel}: integer()${nullable},`
    case 'numeric':
      return `  ${camel}: numeric()${nullable},`
    case 'boolean':
      return `  ${camel}: boolean()${nullable},`
    case 'timestamp':
      return `  ${camel}: timestamp({ withTimezone: true })${nullable},`
    case 'date':
      return `  ${camel}: date()${nullable},`
    case 'jsonb':
      return `  ${camel}: jsonb()${nullable},`
    case 'jsonb[]':
      return `  ${camel}: jsonb().array()${nullable},`
    case 'text[]':
      return `  ${camel}: text().array()${nullable},`
    default:
      return `  ${camel}: text()${nullable},`
  }
}

function generateTable(
  collectionName: string,
  fields: Map<string, { type: FieldType; nullable: boolean }>,
  parent: { exportName: string; fkField: string } | null = null,
): string {
  const exportName = toCamelCase(collectionName)
  const tableName = toSnakeCase(collectionName)
  const pascalName = toPascalCase(collectionName)

  const fkLine = parent
    ? `  ${parent.fkField}: uuid().notNull().references(() => ${parent.exportName}.id, { onDelete: 'cascade' }),`
    : null

  const columns = [
    `  id: uuid().primaryKey().defaultRandom(),`,
    ...(fkLine ? [fkLine] : []),
    ...[...fields.entries()].map(([name, { type, nullable }]) =>
      drizzleColumn(name, type, nullable),
    ),
  ]

  return [
    `// Firestore collection: ${collectionName}`,
    `export const ${exportName} = pgTable('${tableName}', {`,
    ...columns,
    `})`,
    `export type ${pascalName} = typeof ${exportName}.$inferSelect`,
    `export type New${pascalName} = typeof ${exportName}.$inferInsert`,
  ].join('\n')
}

// ── Main ──────────────────────────────────────────────────────────────────────

type CollectionNode = {
  exportName: string
  tableName: string
  parentExportName: string | null
  parentFkField: string | null
}

const allNodes: CollectionNode[] = []
const tableBlocks: string[] = []
const importedTypes = new Set<string>(['pgTable', 'uuid', 'text'])

async function introspectCollection(
  col: admin.firestore.CollectionReference,
  parentNode: CollectionNode | null = null,
  depth = 0,
): Promise<void> {
  const colName = col.id
  const exportName = toCamelCase(colName)
  const tableName = toSnakeCase(colName)
  const indent = '  '.repeat(depth + 1)
  const parentFkField = parentNode ? singularize(parentNode.exportName) + 'Id' : null

  const node: CollectionNode = {
    exportName,
    tableName,
    parentExportName: parentNode?.exportName ?? null,
    parentFkField,
  }
  allNodes.push(node)

  console.log(`${indent}Sampling${depth > 0 ? ' subcollection' : ' collection'}: ${colName}`)

  const snapshot = await col.limit(sampleCount).get()
  if (snapshot.empty) {
    console.log(`${indent}  → empty, skipping`)
    return
  }

  const fields = new Map<string, { type: FieldType; nullable: boolean; seenCount: number }>()
  for (const doc of snapshot.docs) {
    const data = doc.data()
    for (const [key, value] of Object.entries(data)) {
      if (key === 'id') continue
      const inferred = inferType(value)
      if (fields.has(key)) {
        const existing = fields.get(key)!
        existing.type = mergeTypes(existing.type, inferred)
        existing.seenCount++
      } else {
        fields.set(key, { type: inferred, nullable: false, seenCount: 1 })
      }
    }
  }

  for (const [, meta] of fields) {
    if (meta.seenCount < snapshot.size) meta.nullable = true
  }

  for (const { type } of fields.values()) {
    if (type === 'integer') importedTypes.add('integer')
    else if (type === 'numeric') importedTypes.add('numeric')
    else if (type === 'boolean') importedTypes.add('boolean')
    else if (type === 'timestamp') importedTypes.add('timestamp')
    else if (type === 'date') importedTypes.add('date')
    else if (type === 'jsonb') importedTypes.add('jsonb')
  }

  const simplified = new Map(
    [...fields.entries()].map(([k, v]) => [k, { type: v.type, nullable: v.nullable }]),
  )
  const parentArg =
    parentNode && parentFkField
      ? { exportName: parentNode.exportName, fkField: parentFkField }
      : null
  tableBlocks.push(generateTable(colName, simplified, parentArg))
  console.log(`${indent}  → ${fields.size} fields inferred from ${snapshot.size} documents`)

  // Discover subcollections from the first sampled document
  const subcols = await snapshot.docs[0].ref.listCollections()
  for (const subcol of subcols) {
    await introspectCollection(subcol, node, depth + 1)
  }
}

console.log('\nIntrospecting Firestore collections...\n')

const collections = await firestore.listCollections()
for (const col of collections) {
  await introspectCollection(col)
}

// ── Write output ──────────────────────────────────────────────────────────────

// Build relations block
const parentChildMap = new Map<string, string[]>()
const childParentMap = new Map<string, { parentExportName: string; fkField: string }>()
for (const node of allNodes) {
  if (node.parentExportName && node.parentFkField) {
    if (!parentChildMap.has(node.parentExportName)) parentChildMap.set(node.parentExportName, [])
    parentChildMap.get(node.parentExportName)!.push(node.exportName)
    childParentMap.set(node.exportName, {
      parentExportName: node.parentExportName,
      fkField: node.parentFkField,
    })
  }
}

let relationsBlock = ''
if (parentChildMap.size > 0) {
  const withRelations = new Set([...parentChildMap.keys(), ...childParentMap.keys()])
  const entries: string[] = []
  for (const name of withRelations) {
    const lines: string[] = []
    for (const child of parentChildMap.get(name) ?? []) {
      const childNode = allNodes.find((n) => n.exportName === child)!
      lines.push(
        `    ${child}: r.many.${child}({ from: r.${name}.id, to: r.${child}.${childNode.parentFkField} }),`,
      )
    }
    const pi = childParentMap.get(name)
    if (pi) {
      lines.push(
        `    ${pi.parentExportName}: r.one.${pi.parentExportName}({ from: r.${name}.${pi.fkField}, to: r.${pi.parentExportName}.id }),`,
      )
    }
    entries.push(`  ${name}: {\n${lines.join('\n')}\n  },`)
  }
  const tableNames = [...withRelations].join(', ')
  relationsBlock = [
    ``,
    `// Relations — merge into your server/database/relations.ts`,
    `import { defineRelations } from 'drizzle-orm'`,
    `export const generatedRelations = defineRelations({ ${tableNames} }, (r) => ({`,
    entries.join('\n'),
    `}))`,
  ].join('\n')
}

const output = [
  `// Auto-generated by scripts/db/createSchema.ts — review before using`,
  `// Fields marked as nullable were not present in all sampled documents`,
  `import {`,
  [...importedTypes]
    .sort()
    .map((t) => `  ${t},`)
    .join('\n'),
  `} from 'drizzle-orm/pg-core'`,
  ``,
  tableBlocks.join('\n\n'),
  relationsBlock,
  ``,
].join('\n')

writeFileSync(outputPath, output)
console.log(`\nSchema written to scripts/db/generated-schema.ts`)
console.log('Review and merge it into your server/database/schema.ts manually.')
