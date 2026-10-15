import { describe, expect, it } from "vitest";
import {
  DEVICE_PROFILES,
  GENERIC_KEYBOARD_PROFILE,
  flattenKeys,
  getDeviceProfile,
  matchDeviceProfile,
  testableKeys,
} from "../../src/devices/catalog";
import {
  keyIdentifier,
  nextEscapeSequence,
} from "../../src/features/tests/keyboardCapture";

describe("device catalog", () => {
  it("matches exact imported Zenbook identifier while rejecting its different-generation sibling", () => {
    expect(
      matchDeviceProfile(
        "ASUSTeK COMPUTER INC.",
        "ASUS Zenbook Duo UX8406CA_UX8406CA",
      )?.profile.id,
    ).toBe("asus-zenbook-duo-ux8406ca-us");
    expect(matchDeviceProfile("ASUS", "UX8406MA")).toBeUndefined();
    expect(matchDeviceProfile("", "Zenbook Duo")).toBeUndefined();
    expect(matchDeviceProfile("Dell", "UX8406CA")).toBeUndefined();
  });
  it("avoids guessing ambiguous families and identifies the supported precise laptops", () => {
    expect(
      matchDeviceProfile("Dell Inc.", "XPS 13 9315")?.profile.manufacturer,
    ).toBe("Dell");
    expect(matchDeviceProfile("Dell", "XPS 13 9315 2-in-1")).toBeUndefined();
    expect(matchDeviceProfile("Apple", "Mac14,2")?.profile.manufacturer).toBe(
      "Apple",
    );
    expect(matchDeviceProfile("Apple", "MacBook Air")).toBeUndefined();
    expect(
      matchDeviceProfile("LENOVO", "21HD00ABUS")?.profile.manufacturer,
    ).toBe("Lenovo");
    expect(matchDeviceProfile("", "21HD00ABUS")).toBeUndefined();
    expect(getDeviceProfile("generic-ansi-us")).toBe(GENERIC_KEYBOARD_PROFILE);
    expect(getDeviceProfile("unknown-device")).toBeUndefined();
  });
  it("keeps each physical key unique and does not require unobservable hardware keys", () => {
    for (const profile of [...DEVICE_PROFILES, GENERIC_KEYBOARD_PROFILE]) {
      const keys = flattenKeys(profile);
      expect(new Set(keys.map((k) => k.code)).size).toBe(keys.length);
      expect(testableKeys(profile).map((k) => k.code)).not.toContain("Fn");
      expect(testableKeys(profile).map((k) => k.code)).not.toContain("Power");
      expect(testableKeys(profile).map((k) => k.code)).not.toContain(
        "MetaLeft",
      );
      expect(testableKeys(profile)).toHaveLength(
        keys.filter((k) => !k.optional).length,
      );
    }
    const asus = flattenKeys(DEVICE_PROFILES[0]).map((k) => k.code);
    expect(asus).toContain("Copilot");
    expect(asus).toContain("Screenshot");
    expect(asus).not.toContain("ControlRight");
    expect(flattenKeys(DEVICE_PROFILES[1])).toHaveLength(78);
    expect(
      flattenKeys(DEVICE_PROFILES[2]).filter((k) => k.code !== "Power"),
    ).toHaveLength(79);
  });
});

describe("keyboard exit and event identity", () => {
  it("requires three separate Escape presses, resets on other keys or a gap", () => {
    let sequence = { count: 0, lastAt: 0 };
    sequence = nextEscapeSequence(sequence, "Escape", false, 1000);
    expect(sequence.count).toBe(1);
    sequence = nextEscapeSequence(sequence, "Escape", true, 1100);
    expect(sequence.count).toBe(1);
    sequence = nextEscapeSequence(sequence, "Escape", false, 1200);
    sequence = nextEscapeSequence(sequence, "Escape", false, 1300);
    expect(sequence.count).toBe(3);
    expect(nextEscapeSequence(sequence, "KeyA", false, 1400).count).toBe(0);
    expect(nextEscapeSequence(sequence, "Escape", false, 4000).count).toBe(1);
  });
  it("keeps unknown key values bounded and schema-safe without claiming a physical position", () => {
    expect(keyIdentifier({ code: "KeyA", key: "a" })).toBe("KeyA");
    expect(keyIdentifier({ code: "", key: "é" })).toBe("Unidentified-e9");
    expect(keyIdentifier({ code: "Unidentified", key: "é" })).toBe(
      "Unidentified-e9",
    );
    expect(keyIdentifier({ code: "bad:code", key: ":" })).toBe(
      "Unidentified-3a",
    );
    expect(keyIdentifier({ code: "", key: "" })).toBe("Unidentified-unknown");
  });
});
