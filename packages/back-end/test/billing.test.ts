import { OrganizationInterface } from "shared/types/organization";
import { fetch } from "back-end/src/util/http.util";
import { getUsage, getUsageFromCache } from "back-end/src/enterprise/billing";

jest.mock("back-end/src/util/http.util", () => ({ fetch: jest.fn() }));

it("returns local unlimited usage without contacting the billing server", async () => {
  const org = {
    id: "org",
    licenseKey: "license_legacy",
  } as OrganizationInterface;
  const usage = await getUsage(org);
  expect(usage.limits.requests).toBe("unlimited");
  expect(usage.eventForwarder?.blocked).toBe(false);
  usage.cdn.status = "over";
  expect(getUsageFromCache(org).cdn.status).toBe("under");
  expect(fetch).not.toHaveBeenCalled();
});
