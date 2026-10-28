import type Stripe from "stripe";
import {
  accountFeatures,
  AccountPlan,
  CommercialFeature,
  CommercialFeaturesMap,
  LicenseInterface,
  makeOrgLimits,
  DEFAULT_ORG_LIMITS,
  OrgLimits,
  OrgLimitsAccessor,
  planTierFor,
  SubscriptionInfo,
} from "shared/enterprise";
import {
  OrganizationInterface,
  type SDKAttributeSchema,
} from "shared/types/organization";
import { EventForwarderSinkType } from "shared/types/event-forwarder";
import { managedServiceUnavailable } from "./managedServices";

// This installation grants Enterprise access locally and does not use license keys.
export const getAccountPlan: (org: MinimalOrganization) => AccountPlan = () =>
  "enterprise";
export const getEffectiveAccountPlan: (
  org: MinimalOrganization,
) => AccountPlan = () => "enterprise";
export const getLicense: (
  key?: string,
) => Partial<LicenseInterface> | null = () => null;
export const getLicenseError: (org: MinimalOrganization) => string = () => "";

function getStripeSubscriptionStatus(
  status: Stripe.Subscription.Status,
): SubscriptionInfo["status"] {
  if (status === "past_due") return "past_due";
  if (status === "canceled") return "canceled";
  if (status === "active") return "active";
  if (status === "trialing") return "trialing";
  return "";
}

export function getSubscriptionFromLicense(
  license: Partial<LicenseInterface>,
): SubscriptionInfo | null {
  const orbSub = license.orbSubscription?.id ? license.orbSubscription : null;
  const stripeSub = license.stripeSubscription?.id
    ? license.stripeSubscription
    : null;
  const sub = orbSub || stripeSub;

  if (!sub) return null;

  return {
    billingPlatform: orbSub ? "orb" : "stripe",
    externalId: sub.id,
    trialEnd: sub.trialEnd,
    status: getStripeSubscriptionStatus(sub.status),
    hasPaymentMethod: !!sub.hasPaymentMethod,
    nextBillDate: new Date((sub.current_period_end || 0) * 1000).toDateString(),
    dateToBeCanceled: new Date((sub.cancel_at || 0) * 1000).toDateString(),
    cancelationDate: new Date((sub.canceled_at || 0) * 1000).toDateString(),
    pendingCancelation: sub.status !== "canceled" && !!sub.cancel_at_period_end,
    isVercelIntegration: !!license.vercelInstallationId,
    stripeCustomerId: license.stripeCustomerId,
  };
}

type MinimalOrganization = {
  id: string;
  licenseKey?: string;
  enterprise?: boolean;
  restrictAuthSubPrefix?: string;
  restrictLoginMethod?: string;
  isVercelIntegration?: boolean;
  subscription?: {
    status: Stripe.Subscription.Status;
  };
};

export function getLowestPlanPerFeature(
  accountFeatures: CommercialFeaturesMap,
): Partial<Record<CommercialFeature, AccountPlan>> {
  const lowestPlanPerFeature: Partial<Record<CommercialFeature, AccountPlan>> =
    {};

  // evaluate in order from highest to lowest plan
  const plansFromHighToLow: AccountPlan[] = [
    "enterprise",
    "pro_sso",
    "pro",
    "starter",
    "oss",
  ];
  plansFromHighToLow.forEach((accountPlan) => {
    accountFeatures[accountPlan].forEach((feature) => {
      lowestPlanPerFeature[feature] = accountPlan;
    });
  });

  return lowestPlanPerFeature;
}

export function isActiveSubscriptionStatus(
  status?: Stripe.Subscription.Status | SubscriptionInfo["status"],
) {
  return ["active", "trialing", "past_due"].includes(status || "");
}

function planHasPremiumFeature(
  plan: AccountPlan,
  feature: CommercialFeature,
): boolean {
  return accountFeatures[plan].has(feature);
}

export function orgHasPremiumFeature(
  org: MinimalOrganization,
  feature: CommercialFeature,
): boolean {
  return planHasPremiumFeature(getEffectiveAccountPlan(org), feature);
}

export const postNewVercelSubscriptionToLicenseServer: (
  organization: OrganizationInterface,
  installationId: string,
  userName: string,
) => Promise<LicenseInterface> = async () => managedServiceUnavailable();

export const postCancelSubscriptionToLicenseServer: (
  licenseId: string,
) => Promise<void> = async () => managedServiceUnavailable();

export function isAirGappedLicenseKey(licenseKey: string | undefined): boolean {
  if (!licenseKey) return false;
  return !licenseKey.startsWith("license");
}

