import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ============================================================
// USERS
// TypeScript property names satisfy @auth/drizzle-adapter.
// SQL column names match the PRD schema spec.
// ============================================================
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('display_name', { length: 100 }),       // TS: name (Auth.js) → SQL: display_name
  email: varchar('email', { length: 255 }).unique().notNull(),
  emailVerified: timestamp('email_verified', { withTimezone: true }),
  image: text('avatar_url'),                             // TS: image (Auth.js) → SQL: avatar_url
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('idx_users_email').on(t.email),
])

// ============================================================
// ACCOUNTS — Auth.js required table
// Uses compound PK (provider, providerAccountId) as the adapter expects.
// ============================================================
export const accounts = pgTable('accounts', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 255 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: varchar('token_type', { length: 255 }),
  scope: varchar('scope', { length: 255 }),
  id_token: text('id_token'),
  session_state: varchar('session_state', { length: 255 }),
}, (t) => [
  primaryKey({ columns: [t.provider, t.providerAccountId] }),
])

// ============================================================
// SESSIONS — Auth.js required table
// sessionToken is the PK as the adapter's DefaultPostgresSessionsTable requires.
// ============================================================
export const sessions = pgTable('sessions', {
  sessionToken: varchar('session_token', { length: 255 }).primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
}, (t) => [
  index('idx_sessions_user_id').on(t.userId),
])

// ============================================================
// VERIFICATION TOKENS — Auth.js required table
// Auth.js deletes these automatically after use.
// ============================================================
export const verificationTokens = pgTable('verification_tokens', {
  identifier: varchar('identifier', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull(),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
}, (t) => [
  primaryKey({ columns: [t.identifier, t.token] }),
  uniqueIndex('verification_tokens_token_key').on(t.token),
])

// ============================================================
// PACTS — Core agreement record
// ============================================================
export const pacts = pgTable('pacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  creatorId: uuid('creator_id').notNull().references(() => users.id),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  outcomeStatement: text('outcome_statement').notNull(),
  status: varchar('status', { length: 30 }).notNull().default('DRAFT'),
  executedAt: timestamp('executed_at', { withTimezone: true }),
  voidedAt: timestamp('voided_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('idx_pacts_creator_id').on(t.creatorId),
  index('idx_pacts_status').on(t.status),
  check(
    'pacts_status_check',
    sql`${t.status} IN ('DRAFT', 'PENDING_ACCEPTANCE', 'ACTIVE', 'EXECUTED', 'IN_DISPUTE', 'RESOLVED', 'VOID')`,
  ),
])

// ============================================================
// PARTIES — Participants in a Pact
// ============================================================
export const parties = pgTable('parties', {
  id: uuid('id').primaryKey().defaultRandom(),
  pactId: uuid('pact_id').notNull().references(() => pacts.id),
  userId: uuid('user_id').references(() => users.id),
  email: varchar('email', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 100 }),
  role: varchar('role', { length: 30 }).notNull().default('PARTICIPANT'),
  accepted: boolean('accepted').default(false),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  inviteToken: varchar('invite_token', { length: 128 }).unique().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('idx_parties_pact_id').on(t.pactId),
  index('idx_parties_user_id').on(t.userId),
  index('idx_parties_email').on(t.email),
  index('idx_parties_invite_token').on(t.inviteToken),
  // One user per pact (only when userId is set). If Aurora DSQL rejects this
  // partial index, remove the .where() clause and enforce in application code.
  uniqueIndex('idx_parties_pact_user')
    .on(t.pactId, t.userId)
    .where(sql`${t.userId} IS NOT NULL`),
  check('parties_role_check', sql`${t.role} IN ('CREATOR', 'PARTICIPANT', 'ARBITRATOR')`),
])

// ============================================================
// CONDITIONS — Discrete obligations within a Pact
// ============================================================
export const conditions = pgTable('conditions', {
  id: uuid('id').primaryKey().defaultRandom(),
  pactId: uuid('pact_id').notNull().references(() => pacts.id),
  assignedPartyId: uuid('assigned_party_id').notNull().references(() => parties.id),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  displayOrder: integer('display_order').notNull().default(0),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'),
  fulfilledAt: timestamp('fulfilled_at', { withTimezone: true }),
  idempotencyKey: varchar('idempotency_key', { length: 128 }).unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('idx_conditions_pact_id').on(t.pactId),
  index('idx_conditions_assigned_party_id').on(t.assignedPartyId),
  index('idx_conditions_status').on(t.status),
  check('conditions_status_check', sql`${t.status} IN ('PENDING', 'FULFILLED')`),
])

