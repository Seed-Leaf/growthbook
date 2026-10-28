import { Response } from "express";
import { AuthRequest } from "back-end/src/types/AuthRequest";
import { getContextFromReq } from "back-end/src/services/organizations";

async function unavailable(req: AuthRequest, res: Response) {
  const context = getContextFromReq(req);
  if (!context.permissions.canManageBilling())
    context.permissions.throwPermissionError();
  res.status(503).json({
    status: 503,
    message:
      "Billing and managed usage reports are disabled for this installation.",
  });
}

export const postNewProTrialSubscription = unavailable;
export const postNewProSubscriptionIntent = unavailable;
export const postNewProSubscription = unavailable;
export const postInlineProSubscription = unavailable;
export const postCreateBillingSession = unavailable;
export const postSubscriptionSuccess = unavailable;
export const cancelSubscription = unavailable;
export const postSetupIntent = unavailable;
export const updateCustomerDefaultPayment = unavailable;
export const fetchPaymentMethods = unavailable;
export const deletePaymentMethod = unavailable;
export const getUsage = unavailable;
export const getUsageByKey = unavailable;
export const getCustomerData = unavailable;
export const getPortalUrl = unavailable;
export const updateCustomerData = unavailable;
