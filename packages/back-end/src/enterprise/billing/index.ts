import {
  OrganizationInterface,
  OrganizationUsage,
} from "shared/types/organization";

export const UNLIMITED_USAGE: OrganizationUsage = {
  limits: {
    requests: "unlimited",
    bandwidth: "unlimited",
    managedClickhouseEvents: "unlimited",
    eventForwarderEvents: "unlimited",
  },
  cdn: {
    lastUpdated: new Date(),
    status: "under",
  },
  managedClickhouse: {
    lastUpdated: new Date(),
    status: "under",
  },
  eventForwarder: {
    lastUpdated: new Date(),
    status: "under",
    blocked: false,
  },
};

export const getUsageFromCache: (
  organization: OrganizationInterface,
) => OrganizationUsage = () => structuredClone(UNLIMITED_USAGE);
export const getUsage: (
  organization: OrganizationInterface,
) => Promise<OrganizationUsage> = async () => structuredClone(UNLIMITED_USAGE);
