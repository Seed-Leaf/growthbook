import { useDefinitions } from "@/services/DefinitionsContext";
import usePermissionsUtil from "@/hooks/usePermissionsUtils";

export type DataSourceOptionKey = "managed" | "event-forwarder" | "custom";
export type DataSourceOptionAvailability =
  | { status: "available" }
  | { status: "already-set-up"; datasourceId: string }
  | { status: "upgrade-required" }
  | { status: "unavailable"; reason: string };

export function useDataSourceOptionEligibility(): Record<
  DataSourceOptionKey,
  DataSourceOptionAvailability
> {
  const { project, projects } = useDefinitions();
  const permissions = usePermissionsUtil();
  return {
    managed: {
      status: "unavailable",
      reason:
        "Managed Warehouse is disabled for this installation. Connect your own Data Source instead.",
    },
    "event-forwarder": {
      status: "unavailable",
      reason: "Event Forwarder is disabled for this installation.",
    },
    custom: permissions.canViewCreateDataSourceModal(project, projects)
      ? { status: "available" }
      : {
          status: "unavailable",
          reason:
            "You don't have permission to add Data Sources in this project.",
        },
  };
}
