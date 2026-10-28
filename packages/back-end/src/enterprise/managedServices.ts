import { LicenseServerError } from "back-end/src/util/errors";

export function managedServiceUnavailable(): never {
  throw new LicenseServerError(
    "GrowthBook managed services are disabled for this installation.",
    503,
  );
}
