import { createHash } from "node:crypto";

export const hashPassword = (password: string) =>
  createHash("sha256").update(password).digest("hex");

export const verifyPassword = (password: string, passwordHash: string) =>
  hashPassword(password) === passwordHash;
