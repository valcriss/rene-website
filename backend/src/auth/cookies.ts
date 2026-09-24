import { Response } from "express";
import {
  ACCESS_COOKIE,
  accessTokenMinutes,
  CSRF_COOKIE,
  generateCsrfToken,
  REFRESH_COOKIE,
  refreshTokenAbsoluteHours
} from "./session";

const secure = () => process.env.NODE_ENV === "production";

export const setSessionCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: secure(),
    sameSite: "strict",
    path: "/api",
    maxAge: accessTokenMinutes * 60 * 1000
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: secure(),
    sameSite: "strict",
    path: "/api/auth",
    maxAge: refreshTokenAbsoluteHours * 60 * 60 * 1000
  });
  res.cookie(CSRF_COOKIE, generateCsrfToken(), {
    httpOnly: false,
    secure: secure(),
    sameSite: "strict",
    path: "/",
    maxAge: refreshTokenAbsoluteHours * 60 * 60 * 1000
  });
};

export const clearSessionCookies = (res: Response) => {
  const common = { secure: secure(), sameSite: "strict" as const };
  res.clearCookie(ACCESS_COOKIE, { ...common, httpOnly: true, path: "/api" });
  res.clearCookie(REFRESH_COOKIE, { ...common, httpOnly: true, path: "/api/auth" });
  res.clearCookie(CSRF_COOKIE, { ...common, httpOnly: false, path: "/" });
};
