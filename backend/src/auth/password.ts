import { createHash } from "node:crypto";
import argon2 from "argon2";

const createLegacySha256Hash = (password: string) =>
  createHash("sha256").update(password).digest("hex");

const isArgon2Hash = (passwordHash: string) => passwordHash.startsWith("$argon2");
const isLegacySha256Hash = (passwordHash: string) => /^[a-f0-9]{64}$/i.test(passwordHash);

export const needsPasswordRehash = (passwordHash: string) => isLegacySha256Hash(passwordHash);

export const hashPassword = async (password: string) =>
  argon2.hash(password, { type: argon2.argon2id });

export const verifyPassword = async (password: string, passwordHash: string) => {
  if (isArgon2Hash(passwordHash)) {
    try {
      return await argon2.verify(passwordHash, password);
    } catch {
      return false;
    }
  }

  if (isLegacySha256Hash(passwordHash)) {
    return createLegacySha256Hash(password) === passwordHash;
  }

  return false;
};
