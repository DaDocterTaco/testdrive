/** Manufacturer-reference layouts, never measurements of the current device. */
export interface KeySpec {
  code: string;
  label: string;
  secondary?: string;
  width?: number;
  optional?: boolean;
  half?: boolean;
  stack?: KeySpec[];
}
export interface DeviceProfile {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  year: number;
  keyboard: { rows: KeySpec[][]; region: "en-US"; note: string };
  summary: string[];
  sources: { title: string; url: string }[];
  modelPatterns: RegExp[];
}
const key = (
  code: string,
  label: string,
  width = 1,
  optional = false,
  secondary?: string,
): KeySpec => ({ code, label, width, optional, secondary });
const list = (codes: string) =>
  codes.split(" ").map((code) => key(code, code.replace(/^Key|^Digit/, "")));
const functions = () =>
  Array.from({ length: 12 }, (_, n) => key(`F${n + 1}`, `F${n + 1}`, 1, true));
const numbers = [
  key("Backquote", "`", 1, false, "~"),
  ...list(
    "Digit1 Digit2 Digit3 Digit4 Digit5 Digit6 Digit7 Digit8 Digit9 Digit0",
  ).map((k, n) => ({ ...k, secondary: "!@#$%^&*()"[n] })),
  key("Minus", "−", 1, false, "_"),
  key("Equal", "=", 1, false, "+"),
  key("Backspace", "Backspace", 1.6),
];
const qwerty = [
  key("Tab", "Tab", 1.5),
  ...list("KeyQ KeyW KeyE KeyR KeyT KeyY KeyU KeyI KeyO KeyP"),
  key("BracketLeft", "[", 1, false, "{"),
  key("BracketRight", "]", 1, false, "}"),
  key("Backslash", "\\", 1.1, false, "|"),
];
const home = [
  key("CapsLock", "Caps lock", 1.8),
  ...list("KeyA KeyS KeyD KeyF KeyG KeyH KeyJ KeyK KeyL"),
  key("Semicolon", ";", 1, false, ":"),
  key("Quote", "'", 1, false, '"'),
  key("Enter", "Enter", 1.8),
];
const shift = [
  key("ShiftLeft", "Shift", 2.3),
  ...list("KeyZ KeyX KeyC KeyV KeyB KeyN KeyM"),
  key("Comma", ",", 1, false, "<"),
  key("Period", ".", 1, false, ">"),
  key("Slash", "/", 1, false, "?"),
  key("ShiftRight", "Shift", 2.3),
];
const arrow = (code: string, label: string, half = false): KeySpec => ({
  ...key(code, label),
  half,
});
const arrowStack: KeySpec = {
  code: "ArrowsVertical",
  label: "",
  width: 1,
  stack: [arrow("ArrowUp", "↑"), arrow("ArrowDown", "↓")],
};
const fn = () => key("Fn", "Fn", 1, true);
const win = () => key("MetaLeft", "Win", 1, true);
const note =
  "US English reference. Replacement keyboards, regional variants and remapped keys may differ. Shaded system/Fn keys are optional because the browser may never receive them.";

