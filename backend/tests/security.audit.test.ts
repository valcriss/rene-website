const mockPrismaCreate = jest.fn();

jest.mock("../src/prisma/client", () => ({
  prisma: { auditLog: { create: mockPrismaCreate } }
}));

import { createAuditLogger } from "../src/security/audit";

describe("security audit logger", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.DATABASE_URL = originalDatabaseUrl;
    mockPrismaCreate.mockReset();
  });

  it("persists only an allowlisted audit event shape outside tests", async () => {
    process.env.NODE_ENV = "production";
    process.env.DATABASE_URL = "postgresql://audit-test:secret@localhost:5432/rene";
    const create = jest.fn().mockResolvedValue(undefined);
    const logger = createAuditLogger({ auditLog: { create } });

    await logger.record({
      requestId: "request-1",
      actorId: "11111111-1111-1111-1111-111111111111",
      action: "event.publish",
      target: "event:abc",
      outcome: "success",
      metadata: { featured: true }
    });

    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "event.publish", outcome: "success" }) });
  });

  it("does not create database records while application tests execute", async () => {
    process.env.NODE_ENV = "test";
    const create = jest.fn();
    const logger = createAuditLogger({ auditLog: { create } });

    await logger.record({ action: "auth.login", outcome: "failure" });

    expect(create).not.toHaveBeenCalled();
  });

  it("does not attempt an audit write without a configured database", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.DATABASE_URL;
    const create = jest.fn();
    const logger = createAuditLogger({ auditLog: { create } });

    await logger.record({ action: "auth.login", outcome: "failure" });

    expect(create).not.toHaveBeenCalled();
  });

  it("loads the Prisma writer only when an audit event is persisted", async () => {
    process.env.NODE_ENV = "production";
    process.env.DATABASE_URL = "postgresql://audit-test:secret@localhost:5432/rene";
    mockPrismaCreate.mockResolvedValue(undefined);
    const logger = createAuditLogger();

    await logger.record({ action: "admin.settings.update", outcome: "success" });

    expect(mockPrismaCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "admin.settings.update" }) });
  });
});
