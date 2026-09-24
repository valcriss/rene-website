import { Request } from "express";
import { getAuthenticatedUser } from "../src/auth/request";

describe("auth request typings", () => {
  it("returns the authenticated user", () => {
    const user = { id: "user-1", name: "User", email: "user@example.com", role: "EDITOR" as const };
    const req = { user } as Request;

    expect(getAuthenticatedUser(req)).toBe(user);
  });

  it("throws when authentication middleware did not attach a user", () => {
    expect(() => getAuthenticatedUser({} as Request)).toThrow(
      "Authenticated user is missing from the request"
    );
  });
});
