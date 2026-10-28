import { CookieOptions } from "express";
import { freeEmailDomains } from "free-email-domains-typescript";
import { attributionCookieSchema, AttributionCookie } from "shared/validators";
import { logger } from "back-end/src/util/logger";

const COOKIE_NAME = "gb_attr";
const COOKIE_MAX_AGE_DAYS = 30;

type RequestWithCookies = { cookies?: Record<string, string> };
type ResponseWithSetCookie = {
  cookie: (name: string, value: string, options: CookieOptions) => unknown;
};

export function classifyEmail(email: string): "free" | "business" {
  const domain = email.toLowerCase().split("@")[1] || "";
  return freeEmailDomains.includes(domain) ? "free" : "business";
}

export function parseAttributionCookie(
  req: RequestWithCookies,
): AttributionCookie {
  const raw = req.cookies?.[COOKIE_NAME];
  if (!raw) return {};
  try {
    const result = attributionCookieSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : {};
  } catch {
    return {};
  }
}

/**
 * Re-issue gb_attr via a server-set Set-Cookie header so Safari ITP's
 * 7-day cap on JS-set cookies doesn't expire it before org creation.
 * Called from postOAuthCallback to harden the cookie for the gap between
 * completing OAuth and clicking "Create Organization."
 */
export function reissueAttributionCookie(
  req: RequestWithCookies,
  res: ResponseWithSetCookie,
) {
  const raw = req.cookies?.[COOKIE_NAME];
  if (!raw) return;
  try {
    res.cookie(COOKIE_NAME, raw, {
      domain: ".growthbook.io",
      path: "/",
      maxAge: COOKIE_MAX_AGE_DAYS * 86400 * 1000,
      sameSite: "lax",
      secure: true,
      httpOnly: false,
    });
  } catch (e) {
    logger.warn("Failed to reissue attribution cookie", e);
  }
}
