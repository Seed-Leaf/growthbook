import { Response } from "express";
import { AuthRequest } from "back-end/src/types/AuthRequest";
import { getContextFromReq } from "back-end/src/services/organizations";

function requireBillingAccess(req: AuthRequest) {
  if (req.superAdmin) return;
  const context = getContextFromReq(req);
  if (!context.permissions.canManageBilling()) {
    context.permissions.throwPermissionError();
  }
}

export async function getLicenseData(req: AuthRequest, res: Response) {
  requireBillingAccess(req);
  res.status(200).json({ status: 200, licenseData: null });
}

async function unavailable(req: AuthRequest, res: Response) {
  requireBillingAccess(req);
  res.status(503).json({
    status: 503,
    message: "License management is disabled for this installation.",
  });
}

export const getLicenseReport = unavailable;
export const postCreateTrialEnterpriseLicense = unavailable;
export const postResendEmailVerificationEmail = unavailable;
export const postVerifyEmail = unavailable;