export function getOrgLimits(
  org: MinimalOrganization &
    Pick<OrganizationInterface, "limits" | "dateCreated">,
  planLimitsOverride?: OrgLimits,
): OrgLimitsAccessor {
  const effectivePlan = getEffectiveAccountPlan(org);
  const tier = planTierFor(effectivePlan);
  return makeOrgLimits({
    effectivePlan,
    orgLimits: org.limits,
    orgDateCreated: org.dateCreated,
    planLimits:
      planLimitsOverride ?? (tier ? DEFAULT_ORG_LIMITS[tier] : undefined),
  });
}

type EventForwarderLicenseProvisionBaseParams = {
  organizationId: string;
  datasourceId: string;
  topic: string;
  attributeSchema: SDKAttributeSchema;
  connectorName?: string;
  connectorId?: string;
};

export type EventForwarderLicenseProvisionParams =
  | (EventForwarderLicenseProvisionBaseParams & {
      sinkType: "bigquery";
      bigqueryProjectId: string;
      tablePrefix: string;
      bigqueryDataset: string;
      serviceAccountKeyJson: string;
    })
  | (EventForwarderLicenseProvisionBaseParams & {
      sinkType: "snowflake";
      snowflake: {
        tablePrefix: string;
        account: string;
        accessUrl?: string;
        username: string;
        database: string;
        schema: string;
        privateKey: string;
        privateKeyPassword?: string;
        role?: string;
        warehouse?: string;
      };
    })
  // Zerobus sink: no Confluent resources, creds stay in the encrypted config doc.
  | {
      sinkType: "databricks";
      organizationId: string;
      datasourceId: string;
      region: "us-east-1" | "eu-west-1";
    };

export const postProvisionEventForwarderToLicenseServer: (
  params: EventForwarderLicenseProvisionParams,
) => Promise<{
  schemaId: number;
  connectorName: string;
  connectorId: string;
}> = async () => managedServiceUnavailable();

export const postTeardownEventForwarderToLicenseServer: (params: {
  organizationId: string;
  datasourceId: string;
  sinkType: EventForwarderSinkType;
  topic?: string;
  connectorName?: string;
  connectorId?: string;
}) => Promise<{ ok: true }> = async () => managedServiceUnavailable();

export const postPauseEventForwarderToLicenseServer: (params: {
  organizationId: string;
  datasourceId: string;
  connectorName: string;
}) => Promise<{ ok: true }> = async () => managedServiceUnavailable();

export const postResumeEventForwarderToLicenseServer: (params: {
  organizationId: string;
  datasourceId: string;
  connectorName: string;
}) => Promise<{ ok: true }> = async () => managedServiceUnavailable();

export type EventForwarderLicenseConnectorPhase =
  | "provisioning"
  | "ready"
  | "error"
  | "paused";

export type EventForwarderLicenseConnectorStatus = {
  /** Absent for databricks, which has no Confluent connector. */
  confluentState?: string;
  phase: EventForwarderLicenseConnectorPhase;
  message?: string;
  taskErrors?: { id: number; state: string; trace?: string }[];
};

export const postRestartEventForwarderToLicenseServer: (params: {
  organizationId: string;
  datasourceId: string;
  connectorName: string;
}) => Promise<{ ok: true }> = async () => managedServiceUnavailable();

export const postEventForwarderStatusToLicenseServer: (params: {
  organizationId: string;
  datasourceId: string;
  connectorName: string;
}) => Promise<EventForwarderLicenseConnectorStatus> = async () =>
  managedServiceUnavailable();

export type EventForwarderLicenseUpdateCredentialsParams =
  | {
      organizationId: string;
      datasourceId: string;
      connectorName: string;
      sinkType: "bigquery";
      bigqueryProjectId: string;
      bigqueryDataset: string;
      tablePrefix: string;
      serviceAccountKeyJson: string;
    }
  | {
      organizationId: string;
      datasourceId: string;
      connectorName: string;
      sinkType: "snowflake";
      snowflake: {
        tablePrefix: string;
        account: string;
        accessUrl?: string;
        username: string;
        database: string;
        schema: string;
        privateKey: string;
        privateKeyPassword?: string;
        role?: string;
        warehouse?: string;
      };
    }
  | {
      organizationId: string;
      datasourceId: string;
      connectorName: string;
      sinkType: "databricks";
    };

export const postUpdateEventForwarderCredentialsToLicenseServer: (
  params: EventForwarderLicenseUpdateCredentialsParams,
) => Promise<{ ok: true }> = async () => managedServiceUnavailable();
