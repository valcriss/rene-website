import jwt from "jsonwebtoken";
import { signUserToken, verifyUserToken } from "../src/auth/jwt";
import type { AuthUser } from "../src/auth/types";

describe("auth jwt", () => {
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
    const token = jwt.sign({ sub: "user-1" }, process.env.JWT_SECRET as string);
    const verifyResult = verifyUserToken(token);
    expect(verifyResult.ok).toBe(false);
  });

  it("rejects token with string payload", () => {
    const token = jwt.sign("payload", process.env.JWT_SECRET as string);
    const verifyResult = verifyUserToken(token);
    expect(verifyResult.ok).toBe(false);
  });

  it("rejects token with invalid role type", () => {
    const token = jwt.sign(
      { sub: "user-1", email: "test@example.com", name: "Test", role: 123 },
      process.env.JWT_SECRET as string
    );
    const verifyResult = verifyUserToken(token);
    expect(verifyResult.ok).toBe(false);
  });

  it("rejects token with empty payload", () => {
    const token = jwt.sign({}, process.env.JWT_SECRET as string);
    const verifyResult = verifyUserToken(token);
    expect(verifyResult.ok).toBe(false);
  });
});
