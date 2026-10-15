import { useEffect } from "react";
import type { ExecutionStatus, Fact } from "../../types";

export interface Evidence {
  facts: Fact[];
  ready?: boolean;
  status?: ExecutionStatus;
  reason?: string;
  explanation?: string;
}
export interface ModuleProps {
  onChange: (evidence: Evidence) => void;
}
export const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function fact(
  key: string,
  label: string,
  value: Fact["value"],
  qualification?: string,
  source: Fact["source"] = "measured",
  unit?: string,
): Fact {
  return {
    id: uid(),
    key,
    label,
    value,
    source,
    observedAt: new Date().toISOString(),
    qualification,
    unit,
  };
}
export function useEvidence(
  onChange: ModuleProps["onChange"],
  evidence: Evidence,
  dependencies: unknown[],
) {
  // Every module reports observations only when its actual input state changes.
  useEffect(() => {
    onChange(evidence);
  }, dependencies);
}
export function mediaError(error: unknown): {
  status: ExecutionStatus;
  reason: string;
  message: string;
} {
  const name = error instanceof DOMException ? error.name : "UnknownError";
  if (name === "NotAllowedError" || name === "SecurityError")
    return {
      status: "permission_denied",
      reason: "permission_denied",
      message:
        "Access was not allowed. Check this site’s camera or microphone permission in your browser, then choose Retry. You can also skip this check.",
    };
  if (name === "NotFoundError" || name === "DevicesNotFoundError")
    return {
      status: "unsupported",
      reason: "device_not_found",
      message:
        "No available input device was found. Check that it is connected and enabled, then retry.",
    };
  if (name === "NotReadableError" || name === "TrackStartError")
    return {
      status: "error",
      reason: "device_busy",
      message:
        "This input could not open. Another app may be using it, or the device may have disconnected. Close other capture apps and retry.",
    };
  if (name === "OverconstrainedError")
    return {
      status: "error",
      reason: "source_unavailable",
      message:
        "That source is unavailable in this browser. Select another source or retry the default input.",
    };
  return {
    status: "error",
    reason: name,
    message:
      "The browser could not complete this check. Try again or skip; this does not establish a hardware fault.",
  };
}
