type AuditEvent = {
  requestId?: string;
  actorId?: string;
  action: string;
  target?: string;
  outcome: "success" | "failure";
  metadata?: Record<string, string | number | boolean>;
};

type AuditWriter = { auditLog: { create: (input: { data: AuditEvent }) => Promise<unknown> } };

export const createAuditLogger = (writer?: AuditWriter) => ({
  record: async (event: AuditEvent) => {
    // Unit and route tests deliberately run without a database. Production configuration
    // requires DATABASE_URL, so this also makes a missing configuration non-disclosive.
    if (process.env.NODE_ENV === "test" || !process.env.DATABASE_URL?.trim()) return;
    // Prisma is resolved only when a configured environment actually persists an audit.
    // That lets CI run unit tests before generated Prisma artifacts are available.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const auditWriter = writer ?? require("../prisma/client").prisma as AuditWriter;
    await auditWriter.auditLog.create({ data: event });
  }
});

export const auditLogger = createAuditLogger();
