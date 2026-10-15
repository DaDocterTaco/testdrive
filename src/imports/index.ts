import type { Fact, ReportSnapshot } from "../types";
import { makeFact } from "../diagnostics";
import { validateReport } from "../schemas";

const MAX_WINDOWS_BYTES = 10 * 1024 * 1024;
const MAX_REPORT_BYTES = 5 * 1024 * 1024;
const WINDOWS_LABELS: Record<string, { key: string; label: string }> = {
  "system manufacturer": { key: "manufacturer", label: "System Manufacturer" },
  "system model": { key: "model", label: "System Model" },
  processor: { key: "processor", label: "Processor" },
  "installed physical memory (ram)": {
    key: "installed_memory",
    label: "Installed Physical Memory (RAM)",
  },
};
const PRIVATE_KEY =
  /(?:serial|product.?id|license|uuid|machine.?name|system.?name|user.?name|account|device.?id|mac.?address|ip.?address|user.?agent|raw.?report|file.?path|exception.?stack)/i;
const PRIVATE_VALUE =
  /(?:[a-z]:\\|\\\\[^\s]+\\|\/(?:Users|home)\/|\b(?:\d{1,3}\.){3}\d{1,3}\b|\b[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\b|\b(?:[0-9a-f]{2}:){5}[0-9a-f]{2}\b)/i;
function checkFile(file: File, extension: string, max: number): void {
  if (
    !file ||
    typeof file.name !== "string" ||
    !file.name.toLowerCase().endsWith(extension)
  )
    throw new Error(`Choose a supported ${extension} file.`);
  if (!file.size)
    throw new Error(
      "The selected file is empty. Export a fresh report and try again.",
    );
  if (file.size > max)
    throw new Error(
      `This file is too large. The limit is ${max / 1024 / 1024} MiB; choose a smaller supported report.`,
    );
}
async function decode(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    let text: string;
    if (bytes[0] === 0xff && bytes[1] === 0xfe)
      text = new TextDecoder("utf-16le", { fatal: true }).decode(
        bytes.subarray(2),
      );
    else if (bytes[0] === 0xfe && bytes[1] === 0xff)
      text = new TextDecoder("utf-16be", { fatal: true }).decode(
        bytes.subarray(2),
      );
    else text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (text.includes("\0")) throw new Error("binary");
    return text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  } catch {
    throw new Error(
      "Unsupported text encoding or binary content. Export an English Windows System Information text file (UTF-8 or UTF-16 with a BOM).",
    );
  }
}
export async function parseWindowsReport(
  file: File,
): Promise<{ facts: Fact[]; warnings: string[] }> {
  checkFile(file, ".txt", MAX_WINDOWS_BYTES);
  const text = await decode(file);
  if (/^\s*(?:<!doctype|<html|<\?xml|\{)/i.test(text))
    throw new Error(
      "This is not a supported Windows System Information text export. In msinfo32, choose File → Export.",
    );
  const facts: Fact[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  for (const lineMatch of text.matchAll(/[^\n]+/g)) {
    const line = lineMatch[0];
    if (line.length > 4096) continue;
    const match = line.match(/^\s*([^\t:]+?)\s*(?:\t+| {2,}|:\s+)\s*(.*?)\s*$/);
    if (!match) continue;
    const field = WINDOWS_LABELS[match[1].trim().toLowerCase()];
    if (!field || seen.has(field.key)) continue;
    const value = match[2].trim();
    if (
      !value ||
      value.length > 500 ||
      Array.from(value).some(
        (c) => c.charCodeAt(0) < 32 || c === "<" || c === ">",
      ) ||
      PRIVATE_VALUE.test(value)
    ) {
      warnings.push(
        `${field.label} was omitted because its value was empty, too long, or contained unsupported/private content.`,
      );
      continue;
    }
    if (
      field.key === "installed_memory" &&
      !/^\d[\d,. ]*\s*(?:GB|MB|TB|GiB|MiB|TiB)$/i.test(value)
    ) {
      warnings.push(
        "Installed memory could not be interpreted. Available memory and browser memory hints are never substituted.",
      );
      continue;
    }
    facts.push(
      makeFact(
        field.key,
        field.label,
        value,
        "imported_system_report",
        `Imported Windows System Information · original label: ${field.label}. User-supplied; not independent device verification.`,
      ),
    );
    seen.add(field.key);
    if (seen.size === Object.keys(WINDOWS_LABELS).length) break;
  }
  if (
    facts.length < 2 ||
    !facts.some((f) =>
      ["processor", "installed_memory", "model"].includes(f.key),
    )
  )
    throw new Error(
      "No supported English System Information summary was found. Choose a .txt file created with msinfo32 → File → Export; other languages and report formats are not supported yet.",
    );
  if (!seen.has("installed_memory"))
    warnings.push(
      "Installed physical memory was not found; RAM remains unknown.",
    );
  if (!seen.has("processor"))
    warnings.push(
      "Processor description was not found; the exact CPU remains unknown.",
    );
  warnings.push(
    "Only supported hardware fields were extracted. Computer names, usernames, serials, network details, and paths are not retained. Confirm this report describes the inspected device.",
  );
  return { facts, warnings };
}
type Comparison = {
  label: string;
  claim: string;
  actual: string;
  status: "consistent" | "difference" | "insufficient";
  explanation: string;
};
function kind(f: Fact): "memory" | "processor" | undefined {
  const key = f.key.toLowerCase();
  if (
    [
      "ram",
      "memory",
      "memory_gb",
      "installed_ram",
      "installed_memory",
      "installed_memory_gb",
    ].includes(key)
  )
    return "memory";
  if (["cpu", "processor", "cpu_model", "processor_model"].includes(key))
    return "processor";
  return undefined;
}
function rendered(f: Fact): string {
  return `${String(f.value)}${f.unit ? ` ${f.unit}` : ""}`;
}
export function normalizeMemory(
  value: string,
): { bytes: number; unit: string; amount: number } | undefined {
  const match = value
    .trim()
    .match(
      /^(\d+(?:(?:,\d{3})+(?:\.\d+)?|[,.]\d+)?)\s*(MB|GB|TB|MiB|GiB|TiB)$/i,
    );
  if (!match) return undefined;
  const numberText = /^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(match[1])
    ? match[1].replace(/,/g, "")
    : match[1].replace(",", ".");
  const amount = Number(numberText);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000)
    return undefined;
  const unit = match[2].toLowerCase();
  const factors: Record<string, number> = {
    mb: 1e6,
    gb: 1e9,
    tb: 1e12,
    mib: 2 ** 20,
    gib: 2 ** 30,
    tib: 2 ** 40,
  };
  return { bytes: amount * factors[unit], unit, amount };
}
export function normalizeProcessor(value: string): string | undefined {
  const cleaned = value
    .toLowerCase()
    .replace(/\(r\)|\(tm\)|®|™/g, "")
    .replace(/\s*@\s*[\d.]+\s*ghz.*$/i, "")
    .replace(/,\s*\d+\s*mhz.*$/i, "")
    .replace(/\b(?:processor|cpu)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  // A broad family ("i7", "Ryzen 5", "Intel Core") is not an exact processor claim.
  const intel = cleaned.match(/\bi([3579])\s*[- ]\s*(\d{3,5}[a-z0-9]*)\b/);
  if (intel) return `intel i${intel[1]}-${intel[2]}`;
  const ultra = cleaned.match(/\bcore\s+ultra\s+([3579])\s+(\d{3}[a-z]*)\b/);
  if (ultra) return `intel core ultra ${ultra[1]} ${ultra[2]}`;
  const ryzen = cleaned.match(/\bryzen\s+([3579])\s+(\d{4,5}[a-z0-9]*)\b/);
  if (ryzen) return `amd ryzen ${ryzen[1]} ${ryzen[2]}`;
  const apple = cleaned.match(/\bapple\s+(m\d(?:\s+(?:pro|max|ultra))?)\b/);
  if (apple) return `apple ${apple[1]}`;
  if (
    /\b(?:athlon|epyc|xeon|celeron|pentium|snapdragon)\b.*\d{3,5}[a-z0-9]*\b/.test(
      cleaned,
    )
  )
    return cleaned;
  return undefined;
}
export function compareClaims(claims: Fact[], facts: Fact[]): Comparison[] {
  return claims.map((claim) => {
    const type = kind(claim);
    const candidates = type
      ? facts.filter(
          (f) => kind(f) === type && f.source === "imported_system_report",
        )
      : [];
    const actual = candidates[0];
    const result: Comparison = {
      label: claim.label,
      claim: rendered(claim),
      actual: actual ? rendered(actual) : "Unknown",
      status: "insufficient",
      explanation: "This field does not yet have a supported exact comparison.",
    };
    if (!type) return result;
    if (!actual)
      return {
        ...result,
        explanation:
          "An imported exact specification is needed. Browser memory hints and logical processor counts are not equivalent.",
      };
    const unique = new Set(
      candidates
        .map((f) =>
          type === "memory"
            ? normalizeMemory(rendered(f))?.bytes
            : normalizeProcessor(rendered(f)),
        )
        .filter((v) => v !== undefined),
    );
    if (unique.size > 1)
      return {
        ...result,
        actual: candidates.map(rendered).join(" / "),
        explanation:
          "Imported sources disagree about this specification. Review the source values and confirm which report describes this device before comparing a listing.",
      };
    if (type === "memory") {
      const left = normalizeMemory(rendered(claim));
      const right = normalizeMemory(rendered(actual));
      if (!left || !right)
        return {
          ...result,
          explanation:
            "Both values need a specific installed-memory capacity and unit (for example, 16 GB). Available memory is not comparable.",
        };
      const consistent =
        Math.abs(left.bytes - right.bytes) / right.bytes < 0.015;
      return {
        ...result,
        status: consistent ? "consistent" : "difference",
        explanation: consistent
          ? "The installed-memory capacities are consistent after unit conversion. The report is user-supplied, not attestation."
          : `The installed-memory values differ after unit conversion (${left.bytes.toLocaleString("en-US")} vs ${right.bytes.toLocaleString("en-US")} bytes). Check GB/GiB units and ask the seller to explain the configuration.`,
      };
    }
    const left = normalizeProcessor(rendered(claim));
    const right = normalizeProcessor(rendered(actual));
    if (!left || !right)
      return {
        ...result,
        explanation:
          "An exact processor description is needed on both sides. A family such as “i7” is insufficient.",
      };
    const consistent = left === right;
    return {
      ...result,
      status: consistent ? "consistent" : "difference",
      explanation: consistent
        ? "The exact processor descriptions are consistent after normalizing trademarks, spacing, and the reported clock suffix."
        : "The specific processor descriptions differ. Ask the seller to confirm the exact model; this import is not independent device verification.",
    };
  });
}
export async function parseReport(file: File): Promise<ReportSnapshot> {
  checkFile(file, ".json", MAX_REPORT_BYTES);
  const text = await decode(file);
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(
      "This JSON file could not be read. Choose a complete TESTDRIVE report export.",
    );
  }
  const report = validateReport(value);
  const facts = [
    ...report.inspection.profileFacts,
    ...report.inspection.sellerClaims,
    ...report.inspection.attempts.flatMap((a) => a.facts),
  ];
  if (
    facts.some(
      (f) =>
        PRIVATE_KEY.test(`${f.key} ${f.label}`) ||
        (typeof f.value === "string" && PRIVATE_VALUE.test(f.value)),
    )
  )
    throw new Error(
      "This report contains private identifiers or local paths in its facts. Remove these fields before importing.",
    );
  return report;
}
function safeText(text: string): string {
  return text
    .replace(/[a-z]:\\[^\s,;]+/gi, "[local path removed]")
    .replace(/\\\\[^\s,;]+/g, "[local path removed]")
    .replace(/\/(?:Users|home)\/[^\s,;]+/g, "[local path removed]")
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[network address removed]")
    .replace(
      /\b(?:[0-9a-f]{2}:){5}[0-9a-f]{2}\b/gi,
      "[network address removed]",
    )
    .replace(
      /\b[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\b/gi,
      "[identifier removed]",
    );
}
export function prepareReportExport(report: ReportSnapshot): ReportSnapshot {
  validateReport(report);
  const cleanFacts = (facts: Fact[]) =>
    facts
      .filter((f) => !PRIVATE_KEY.test(`${f.key} ${f.label}`))
      .map((f) => ({
        ...f,
        label: safeText(f.label),
        value: typeof f.value === "string" ? safeText(f.value) : f.value,
        ...(f.qualification
          ? { qualification: safeText(f.qualification) }
          : {}),
      }));
  const result: ReportSnapshot = {
    ...report,
    limitations: report.limitations.map(safeText),
    inspection: {
      ...report.inspection,
      ...(report.inspection.nickname
        ? { nickname: safeText(report.inspection.nickname) }
        : {}),
      profileFacts: cleanFacts(report.inspection.profileFacts),
      sellerClaims: cleanFacts(report.inspection.sellerClaims),
      attempts: report.inspection.attempts.map((a) => ({
        ...a,
        facts: cleanFacts(a.facts),
        explanation: safeText(a.explanation),
        ...(a.note ? { note: safeText(a.note) } : {}),
        ...(a.nextStep ? { nextStep: safeText(a.nextStep) } : {}),
      })),
    },
  };
  return validateReport(result);
}
export function exportReport(report: ReportSnapshot): void {
  const safe = prepareReportExport(report);
  const blob = new Blob([JSON.stringify(safe, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `testdrive-report-${safe.finalizedAt.slice(0, 10)}-${safe.reportId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)}.json`;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
