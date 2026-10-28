import { isAllowedGoogleWorkspaceUser } from "../../src/services/auth/googleWorkspacePolicy";

describe("Google Workspace login policy", () => {
  const claims = {
    iss: "https://accounts.google.com",
    email: "member@moulder.ai",
    email_verified: true,
    hd: "moulder.ai",
  };

  it("preserves existing authentication when no allowlist is configured", () => {
    expect(isAllowedGoogleWorkspaceUser({}, [])).toBe(true);
  });

  it("accepts a verified account in the exact Workspace domain", () => {
    expect(isAllowedGoogleWorkspaceUser(claims, ["moulder.ai"])).toBe(true);
  });

  it.each([
    { email: "member@gmail.com" },
    { email: "member@other.moulder.ai" },
    { email: "member@moulder.ai.attacker.example" },
    { email_verified: false },
    { email_verified: "true" },
    { hd: "other.example" },
    { hd: null },
    { iss: "https://other.example" },
  ])("rejects claims outside the policy: %j", (override) => {
    expect(
      isAllowedGoogleWorkspaceUser({ ...claims, ...override }, ["moulder.ai"]),
    ).toBe(false);
  });
});
