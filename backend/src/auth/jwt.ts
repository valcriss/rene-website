import jwt, { SignOptions } from "jsonwebtoken";
import { AuthUser } from "./types";

export type JwtResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

const getSecret = () => {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) return null;
  return secret;
};

const getExpiresIn = (): SignOptions["expiresIn"] => {
  const value = process.env.JWT_EXPIRES_IN?.trim();
  return (value && value.length > 0 ? value : "12h") as SignOptions["expiresIn"];
};

export const signUserToken = (user: AuthUser): JwtResult<string> => {
  const secret = getSecret();
  if (!secret) {
    return { ok: false, errors: ["JWT_SECRET is required"] };
  }

  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    secret,
    { expiresIn: getExpiresIn() }
  );

  return { ok: true, value: token };
};

export const verifyUserToken = (token: string): JwtResult<AuthUser> => {
  const secret = getSecret();
  if (!secret) {
    return { ok: false, errors: ["JWT_SECRET is required"] };
  }

  try {
    const payload = jwt.verify(token, secret) as jwt.JwtPayload;
    if (!payload || typeof payload !== "object") {
      return { ok: false, errors: ["Token invalide"] };
    }

    const id = typeof payload.sub === "string" ? payload.sub : null;
    const email = typeof payload.email === "string" ? payload.email : null;
    const name = typeof payload.name === "string" ? payload.name : null;
    const role = typeof payload.role === "string" ? payload.role : null;

    if (!id || !email || !name || !role) {
      return { ok: false, errors: ["Token invalide"] };
    }

    return {
      ok: true,
      value: {
        id,
        email,
        name,
        role: role as AuthUser["role"]
      }
    };
  } catch {
    return { ok: false, errors: ["Token invalide"] };
  }
};
