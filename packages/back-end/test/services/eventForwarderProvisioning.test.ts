import { EventForwarderConfigInterface } from "shared/validators";
import { ReqContext } from "back-end/types/request";
import {
  provisionEventForwarderThroughLicenseServer,
  updateEventForwarderCredentialsThroughLicenseServer,
} from "back-end/src/services/eventForwarder/connector";

it("does not provision or mutate an existing forwarder", async () => {
  const update = jest.fn();
  const context = {
    models: { eventForwarderConfigs: { update } },
  } as unknown as ReqContext;
  const config = {
    id: "efc",
    sinkType: "bigquery",
    config: "encrypted",
  } as EventForwarderConfigInterface;
  await expect(
    provisionEventForwarderThroughLicenseServer(context, config),
  ).rejects.toMatchObject({ status: 503 });
  await expect(
    updateEventForwarderCredentialsThroughLicenseServer(context, config),
  ).rejects.toMatchObject({ status: 503 });
  expect(update).not.toHaveBeenCalled();
});

it("leaves ordinary Data Sources without a forwarder unaffected", async () => {
  const context = {} as ReqContext;
  await expect(
    provisionEventForwarderThroughLicenseServer(context, null),
  ).resolves.toBeUndefined();
  await expect(
    updateEventForwarderCredentialsThroughLicenseServer(context, null),
  ).resolves.toBeUndefined();
});
