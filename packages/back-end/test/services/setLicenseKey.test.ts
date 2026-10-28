import { OrganizationInterface } from "shared/types/organization";
import { setLicenseKey } from "back-end/src/services/organizations";

it("rejects license changes without modifying the organization", async () => {
  const org = { id: "org", licenseKey: "license_old" } as OrganizationInterface;
  await expect(setLicenseKey(org, "license_new")).rejects.toThrow(
    "License keys are not used by this installation.",
  );
  expect(org.licenseKey).toBe("license_old");
});
