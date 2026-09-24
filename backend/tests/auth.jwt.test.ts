import jwt from "jsonwebtoken";
import { signUserToken, verifyUserToken } from "../src/auth/jwt";
import type { AuthUser } from "../src/auth/types";

describe("auth jwt", () => {
  const validOptions = { issuer: "rene-website", audience: "rene-website-web", algorithm: "HS256" as const };
  const user: AuthUser = {
    id: "user-1",
    name: "Test",
    email: "test@example.com",
    role: "EDITOR"
  };

  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  it("signs and verifies token", () => {
    const tokenResult = signUserToken(user);
    expect(tokenResult.ok).toBe(true);
    if (!tokenResult.ok) return;

    const verifyResult = verifyUserToken(tokenResult.value);
    expect(verifyResult.ok).toBe(true);
    if (!verifyResult.ok) return;

    expect(verifyResult.value).toEqual(user);
  });

  it("signs and verifies server-session claims", () => {
    const tokenResult = signUserToken({ ...user, sessionVersion: 3 }, "session-1");
    expect(tokenResult.ok).toBe(true);
    if (!tokenResult.ok) return;
    expect(verifyUserToken(tokenResult.value)).toEqual({
      ok: true,
      value: { ...user, sessionId: "session-1", sessionVersion: 3 }
    });
  });

  it("signs token with custom expiration", () => {
    process.env.JWT_EXPIRES_IN = "1h";
    const tokenResult = signUserToken(user);
    expect(tokenResult.ok).toBe(true);
  });

  it("returns error on invalid token", () => {
    const verifyResult = verifyUserToken("invalid.token.value");
    expect(verifyResult.ok).toBe(false);
  });

  it("returns error when secret is missing", () => {
    delete process.env.JWT_SECRET;
    const signResult = signUserToken(user);
    expect(signResult.ok).toBe(false);

    const verifyResult = verifyUserToken("token");
    expect(verifyResult.ok).toBe(false);
  });

  it("rejects token with missing claims", () => {
    for (const payload of [
      { email: "test@example.com", name: "Test", role: "EDITOR" },
      { sub: "user-1", name: "Test", role: "EDITOR" },
      { sub: "user-1", email: "test@example.com", role: "EDITOR" }
    ]) {
      const token = jwt.sign(payload, process.env.JWT_SECRET as string, validOptions);
      expect(verifyUserToken(token).ok).toBe(false);
    }
  });

  it("rejects token with string payload", () => {
    const verifySpy = jest.spyOn(jwt, "verify").mockReturnValueOnce("payload" as never);
    const verifyResult = verifyUserToken("token");
    expect(verifyResult.ok).toBe(false);
    verifySpy.mockRestore();
  });

  it("rejects token with invalid role type", () => {
    const token = jwt.sign(
      { sub: "user-1", email: "test@example.com", name: "Test", role: 123 },
      process.env.JWT_SECRET as string,
      validOptions
    );
    const verifyResult = verifyUserToken(token);
    expect(verifyResult.ok).toBe(false);
  });

  it("rejects token with an unknown role", () => {
    const token = jwt.sign(
      { sub: "user-1", email: "test@example.com", name: "Test", role: "SUPER_ADMIN" },
      process.env.JWT_SECRET as string,
      validOptions
    );
    const verifyResult = verifyUserToken(token);
    expect(verifyResult.ok).toBe(false);
  });

  it("rejects token with empty payload", () => {
    const token = jwt.sign({}, process.env.JWT_SECRET as string, validOptions);
    const verifyResult = verifyUserToken(token);
    expect(verifyResult.ok).toBe(false);
  });

  it("rejects wrong issuer, audience and algorithm", () => {
    const payload = { sub: user.id, email: user.email, name: user.name, role: user.role };
    expect(verifyUserToken(jwt.sign(payload, "test-secret", { ...validOptions, issuer: "other" })).ok).toBe(false);
    expect(verifyUserToken(jwt.sign(payload, "test-secret", { ...validOptions, audience: "other" })).ok).toBe(false);
    expect(verifyUserToken(jwt.sign(payload, "test-secret", { algorithm: "HS384", issuer: "rene-website", audience: "rene-website-web" })).ok)
      .toBe(false);
  });

  it("handles whitespace-only configuration and malformed session claim types", () => {
    process.env.JWT_SECRET = "   ";
    expect(signUserToken(user).ok).toBe(false);
    process.env.JWT_SECRET = "test-secret";
    process.env.JWT_EXPIRES_IN = "   ";
    expect(signUserToken(user).ok).toBe(true);
    const token = jwt.sign(
      { sub: user.id, email: user.email, name: user.name, role: user.role, sid: "session", sv: "bad" },
      "test-secret",
      validOptions
    );
    expect(verifyUserToken(token)).toEqual({
      ok: true,
      value: { ...user, sessionId: "session", sessionVersion: undefined }
    });
  });
});