export const DEVICE_PROFILES: DeviceProfile[] = [
  {
    id: "asus-zenbook-duo-ux8406ca-us",
    name: "ASUS Zenbook DUO · UX8406CA",
    manufacturer: "ASUS",
    model: "UX8406CA",
    year: 2025,
    keyboard: {
      region: "en-US",
      note,
      rows: [
        [
          key("Escape", "Esc"),
          ...functions(),
          key("Screenshot", "Capture", 1, true),
          key("PrintScreen", "Prt Sc", 1, true),
          key("Delete", "Delete", 1.2, false, "Insert"),
        ],
        numbers,
        qwerty,
        home,
        shift,
        [
          key("ControlLeft", "Ctrl", 1.3),
          fn(),
          win(),
          key("AltLeft", "Alt"),
          key("Space", "Space", 5.2),
          key("AltRight", "Alt"),
          key("Copilot", "Copilot", 1, true),
          arrow("ArrowLeft", "←", true),
          arrowStack,
          arrow("ArrowRight", "→", true),
        ],
      ],
    },
    summary: [
      "Dual 14-inch touch displays",
      "Detachable Bluetooth keyboard and touchpad",
      "US keyboard has dedicated Capture, Print Screen and Copilot positions",
    ],
    modelPatterns: [/(?:^|[^a-z0-9])ux8406ca(?:$|[^a-z0-9])/i],
    sources: [
      {
        title: "ASUS UX8406CA English manual · keyboard diagram, p. 27",
        url: "https://dlcdnets.asus.com/pub/ASUS/nb/UX8406CA/0409_E26354_UX8406CA_V2_C.pdf",
      },
      {
        title: "ASUS UX8406CA support",
        url: "https://www.asus.com/us/supportonly/ux8406ca/helpdesk_manual/",
      },
    ],
  },
  {
    id: "apple-macbook-air-m2-13-us",
    name: "Apple MacBook Air 13-inch · M2 (2022)",
    manufacturer: "Apple",
    model: "Mac14,2 / A2681",
    year: 2022,
    keyboard: {
      region: "en-US",
      note,
      rows: [
        [
          key("Escape", "Esc", 1.5),
          ...functions(),
          key("Power", "Touch ID", 1, true),
        ],
        numbers.map((k) =>
          k.code === "Backspace" ? { ...k, label: "Delete" } : k,
        ),
        qwerty,
        home.map((k) => (k.code === "Enter" ? { ...k, label: "Return" } : k)),
        shift,
        [
          key("Fn", "Fn / 🌐", 1, true),
          key("ControlLeft", "Control"),
          key("AltLeft", "Option"),
          key("MetaLeft", "⌘", 1.2, true),
          key("Space", "Space", 5),
          key("MetaRight", "⌘", 1.2, true),
          key("AltRight", "Option"),
          arrow("ArrowLeft", "←", true),
          arrowStack,
          arrow("ArrowRight", "→", true),
        ],
      ],
    },
    summary: [
      "13.6-inch display; Apple M2 family",
      "US Magic Keyboard with Touch ID",
      "Four arrows in an inverted-T arrangement",
    ],
    modelPatterns: [
      /(?:^|[^a-z0-9])mac14,2(?:$|[^a-z0-9])/i,
      /(?:^|[^a-z0-9])a2681(?:$|[^a-z0-9])/i,
      /^macbook air\s*(?:\(m2,?\s*2022\)|13(?:[ -]inch)?\s+m2(?:\s+2022)?)$/i,
    ],
    sources: [
      {
        title: "Apple MacBook Air (M2, 2022) specifications",
        url: "https://support.apple.com/en-us/111867",
      },
      {
        title: "Apple MacBook Air keyboard guide",
        url: "https://support.apple.com/guide/macbook-air/magic-keyboard-apdab672d5e9/mac",
      },
      {
        title: "Apple model identification",
        url: "https://support.apple.com/en-us/102869",
      },
    ],
  },
  {
    id: "dell-xps-13-9315-us",
    name: "Dell XPS 13 · 9315",
    manufacturer: "Dell",
    model: "XPS 13 9315",
    year: 2022,
    keyboard: {
      region: "en-US",
      note,
      rows: [
        [
          key("Escape", "Esc"),
          ...functions(),
          key("Insert", "Insert"),
          key("Delete", "Delete"),
          key("Power", "Power", 0.7, true),
        ],
        numbers,
        qwerty,
        home,
        shift,
        [
          key("ControlLeft", "Ctrl", 1.5),
          fn(),
          win(),
          key("AltLeft", "Alt"),
          key("Space", "Space", 5),
          key("AltRight", "Alt"),
          key("ControlRight", "Ctrl"),
          arrow("ArrowLeft", "←"),
          {
            ...arrowStack,
            stack: [
              key("ArrowUp", "↑", 1, false, "PgUp"),
              key("ArrowDown", "↓", 1, false, "PgDn"),
            ],
          },
          arrow("ArrowRight", "→"),
        ],
      ],
    },
    summary: [
      "13.4-inch display family; configurations vary",
      "79-key US/Canada backlit keyboard, plus power button",
      "Fn layer provides Home/End and Page Up/Down",
    ],
    modelPatterns: [/^(?:dell\s+)?xps\s*(?:13\s*)?9315(?:\s+laptop)?$/i],
    sources: [
      {
        title: "Dell XPS 13 9315 keyboard specifications",
        url: "https://www.dell.com/support/manuals/en-us/xps-13-9315-laptop/xps-13-9315-setup-and-specs/keyboard?guid=guid-f4d96b7c-8a4a-4f24-8b88-1f81d17905bb&lang=en-us",
      },
      {
        title: "Dell XPS 13 9315 top-view diagram",
        url: "https://www.dell.com/support/manuals/en-us/xps-13-9315-laptop/xps-13-9315-setup-and-specs/top?guid=guid-5fe1b857-0eef-49c4-94a8-285f27e7e23c&lang=en-us",
      },
    ],
  },
  {
    id: "lenovo-thinkpad-t14-gen4-us",
    name: "Lenovo ThinkPad T14 · Gen 4",
    manufacturer: "Lenovo",
    model: "T14 Gen 4 (21HD/21HE/21K3/21K4)",
    year: 2023,
    keyboard: {
      region: "en-US",
      note: `${note} Fn/Ctrl can be swapped in firmware. TrackPoint is checked in the pointer test.`,
      rows: [
        [
          key("Escape", "Esc", 1.3),
          ...functions(),
          key("Home", "Home"),
          key("End", "End"),
          key("Insert", "Insert"),
          key("Delete", "Delete", 1.2),
        ],
        numbers,
        qwerty,
        home,
        shift,
        [
          fn(),
          key("ControlLeft", "Ctrl", 1.3),
          win(),
          key("AltLeft", "Alt"),
          key("Space", "Space", 5),
          key("AltRight", "Alt"),
          key("PrintScreen", "Prt Sc", 1, true),
          key("ControlRight", "Ctrl"),
          {
            code: "LeftColumn",
            label: "",
            stack: [key("PageUp", "PgUp"), arrow("ArrowLeft", "←")],
          },
          arrowStack,
          {
            code: "RightColumn",
            label: "",
            stack: [key("PageDown", "PgDn"), arrow("ArrowRight", "→")],
          },
        ],
      ],
    },
    summary: [
      "14-inch ThinkPad family; Intel/AMD configurations vary",
      "Dedicated navigation keys and TrackPoint",
      "Fn sits to the left of Ctrl in the standard physical layout",
    ],
    modelPatterns: [
      /^(?:lenovo\s+)?thinkpad\s+t14\s+gen(?:eration)?\s*4(?:\s+(?:intel|amd))?$/i,
      /^(?:21hd|21he|21k3|21k4)[a-z0-9]{0,12}$/i,
    ],
    sources: [
      {
        title: "Lenovo T14 Gen 4 user guide · front view, p. 1",
        url: "https://download.lenovo.com/pccbbs/mobiles_pdf/t14_gen4_p14s_gen4_t16_gen2_p16s_gen2_linux_ug.pdf",
      },
      {
        title: "Lenovo T14 Gen 4 specifications",
        url: "https://psref.lenovo.com/syspool/Sys/PDF/ThinkPad/ThinkPad_T14_Gen_4_Intel/ThinkPad_T14_Gen_4_Intel_Spec.pdf",
      },
    ],
  },
];

