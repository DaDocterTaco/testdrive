import { afterEach, describe, expect, it, vi } from "vitest";
import {
  chooseInspectionProfile,
  inspectionProfile,
  preferredKeyboardProfile,
  rememberKeyboardProfile,
} from "../../src/devices/selection";
import { makeFact } from "../../src/diagnostics";
import type { Inspection } from "../../src/types";
import { validateInspection } from "../../src/schemas";
const asus = "asus-zenbook-duo-ux8406ca-us";
function inspection(): Inspection {
  return {
    schemaVersion: 1,
    id: "profile-test",
    appVersion: "1.1.0-beta.1",
    deviceClass: "computer",
    purpose: "checking_device",
    createdAt: "2026-10-15T01:00:00.000Z",
    updatedAt: "2026-10-15T01:00:00.000Z",
    state: "ready",
    sellerClaims: [],
    attempts: [],
    selectedTestIds: ["KEY-01"],
    profileFacts: [
      makeFact(
        "manufacturer",
        "Manufacturer",
        "ASUSTeK COMPUTER INC.",
        "imported_system_report",
      ),
      makeFact(
        "model",
        "Model",
        "ASUS Zenbook Duo UX8406CA_UX8406CA",
        "imported_system_report",
      ),
    ],
  };
}
afterEach(() => vi.unstubAllGlobals());
describe("inspection keyboard profile selection", () => {
  it("matches only imported identity and keeps actual specifications separate from the catalog", () => {
    const original = inspection();
    expect(inspectionProfile(original)?.id).toBe(asus);
    const chosen = chooseInspectionProfile(original, "dell-xps-13-9315-us");
    expect(inspectionProfile(chosen)?.id).toBe("dell-xps-13-9315-us");
    expect(chosen.profileFacts.find((f) => f.key === "model")?.value).toContain(
      "UX8406CA",
    );
    expect(
      chosen.profileFacts.some((f) =>
        ["installed_memory", "processor"].includes(f.key),
      ),
    ).toBe(false);
    expect(
      chosen.profileFacts.find((f) => f.key === "keyboard_profile_id")?.source,
    ).toBe("user_provided");
    expect(() => validateInspection(chosen)).not.toThrow();
    expect(original.profileFacts).toHaveLength(2);
  });
  it("keeps a deliberate generic/external keyboard override and can return to imported matching", () => {
    const generic = chooseInspectionProfile(inspection(), "generic-ansi-us");
    expect(inspectionProfile(generic)?.id).toBe("generic-ansi-us");
    expect(inspectionProfile(chooseInspectionProfile(generic, ""))?.id).toBe(
      asus,
    );
    const browserOnly = inspection();
    browserOnly.profileFacts = browserOnly.profileFacts.map((f) => ({
      ...f,
      source: "browser_reported",
    }));
    expect(inspectionProfile(browserOnly)).toBeUndefined();
  });
  it("ignores invalid saved preferences and survives blocked localStorage", () => {
    const map = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => map.get(key),
      setItem: (key: string, value: string) => map.set(key, value),
      removeItem: (key: string) => map.delete(key),
    });
    rememberKeyboardProfile(asus);
    expect(preferredKeyboardProfile()).toBe(asus);
    rememberKeyboardProfile("");
    expect(preferredKeyboardProfile()).toBeUndefined();
    map.set("testdrive-keyboard-profile", "bad-profile");
    expect(preferredKeyboardProfile()).toBeUndefined();
    vi.stubGlobal("localStorage", {
      getItem() {
        throw new Error("Blocked");
      },
      setItem() {
        throw new Error("Blocked");
      },
      removeItem() {
        throw new Error("Blocked");
      },
    });
    expect(preferredKeyboardProfile()).toBeUndefined();
    expect(() => rememberKeyboardProfile(asus)).not.toThrow();
  });
});
