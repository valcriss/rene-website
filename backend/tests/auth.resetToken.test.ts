import {
  buildPasswordResetUrl,
  generatePasswordResetToken,
  hashPasswordResetToken,
  passwordResetTokenTtlMinutes
} from "../src/auth/resetToken";

describe("auth resetToken", () => {
  it("generates a token", () => {
    expect(generatePasswordResetToken()).toEqual(expect.any(String));
    expect(generatePasswordResetToken()).not.toBe(generatePasswordResetToken());
  });

  it("hashes a token deterministically", () => {
    expect(hashPasswordResetToken("abc")).toBe(hashPasswordResetToken("abc"));
    expect(hashPasswordResetToken("abc")).not.toBe(hashPasswordResetToken("def"));
  });

  it("builds a reset url from PUBLIC_APP_URL", () => {
    expect(buildPasswordResetUrl("token", { PUBLIC_APP_URL: "https://rene.example.com/app" })).toBe(
      "https://rene.example.com/reset-password?token=token"
    );
  });

  it("falls back to localhost when PUBLIC_APP_URL is missing", () => {
    expect(buildPasswordResetUrl("token", {})).toBe(
      "http://localhost:3000/reset-password?token=token"
    );
    expect(passwordResetTokenTtlMinutes).toBe(30);
  });
});