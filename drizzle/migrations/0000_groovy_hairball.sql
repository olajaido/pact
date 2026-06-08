CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" varchar(255) NOT NULL,
	"provider" varchar(255) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" varchar(255),
	"scope" varchar(255),
	"id_token" text,
	"session_state" varchar(255),
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pact_id" uuid NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"actor_id" uuid,
	"actor_label" varchar(100),
	"payload" jsonb,
	"previous_hash" varchar(64),
	"entry_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_log_event_type_check" CHECK ("audit_log"."event_type" IN ('PACT_CREATED', 'PACT_SUBMITTED', 'PARTY_INVITED', 'PARTY_ACCEPTED', 'PACT_ACTIVATED', 'CONDITION_FULFILLED', 'PACT_EXECUTED', 'DISPUTE_RAISED', 'DISPUTE_RESOLVED', 'VOID_PROPOSED', 'VOID_AGREED', 'PACT_VOIDED'))
);
--> statement-breakpoint
CREATE TABLE "condition_fulfilments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condition_id" uuid NOT NULL,
	"party_id" uuid NOT NULL,
	"note" text,
	"reference_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conditions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pact_id" uuid NOT NULL,
	"assigned_party_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"fulfilled_at" timestamp with time zone,
	"idempotency_key" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conditions_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "conditions_status_check" CHECK ("conditions"."status" IN ('PENDING', 'FULFILLED'))
);
--> statement-breakpoint
CREATE TABLE "executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pact_id" uuid NOT NULL,
	"executed_by" uuid,
	"execution_hash" varchar(64) NOT NULL,
	"execution_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"outcome_statement" text NOT NULL,
	"status" varchar(30) DEFAULT 'DRAFT' NOT NULL,
	"executed_at" timestamp with time zone,
	"voided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pacts_status_check" CHECK ("pacts"."status" IN ('DRAFT', 'PENDING_ACCEPTANCE', 'ACTIVE', 'EXECUTED', 'IN_DISPUTE', 'RESOLVED', 'VOID'))
);
--> statement-breakpoint
CREATE TABLE "parties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pact_id" uuid NOT NULL,
	"user_id" uuid,
	"email" varchar(255) NOT NULL,
	"display_name" varchar(100),
	"role" varchar(30) DEFAULT 'PARTICIPANT' NOT NULL,
	"accepted" boolean DEFAULT false,
	"accepted_at" timestamp with time zone,
	"invite_token" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parties_invite_token_unique" UNIQUE("invite_token"),
	CONSTRAINT "parties_role_check" CHECK ("parties"."role" IN ('CREATOR', 'PARTICIPANT', 'ARBITRATOR'))
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" varchar(100),
	"email" varchar(255) NOT NULL,
	"email_verified" timestamp with time zone,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "void_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pact_id" uuid NOT NULL,
	"party_id" uuid NOT NULL,
	"agreed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_pact_id_pacts_id_fk" FOREIGN KEY ("pact_id") REFERENCES "public"."pacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condition_fulfilments" ADD CONSTRAINT "condition_fulfilments_condition_id_conditions_id_fk" FOREIGN KEY ("condition_id") REFERENCES "public"."conditions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condition_fulfilments" ADD CONSTRAINT "condition_fulfilments_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conditions" ADD CONSTRAINT "conditions_pact_id_pacts_id_fk" FOREIGN KEY ("pact_id") REFERENCES "public"."pacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conditions" ADD CONSTRAINT "conditions_assigned_party_id_parties_id_fk" FOREIGN KEY ("assigned_party_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "executions" ADD CONSTRAINT "executions_pact_id_pacts_id_fk" FOREIGN KEY ("pact_id") REFERENCES "public"."pacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "executions" ADD CONSTRAINT "executions_executed_by_users_id_fk" FOREIGN KEY ("executed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pacts" ADD CONSTRAINT "pacts_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_pact_id_pacts_id_fk" FOREIGN KEY ("pact_id") REFERENCES "public"."pacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "void_proposals" ADD CONSTRAINT "void_proposals_pact_id_pacts_id_fk" FOREIGN KEY ("pact_id") REFERENCES "public"."pacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "void_proposals" ADD CONSTRAINT "void_proposals_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_log_pact_id" ON "audit_log" USING btree ("pact_id");--> statement-breakpoint
CREATE INDEX "idx_audit_log_event_type" ON "audit_log" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_audit_log_created_at" ON "audit_log" USING btree ("pact_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_fulfilments_condition_id" ON "condition_fulfilments" USING btree ("condition_id");--> statement-breakpoint
CREATE INDEX "idx_conditions_pact_id" ON "conditions" USING btree ("pact_id");--> statement-breakpoint
CREATE INDEX "idx_conditions_assigned_party_id" ON "conditions" USING btree ("assigned_party_id");--> statement-breakpoint
CREATE INDEX "idx_conditions_status" ON "conditions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_executions_pact_id" ON "executions" USING btree ("pact_id");--> statement-breakpoint
CREATE INDEX "idx_pacts_creator_id" ON "pacts" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "idx_pacts_status" ON "pacts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_parties_pact_id" ON "parties" USING btree ("pact_id");--> statement-breakpoint
CREATE INDEX "idx_parties_user_id" ON "parties" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_parties_email" ON "parties" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_parties_invite_token" ON "parties" USING btree ("invite_token");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_parties_pact_user" ON "parties" USING btree ("pact_id","user_id") WHERE "parties"."user_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_sessions_user_id" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "void_proposals_pact_id_party_id_key" ON "void_proposals" USING btree ("pact_id","party_id");