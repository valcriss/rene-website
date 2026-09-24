import { signUserToken } from "../src/auth/jwt";
import { UserRole } from "../src/auth/roles";

export const authHeader = (role: UserRole, id = `test-${role.toLowerCase()}`) => {
  process.env.JWT_SECRET = "test-secret";
  const result = signUserToken({
    id,
    name: "Test User",
    email: `${id}@example.com`,
    role
  });

  if (!result.ok) {
    throw new Error("Token generation failed");
  }

  return `Bearer ${result.value}`;
};
