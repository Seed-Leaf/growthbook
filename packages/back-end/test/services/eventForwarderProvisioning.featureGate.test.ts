import { EventForwarderConfigInterface } from "shared/validators";
import { ReqContext } from "back-end/types/request";
import {
  pauseEventForwarderThroughLicenseServer,
  resumeEventForwarderThroughLicenseServer,
} from "back-end/src/services/eventForwarder/connector";

it("refuses pause and resume without falsely recording a remote change", async () => {
  const update = jest.fn();
  const context = {
    models: { eventForwarderConfigs: { update } },
  } as unknown as ReqContext;
  const config = {
    id: "efc",
    status: "ready",
    connectorName: "connector",
  } as EventForwarderConfigInterface;
  await expect(
    pauseEventForwarderThroughLicenseServer(context, config),
  ).rejects.toMatchObject({ status: 503 });
  await expect(
    resumeEventForwarderThroughLicenseServer(context, {
      ...config,
      status: "paused",
    }),
  ).rejects.toMatchObject({ status: 503 });
  expect(update).not.toHaveBeenCalled();
});
