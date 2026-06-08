import type { Config } from 'drizzle-kit'

// NOTE: Migrations are NOT run via CLI against Aurora DSQL.
// The generated SQL in drizzle/migrations/ is pasted directly into the
// AWS Query Editor (via the Vercel dashboard → Storage → Aurora DSQL).
// DATABASE_URL is not required locally — use `vercel dev` which provides
// PGHOST, AWS_REGION, AWS_ROLE_ARN, and VERCEL_OIDC_TOKEN automatically.
export default {
  schema: './lib/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://localhost/pact',
  },
} satisfies Config
