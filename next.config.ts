import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Prevent the bundler from trying to include Node.js-only packages in the browser bundle.
  // These packages use native Node.js modules (dns, fs, net, tls, child_process) and
  // must only run on the server.
  serverExternalPackages: [
    'pg',
    'pg-connection-string',
    'pgpass',
    '@aws/aurora-dsql-node-postgres-connector',
    '@vercel/oidc-aws-credentials-provider',
    '@aws-sdk/credential-providers',
    '@aws-sdk/credential-provider-node',
    '@aws-sdk/credential-provider-ini',
    '@aws-sdk/credential-provider-sso',
    '@aws-sdk/credential-provider-process',
    '@aws-sdk/token-providers',
    'drizzle-orm',
  ],
}

export default nextConfig
