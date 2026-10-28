import { fetch } from "back-end/src/util/http.util";
import {
  getLicense,
  postProvisionEventForwarderToLicenseServer,
  postTeardownEventForwarderToLicenseServer,
  postPauseEventForwarderToLicenseServer,
  postResumeEventForwarderToLicenseServer,
  postRestartEventForwarderToLicenseServer,
  postEventForwarderStatusToLicenseServer,
  postUpdateEventForwarderCredentialsToLicenseServer,
} from "back-end/src/enterprise/licenseUtil";
import {
  dangerousRecreateClickhouseTables,
  deleteClickhouseUser,
  syncJsonErgonomicsInClickhouse,
  addCloudSDKMapping,
  getDailyUsageForOrg,
} from "back-end/src/services/licenseServerManagedClickhouse";
import { LicenseModel } from "back-end/src/enterprise/models/licenseModel";

jest.mock("back-end/src/util/http.util", () => ({ fetch: jest.fn() }));
jest.mock("back-end/src/enterprise/models/licenseModel", () => ({
  LicenseModel: { findOne: jest.fn() },
}));

beforeEach(() => jest.clearAllMocks());

it("does not read legacy license data from a server or MongoDB", () => {
  expect(getLicense("license_existing")).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
  expect(LicenseModel.findOne).not.toHaveBeenCalled();
});

it("rejects every managed Event Forwarder operation without making HTTP requests", async () => {
  const params = {
    organizationId: "org",
    datasourceId: "ds",
    connectorName: "connector",
    sinkType: "databricks" as const,
  };
  const operations = [
    () =>
      postProvisionEventForwarderToLicenseServer({
        ...params,
        region: "us-east-1",
      }),
    () => postTeardownEventForwarderToLicenseServer(params),
    () => postPauseEventForwarderToLicenseServer(params),
    () => postResumeEventForwarderToLicenseServer(params),
    () => postRestartEventForwarderToLicenseServer(params),
    () => postEventForwarderStatusToLicenseServer(params),
    () => postUpdateEventForwarderCredentialsToLicenseServer(params),
  ];
  for (const operation of operations) {
    await expect(operation()).rejects.toMatchObject({ status: 503 });
  }
  expect(fetch).not.toHaveBeenCalled();
});

it("rejects managed warehouse operations without network requests", async () => {
  const operations = [
    () => dangerousRecreateClickhouseTables("org"),
    () => deleteClickhouseUser("org"),
    () => syncJsonErgonomicsInClickhouse("org"),
    () => addCloudSDKMapping("sdk-key", "org"),
    () => getDailyUsageForOrg("org", new Date(0), new Date()),
  ];
  for (const operation of operations) {
    await expect(operation()).rejects.toMatchObject({ status: 503 });
  }
  expect(fetch).not.toHaveBeenCalled();
});
