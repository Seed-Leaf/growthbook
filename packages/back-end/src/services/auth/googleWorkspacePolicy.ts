import { z } from "zod";

const googleWorkspaceClaims = z.object({
  iss: z.enum(["https://accounts.google.com", "accounts.google.com"]),
  email: z.string().email(),
  email_verified: z.literal(true),
  hd: z.string().min(1),
});

export function isAllowedGoogleWorkspaceUser(
  verifiedClaims: unknown,
  allowedDomains: readonly string[],
): boolean {
  if (!allowedDomains.length) return true;
  const claims = googleWorkspaceClaims.safeParse(verifiedClaims);
  if (!claims.success) return false;
  const emailDomain = claims.data.email.split("@")[1].toLowerCase();
  const workspaceDomain = claims.data.hd.toLowerCase();
  return (
    allowedDomains.includes(emailDomain) &&
    allowedDomains.includes(workspaceDomain)
  );
}
