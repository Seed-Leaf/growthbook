import { accountFeatures } from "shared/enterprise";
import {
  getAccountPlan,
  getEffectiveAccountPlan,
  getLicense,
  getLicenseError,
  getOrgLimits,
  orgHasPremiumFeature,
} from "back-end/src/enterprise";

const originalEnv = process.env;
afterEach(() => {
  process.env = originalEnv;
});

describe("local Enterprise entitlements", () => {
  it.each(["true", "false"])(
    "does not depend on cloud mode or a stored key (%s)",
    (isCloud) => {
      process.env = {
        ...originalEnv,
        IS_CLOUD: isCloud,
        LICENSE_KEY: "invalid-key",
        SSO_CONFIG: "configured",
        IS_MULTI_ORG: "true",
      };
      for (const org of [
        { id: "org" },
        { id: "org", enterprise: false, licenseKey: "license_expired" },
        {
          id: "org",
          licenseKey: "malformed-offline-key",
          restrictLoginMethod: "sso",
        },
      ]) {
        expect(getAccountPlan(org)).toBe("enterprise");
        expect(getEffectiveAccountPlan(org)).toBe("enterprise");
        expect(getLicenseError(org)).toBe("");
        expect(getLicense(org.licenseKey)).toBeNull();
      }
    },
  );

  it("grants the Enterprise feature set without a license", () => {
    const org = { id: "org", licenseKey: "invalid" };
    for (const feature of accountFeatures.enterprise) {
      expect(orgHasPremiumFeature(org, feature)).toBe(true);
    }
    expect(orgHasPremiumFeature(org, "custom-roles")).toBe(true);
    expect(orgHasPremiumFeature(org, "scim")).toBe(true);
  });

  it("ignores legacy free-plan project and environment limits", () => {
    const limits = getOrgLimits({
      id: "org",
      dateCreated: new Date(),
      limits: {
        maxProjects: 1,
        customEnvironments: false,
        roleManagement: false,
      },
    });
    expect(limits.getMaxProjects()).toBeNull();
    expect(limits.supportsCustomEnvironments()).toBe(true);
    expect(limits.orgSupportsRoles()).toBe(true);
  });
});
