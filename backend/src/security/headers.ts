import { NextFunction, Request, Response } from "express";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self'",
  // Vue and Leaflet apply dynamic colors/positions as style attributes. This is limited to CSS;
  // scripts remain strictly self-hosted and never receive unsafe-eval or unsafe-inline.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self' blob:"
].join("; ");

export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  const cspHeader = process.env.CSP_REPORT_ONLY === "true"
    ? "Content-Security-Policy-Report-Only"
    : "Content-Security-Policy";
  res.set(cspHeader, contentSecurityPolicy);
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  res.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.set("Permissions-Policy", "geolocation=(), camera=(), microphone=(), payment=(), usb=()");
  res.set("Cross-Origin-Opener-Policy", "same-origin");
  res.set("Cross-Origin-Resource-Policy", "same-origin");

  if (process.env.NODE_ENV === "production" && req.secure) {
    res.set("Strict-Transport-Security", "max-age=86400");
  }
  next();
};

const isSensitivePath = (path: string) =>
  path.startsWith("/api/auth") ||
  path.startsWith("/api/admin") ||
  path.startsWith("/api/subscriptions") ||
  path === "/backoffice" ||
  path.startsWith("/backoffice/");

export const preventPrivateCaching = (req: Request, res: Response, next: NextFunction) => {
  if (req.user || isSensitivePath(req.path)) {
    res.set("Cache-Control", "no-store");
    res.set("Pragma", "no-cache");
  }
  next();
};

const secureRedirectTarget = (value: string | undefined): string | null => {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
};

export const enforceHttps = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV !== "production" || process.env.FORCE_HTTPS !== "true" || req.secure) {
    next();
    return;
  }

  const target = secureRedirectTarget(process.env.SITE_URL);
  if (!target) {
    next();
    return;
  }
  res.redirect(308, `${target}${req.originalUrl}`);
};

export const getContentSecurityPolicy = () => contentSecurityPolicy;
