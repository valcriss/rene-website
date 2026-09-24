CREATE TABLE "AuditLog" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "requestId" TEXT,
  "actorId" UUID,
  "action" TEXT NOT NULL,
  "target" TEXT,
  "outcome" TEXT NOT NULL,
  "metadata" JSONB,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

ALTER TABLE "Event"
  ADD COLUMN "publishedByUserId" UUID,
  ADD COLUMN "rejectedByUserId" UUID,
  ADD COLUMN "rejectedAt" TIMESTAMP(3);

ALTER TABLE "Event"
  ADD CONSTRAINT "Event_publishedByUserId_fkey"
  FOREIGN KEY ("publishedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Event_rejectedByUserId_fkey"
  FOREIGN KEY ("rejectedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Event_publishedByUserId_idx" ON "Event"("publishedByUserId");
CREATE INDEX "Event_rejectedByUserId_idx" ON "Event"("rejectedByUserId");

CREATE FUNCTION prevent_audit_log_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_append_only
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
