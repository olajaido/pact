import { AuroraDSQLPool } from '@aws/aurora-dsql-node-postgres-connector'
import { awsCredentialsProvider } from '@vercel/oidc-aws-credentials-provider'
import { attachDatabasePool } from '@vercel/functions/db-connections'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema'

if (!process.env.PGHOST || !process.env.AWS_REGION || !process.env.AWS_ROLE_ARN) {
  throw new Error('Missing required env vars: PGHOST, AWS_REGION, AWS_ROLE_ARN')
}

const pool = new AuroraDSQLPool({
  host: process.env.PGHOST,
  region: process.env.AWS_REGION,
  user: process.env.PGUSER || 'admin',
  database: process.env.PGDATABASE || 'postgres',
  port: Number(process.env.PGPORT || 5432),
  customCredentialsProvider: awsCredentialsProvider({
    roleArn: process.env.AWS_ROLE_ARN,
    clientConfig: { region: process.env.AWS_REGION },
  }),
})
attachDatabasePool(pool)

export const db = drizzle(pool, { schema })

// Driver-agnostic transaction type — inferred from db.transaction() signature
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
