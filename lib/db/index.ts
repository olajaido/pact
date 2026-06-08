import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import type { PostgresJsTransaction } from 'drizzle-orm/postgres-js'
import type { ExtractTablesWithRelations } from 'drizzle-orm'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// max:1 — Vercel serverless: one connection per function instance.
// ssl:'verify-full' — verifies the server certificate against the system trust store
// (which includes AWS CA certs on Vercel). Prevents MITM against Aurora DSQL.
const client = postgres(process.env.DATABASE_URL, {
  ssl: 'verify-full',
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
})

export const db = drizzle(client, { schema })

export type DbTransaction = PostgresJsTransaction<
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>