// ============================================================
// CONDITION FULFILMENTS — Evidence record per fulfilled condition
// UNIQUE on condition_id: one fulfilment per condition, ever.
// ============================================================
export const conditionFulfilments = pgTable('condition_fulfilments', {
  id: uuid('id').primaryKey().defaultRandom(),
  conditionId: uuid('condition_id').notNull().references(() => conditions.id),
  partyId: uuid('party_id').notNull().references(() => parties.id),
  note: text('note'),
  referenceUrl: text('reference_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('idx_fulfilments_condition_id').on(t.conditionId),
])

// ============================================================
// AUDIT LOG — Immutable append-only event log with hash chain
// NEVER run UPDATE or DELETE against this table.
// ============================================================
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  pactId: uuid('pact_id').notNull().references(() => pacts.id),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  actorId: uuid('actor_id').references(() => users.id),
  actorLabel: varchar('actor_label', { length: 100 }),
  payload: jsonb('payload'),
  previousHash: varchar('previous_hash', { length: 64 }),
  entryHash: varchar('entry_hash', { length: 64 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('idx_audit_log_pact_id').on(t.pactId),
  index('idx_audit_log_event_type').on(t.eventType),
  index('idx_audit_log_created_at').on(t.pactId, t.createdAt),
  check(
    'audit_log_event_type_check',
    sql`${t.eventType} IN ('PACT_CREATED', 'PACT_SUBMITTED', 'PARTY_INVITED', 'PARTY_ACCEPTED', 'PACT_ACTIVATED', 'CONDITION_FULFILLED', 'PACT_EXECUTED', 'DISPUTE_RAISED', 'DISPUTE_RESOLVED', 'VOID_PROPOSED', 'VOID_AGREED', 'PACT_VOIDED')`,
  ),
])

// ============================================================
// EXECUTIONS — One row per Pact, ever.
// UNIQUE(pact_id) is the database-level idempotency guarantee.
// A Pact can execute exactly once regardless of application code.
// ============================================================
export const executions = pgTable('executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  pactId: uuid('pact_id').notNull().references(() => pacts.id),
  executedBy: uuid('executed_by').references(() => users.id),
  executionHash: varchar('execution_hash', { length: 64 }).notNull(),
  executionPayload: jsonb('execution_payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('idx_executions_pact_id').on(t.pactId),
])

// ============================================================
// VOID PROPOSALS — Tracks per-party agreement to void a Pact
// ============================================================
export const voidProposals = pgTable('void_proposals', {
  id: uuid('id').primaryKey().defaultRandom(),
  pactId: uuid('pact_id').notNull().references(() => pacts.id),
  partyId: uuid('party_id').notNull().references(() => parties.id),
  agreedAt: timestamp('agreed_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('void_proposals_pact_id_party_id_key').on(t.pactId, t.partyId),
])

// ============================================================
// INFERRED TYPES — Use across the codebase instead of `any`
// ============================================================
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Pact = typeof pacts.$inferSelect
export type NewPact = typeof pacts.$inferInsert
export type Party = typeof parties.$inferSelect
export type NewParty = typeof parties.$inferInsert
export type Condition = typeof conditions.$inferSelect
export type NewCondition = typeof conditions.$inferInsert
export type ConditionFulfilment = typeof conditionFulfilments.$inferSelect
export type NewConditionFulfilment = typeof conditionFulfilments.$inferInsert
export type AuditLogEntry = typeof auditLog.$inferSelect
export type NewAuditLogEntry = typeof auditLog.$inferInsert
export type Execution = typeof executions.$inferSelect
export type NewExecution = typeof executions.$inferInsert
export type VoidProposal = typeof voidProposals.$inferSelect
export type NewVoidProposal = typeof voidProposals.$inferInsert

export const PACT_STATUSES = [
  'DRAFT',
  'PENDING_ACCEPTANCE',
  'ACTIVE',
  'EXECUTED',
  'IN_DISPUTE',
  'RESOLVED',
  'VOID',
] as const
export type PactStatus = (typeof PACT_STATUSES)[number]

export const CONDITION_STATUSES = ['PENDING', 'FULFILLED'] as const
export type ConditionStatus = (typeof CONDITION_STATUSES)[number]

export const PARTY_ROLES = ['CREATOR', 'PARTICIPANT', 'ARBITRATOR'] as const
export type PartyRole = (typeof PARTY_ROLES)[number]

export const AUDIT_EVENT_TYPES = [
  'PACT_CREATED',
  'PACT_SUBMITTED',
  'PARTY_INVITED',
  'PARTY_ACCEPTED',
  'PACT_ACTIVATED',
  'CONDITION_FULFILLED',
  'PACT_EXECUTED',
  'DISPUTE_RAISED',
  'DISPUTE_RESOLVED',
  'VOID_PROPOSED',
  'VOID_AGREED',
  'PACT_VOIDED',
] as const
export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number]
