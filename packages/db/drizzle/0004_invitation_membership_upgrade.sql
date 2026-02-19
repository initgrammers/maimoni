ALTER TABLE "board_members"
ADD COLUMN IF NOT EXISTS "role" text NOT NULL DEFAULT 'editor';

ALTER TABLE "invitations"
ADD COLUMN IF NOT EXISTS "invited_by_user_id" uuid;

ALTER TABLE "invitations"
ADD COLUMN IF NOT EXISTS "invitee_user_id" uuid;

ALTER TABLE "invitations"
ADD COLUMN IF NOT EXISTS "accepted_by_user_id" uuid;

ALTER TABLE "invitations"
ADD COLUMN IF NOT EXISTS "invite_token_hash" text;

ALTER TABLE "invitations"
ADD COLUMN IF NOT EXISTS "target_role" text NOT NULL DEFAULT 'editor';

ALTER TABLE "invitations"
ADD COLUMN IF NOT EXISTS "expires_at" timestamp;

ALTER TABLE "invitations"
ADD COLUMN IF NOT EXISTS "accepted_at" timestamp;

ALTER TABLE "invitations"
ADD COLUMN IF NOT EXISTS "declined_at" timestamp;

ALTER TABLE "invitations"
ADD COLUMN IF NOT EXISTS "revoked_at" timestamp;

DO $$ BEGIN
 ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invitee_user_id_users_id_fk" FOREIGN KEY ("invitee_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "invitations" ADD CONSTRAINT "invitations_accepted_by_user_id_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "invitations_board_status_idx"
ON "invitations" ("board_id", "status");

CREATE INDEX IF NOT EXISTS "invitations_invitee_user_idx"
ON "invitations" ("invitee_user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "invitations_token_hash_uq"
ON "invitations" ("invite_token_hash")
WHERE "invite_token_hash" IS NOT NULL;
