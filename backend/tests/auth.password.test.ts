import { createHash } from "node:crypto";
import { hashPassword, needsPasswordRehash, verifyPassword } from "../src/auth/password";

describe("auth password", () => {
  it("hashes passwords with argon2", async () => {
    const passwordHash = await hashPassword("secret123");

    expect(passwordHash.startsWith("$argon2")).toBe(true);
  });

  it("verifies argon2 hashes", async () => {
    const passwordHash = await hashPassword("secret123");

    await expect(verifyPassword("secret123", passwordHash)).resolves.toBe(true);
    await expect(verifyPassword("wrong", passwordHash)).resolves.toBe(false);
  });

  it("verifies legacy sha256 hashes", async () => {
    const legacyHash = createHash("sha256").update("secret123").digest("hex");

    await expect(verifyPassword("secret123", legacyHash)).resolves.toBe(true);
    await expect(verifyPassword("wrong", legacyHash)).resolves.toBe(false);
    expect(needsPasswordRehash(legacyHash)).toBe(true);
  });

  it("returns false for invalid hashes", async () => {
    await expect(verifyPassword("secret123", "invalid-hash")).resolves.toBe(false);
    await expect(verifyPassword("secret123", "$argon2id$v=19$m=1,t=1,p=1$bad$bad"))
      .resolves.toBe(false);
    expect(needsPasswordRehash("invalid-hash")).toBe(false);
  });

  it("does not rehash argon2 hashes", async () => {
    const passwordHash = await hashPassword("secret123");

    expect(needsPasswordRehash(passwordHash)).toBe(false);
  });
});