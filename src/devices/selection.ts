import type { Inspection } from "../types";
import { makeFact } from "../diagnostics";
import { getDeviceProfile, matchDeviceProfile } from "./catalog";
const PREFERENCE_KEY = "testdrive-keyboard-profile";

export function preferredKeyboardProfile(): string | undefined {
  try {
    const id = localStorage.getItem(PREFERENCE_KEY) ?? undefined;
    return getDeviceProfile(id)?.id;
  } catch {
    return undefined;
  }
}
export function rememberKeyboardProfile(id: string) {
  try {
    if (getDeviceProfile(id)) localStorage.setItem(PREFERENCE_KEY, id);
    else localStorage.removeItem(PREFERENCE_KEY);
  } catch {
    /* An unavailable preference store must not block an inspection. */
  }
}

export function inspectionProfile(inspection: Inspection) {
  const manual = [...inspection.profileFacts]
    .reverse()
    .find((f) => f.key === "keyboard_profile_id");
  if (manual) return getDeviceProfile(String(manual.value));
  const imported = (key: string) =>
    [...inspection.profileFacts]
      .reverse()
      .find((f) => f.key === key && f.source === "imported_system_report")
      ?.value;
  return matchDeviceProfile(
    String(imported("manufacturer") ?? ""),
    String(imported("model") ?? ""),
  )?.profile;
}

export function chooseInspectionProfile(
  inspection: Inspection,
  id: string,
): Inspection {
  const profile = getDeviceProfile(id);
  const facts = inspection.profileFacts.filter(
    (f) => !["keyboard_profile_id", "keyboard_profile_name"].includes(f.key),
  );
  if (profile)
    facts.push(
      makeFact(
        "keyboard_profile_id",
        "Selected keyboard profile ID",
        profile.id,
        "user_provided",
        "Selected reference layout, not automatic proof of the computer model or installed components.",
      ),
      makeFact(
        "keyboard_profile_name",
        "Selected keyboard profile",
        profile.name,
        "user_provided",
        "US English physical key positions. Regional variants and replacement/external keyboards may differ.",
      ),
    );
  return { ...inspection, profileFacts: facts };
}
