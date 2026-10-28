import {
  EventForwarderSinkType,
  EventForwarderStatus,
} from "shared/types/event-forwarder";
import { EventForwarderDatasourceParams } from "shared/util";
import {
  EventForwarderConfigInterface,
  EventForwarderConnectorPhase,
  EventForwarderStatusResponse,
} from "shared/validators";
import { managedServiceUnavailable } from "back-end/src/enterprise/managedServices";
import {
  EventForwarderLicenseConnectorPhase,
  EventForwarderLicenseConnectorStatus,
} from "back-end/src/enterprise/licenseUtil";
import { ReqContext } from "back-end/types/request";

// ---------------------------------------------------------------------------
// Connector status sync
// ---------------------------------------------------------------------------

export function mapLicenseConnectorPhaseToEventForwarderStatus(
  phase: EventForwarderLicenseConnectorPhase,
): EventForwarderStatus {
  switch (phase) {
    case "ready":
      return "ready";
    case "error":
      return "error";
    case "paused":
      return "paused";
    case "provisioning":
    default:
      return "pending";
  }
}

export function buildEventForwarderStatusResponse(
  connectorStatus: EventForwarderLicenseConnectorStatus,
): EventForwarderStatusResponse {
  const status = mapLicenseConnectorPhaseToEventForwarderStatus(
    connectorStatus.phase,
  );
  return {
    status,
    phase: connectorStatus.phase as EventForwarderConnectorPhase,
    message: connectorStatus.message,
    confluentState: connectorStatus.confluentState,
    taskErrors: connectorStatus.taskErrors,
  };
}
export const syncEventForwarderStatusFromLicenseServer: (
  context: ReqContext,
  eventForwarderConfig: EventForwarderConfigInterface,
) => Promise<EventForwarderStatusResponse> = async () => ({
  status: "error",
  phase: "error",
  message: "Event Forwarder is disabled for this installation.",
});

export const provisionEventForwarderThroughLicenseServer: (
  context: ReqContext,
  eventForwarderConfig: EventForwarderConfigInterface | null,
  datasourceParams?: EventForwarderDatasourceParams,
  options?: { restartAfterProvision?: boolean },
) => Promise<void> = async (...args) => {
  if (args[1]) managedServiceUnavailable();
};

export const updateEventForwarderCredentialsThroughLicenseServer: (
  context: ReqContext,
  eventForwarderConfig: EventForwarderConfigInterface | null,
  datasourceParams?: EventForwarderDatasourceParams,
) => Promise<void> = async (...args) => {
  if (args[1]) managedServiceUnavailable();
};

export const pauseEventForwarderThroughLicenseServer: (
  context: ReqContext,
  eventForwarderConfig: EventForwarderConfigInterface,
) => Promise<void> = async () => managedServiceUnavailable();

export const resumeEventForwarderThroughLicenseServer: (
  context: ReqContext,
  eventForwarderConfig: EventForwarderConfigInterface,
) => Promise<void> = async () => managedServiceUnavailable();

export const teardownEventForwarderInfrastructureRemote: (snapshot: {
  organizationId: string;
  datasourceId: string;
  sinkType?: EventForwarderSinkType;
  topic?: string;
  connectorName?: string;
  connectorId?: string;
}) => Promise<void> = async () => managedServiceUnavailable();
