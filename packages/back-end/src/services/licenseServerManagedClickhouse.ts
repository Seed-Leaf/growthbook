import type { DailyUsage, DailyUsageByKey } from "shared/types/organization";
import { managedServiceUnavailable } from "back-end/src/enterprise/managedServices";

export const dangerousRecreateClickhouseTables: (
  orgId: string,
) => Promise<"started" | "already-running"> = async () =>
  managedServiceUnavailable();

export const deleteClickhouseUser: (
  orgId: string,
) => Promise<void> = async () => managedServiceUnavailable();

export const syncJsonErgonomicsInClickhouse: (
  orgId: string,
) => Promise<boolean> = async () => managedServiceUnavailable();

export const addCloudSDKMapping: (
  key: string,
  organization: string,
) => Promise<void> = async () => managedServiceUnavailable();

export const migrateOverageEventsForOrgId: (
  orgId: string,
) => Promise<void> = async () => managedServiceUnavailable();

export const getDailyUsageForOrg: (
  orgId: string,
  start: Date,
  end: Date,
) => Promise<DailyUsage[]> = async () => managedServiceUnavailable();

export const getDailyUsageByKeyForOrg: (
  orgId: string,
  start: Date,
  end: Date,
) => Promise<DailyUsageByKey[]> = async () => managedServiceUnavailable();
