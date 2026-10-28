import usePermissionsUtil from "@/hooks/usePermissionsUtils";
import Callout from "@/ui/Callout";

export default function BillingPage() {
  const permissions = usePermissionsUtil();
  return (
    <Callout status={permissions.canManageBilling() ? "info" : "error"}>
      {permissions.canManageBilling()
        ? "Enterprise features are enabled for this installation. Subscription billing is disabled."
        : "You do not have access to view this page."}
    </Callout>
  );
}
