export const KEYBOARD_IDLE_MS = 60_000;
export const ESCAPE_WINDOW_MS = 2_000;
export function isCopilotModifier(code: string) {
  return ["MetaLeft", "MetaRight", "ShiftLeft", "ShiftRight"].includes(code);
}
export function isCopilotShortcut(
  event: Pick<
    KeyboardEvent,
    "code" | "key" | "metaKey" | "shiftKey" | "ctrlKey" | "altKey"
  >,
) {
  return (
    (event.code === "F23" || event.key === "F23") &&
    event.metaKey &&
    event.shiftKey &&
    !event.ctrlKey &&
    !event.altKey
  );
}
export interface EscapeSequence {
  count: number;
  lastAt: number;
}
export function nextEscapeSequence(
  previous: EscapeSequence,
  code: string,
  repeat: boolean,
  now: number,
): EscapeSequence {
  if (repeat) return previous;
  if (code !== "Escape") return { count: 0, lastAt: 0 };
  return {
    count: now - previous.lastAt <= ESCAPE_WINDOW_MS ? previous.count + 1 : 1,
    lastAt: now,
  };
}
export function keyIdentifier(event: Pick<KeyboardEvent, "code" | "key">) {
  if (
    event.code !== "Unidentified" &&
    /^[a-zA-Z][a-zA-Z0-9-]{0,70}$/.test(event.code)
  )
    return event.code;
  // Unknown Unicode key values remain bounded/schema-safe, without inventing a location.
  return `Unidentified-${
    Array.from(event.key)
      .slice(0, 12)
      .map((c) => c.codePointAt(0)!.toString(16))
      .join("-") || "unknown"
  }`;
}
