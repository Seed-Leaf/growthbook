import Agenda from "agenda";
import { SDKConnectionInterface } from "shared/types/sdk-connection";
import addProxyUpdateJob, {
  queueSingleProxyUpdate,
} from "back-end/src/jobs/proxyUpdate";

jest.mock("back-end/src/controllers/features", () => ({
  getFeatureDefinitionsWithCache: jest.fn(),
}));
jest.mock("back-end/src/services/organizations", () => ({
  getContextForAgendaJobByOrgId: jest.fn(),
}));
jest.mock("back-end/src/models/SdkConnectionModel", () => ({
  clearProxyError: jest.fn(),
  findSDKConnectionById: jest.fn(),
  setProxyError: jest.fn(),
}));

it("queues customer proxies but never the GrowthBook Cloud Proxy", async () => {
  const job = { unique: jest.fn(), schedule: jest.fn(), save: jest.fn() };
  const create = jest.fn(() => job);
  addProxyUpdateJob({
    define: jest.fn(),
    on: jest.fn(),
    create,
  } as unknown as Agenda);
  const connection = {
    id: "sdk",
    proxy: { enabled: true, host: "https://customer-proxy.example" },
  } as SDKConnectionInterface;
  await queueSingleProxyUpdate("org", connection, true);
  expect(create).not.toHaveBeenCalled();
  await queueSingleProxyUpdate("org", connection, false);
  expect(create).toHaveBeenCalledWith(
    "proxyUpdate",
    expect.objectContaining({ connectionId: "sdk", useCloudProxy: false }),
  );
  expect(job.save).toHaveBeenCalledTimes(1);
});