export const GENERIC_KEYBOARD_PROFILE: DeviceProfile = {
  id: "generic-ansi-us",
  name: "Other keyboard · US ANSI reference",
  manufacturer: "Unknown",
  model: "Generic US ANSI",
  year: 0,
  keyboard: {
    region: "en-US",
    note: "Generic US ANSI reference, not an identified device. Extra, missing or relocated keys can differ on your keyboard.",
    rows: [
      [key("Escape", "Esc"), ...functions(), key("Delete", "Delete")],
      numbers,
      qwerty,
      home,
      shift,
      [
        key("ControlLeft", "Ctrl"),
        win(),
        key("AltLeft", "Alt"),
        key("Space", "Space", 5),
        key("AltRight", "Alt"),
        key("ControlRight", "Ctrl"),
        arrow("ArrowLeft", "←"),
        arrowStack,
        arrow("ArrowRight", "→"),
      ],
    ],
  },
  summary: [],
  sources: [],
  modelPatterns: [],
};
export function getDeviceProfile(id?: string): DeviceProfile | undefined {
  return id === GENERIC_KEYBOARD_PROFILE.id
    ? GENERIC_KEYBOARD_PROFILE
    : DEVICE_PROFILES.find((p) => p.id === id);
}
export function matchDeviceProfile(
  manufacturer = "",
  model = "",
):
  | { profile: DeviceProfile; confidence: "model_match"; reason: string }
  | undefined {
  const name = model.trim().slice(0, 300);
  const maker = manufacturer.trim().toLowerCase();
  // A browser UA cannot identify these laptops. Require a specific model identifier.
  const profile = DEVICE_PROFILES.find((p) => {
    if (
      maker &&
      !maker.includes(p.manufacturer.toLowerCase()) &&
      !(p.manufacturer === "ASUS" && maker.includes("asustek"))
    )
      return false;
    if (
      p.manufacturer === "Lenovo" &&
      /^(?:21hd|21he|21k3|21k4)/i.test(name) &&
      !maker.includes("lenovo")
    )
      return false;
    return p.modelPatterns.some((pattern) => pattern.test(name));
  });
  return profile
    ? {
        profile,
        confidence: "model_match",
        reason: `The supplied model matches ${profile.model}. Confirm that its US English keyboard matches the one you are testing.`,
      }
    : undefined;
}
export function flattenKeys(profile: DeviceProfile): KeySpec[] {
  return profile.keyboard.rows.flatMap((row) =>
    row.flatMap((k) => k.stack ?? [k]),
  );
}
export function testableKeys(profile: DeviceProfile): KeySpec[] {
  return flattenKeys(profile).filter((k) => !k.optional);
}
