import { describe, expect, it } from "vitest";
import {
  compareClaims,
  normalizeMemory,
  normalizeProcessor,
  parseReport,
  parseWindowsReport,
  prepareReportExport,
} from "../../src/imports";
import { BLOCK_CHECKSUM, computeBlock } from "../../src/diagnostics/workload";
import { makeFact, runAutomatic, TESTS } from "../../src/diagnostics";
import {
  deleteInspection,
  getStorageStatus,
  listInspections,
  listReports,
  loadInspection,
  saveInspection,
  saveReport,
} from "../../src/storage";
import { validateReport } from "../../src/schemas";
import type { Fact, Inspection, ReportSnapshot } from "../../src/types";

function file(name: string, content: string | Uint8Array): File {
  const bytes =
    typeof content === "string" ? new TextEncoder().encode(content) : content;
  return {
    name,
    size: bytes.byteLength,
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  } as File;
}
const summary =
  "OS Name\tMicrosoft Windows 11 Home\r\nSystem Name\tPRIVATE-COMPUTER\r\nSystem Manufacturer\tExample Devices\r\nSystem Model\tNotebook 14\r\nProcessor\t11th Gen Intel(R) Core(TM) i7-1165G7 @ 2.80GHz, 2803 Mhz, 4 Core(s)\r\nInstalled Physical Memory (RAM)\t16.0 GB\r\nAvailable Physical Memory\t5.0 GB\r\nUser Name\tPRIVATE-USER\r\nWindows Directory\tC:\\Windows\r\n";
function inspection(): Inspection {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    appVersion: "1.0.0-beta.1",
    deviceClass: "computer",
    purpose: "buying_used",
    createdAt: "2026-10-15T01:00:00.000Z",
    updatedAt: "2026-10-15T01:01:00.000Z",
    profileFacts: [],
    sellerClaims: [],
    attempts: [],
    selectedTestIds: ["SYS-01"],
    state: "complete",
  };
}
function report(): ReportSnapshot {
  return {
    schemaVersion: 1,
    reportId: crypto.randomUUID(),
    revision: 1,
    finalizedAt: "2026-10-15T01:02:00.000Z",
    inspection: inspection(),
    limitations: ["Browser inspection cannot rule out every defect."],
  };
}
function fact(
  key: string,
  value: string,
  source: Fact["source"] = "imported_system_report",
): Fact {
  return makeFact(key, key, value, source);
}

describe("allowlisted Windows system-report parsing", () => {
  it("extracts exact fields and excludes identity, available memory, paths, and raw report content", async () => {
    const result = await parseWindowsReport(file("system.txt", summary));
    expect(result.facts.map((f) => f.key)).toEqual([
      "manufacturer",
      "model",
      "processor",
      "installed_memory",
    ]);
    expect(
      result.facts.every((f) => f.source === "imported_system_report"),
    ).toBe(true);
    expect(JSON.stringify(result)).not.toContain("PRIVATE");
    expect(JSON.stringify(result)).not.toContain("C:\\Windows");
    expect(result.facts.find((f) => f.key === "installed_memory")?.value).toBe(
      "16.0 GB",
    );
  });
  it("handles UTF-16LE and UTF-8 BOMs and ordinary spaced exports", async () => {
    const utf16 = new Uint8Array(2 + summary.length * 2);
    utf16.set([255, 254]);
    [...summary].forEach((c, i) => {
      utf16[2 + i * 2] = c.charCodeAt(0) & 255;
      utf16[3 + i * 2] = c.charCodeAt(0) >> 8;
    });
    expect(
      (await parseWindowsReport(file("system.txt", utf16))).facts,
    ).toHaveLength(4);
    expect(
      (await parseWindowsReport(file("system.txt", "\uFEFF" + summary))).facts,
    ).toHaveLength(4);
    expect(
      (
        await parseWindowsReport(
          file("system.txt", summary.replace(/\t/g, "  ")),
        )
      ).facts,
    ).toHaveLength(4);
  });
  it("handles UTF-16BE BOM exports", async () => {
    const utf16 = new Uint8Array(2 + summary.length * 2);
    utf16.set([254, 255]);
    [...summary].forEach((c, i) => {
      utf16[2 + i * 2] = c.charCodeAt(0) >> 8;
      utf16[3 + i * 2] = c.charCodeAt(0) & 255;
    });
    expect(
      (await parseWindowsReport(file("system.txt", utf16))).facts,
    ).toHaveLength(4);
  });
  it("rejects unsupported content, file types, empty files and oversize sources", async () => {
    await expect(
      parseWindowsReport(file("report.txt", "<html>not a report</html>")),
    ).rejects.toThrow("not a supported");
    await expect(
      parseWindowsReport(file("report.txt", "Processeur\tAMD Ryzen 7 5800H")),
    ).rejects.toThrow("English");
    await expect(
      parseWindowsReport(file("report.nfo", summary)),
    ).rejects.toThrow(".txt");
    await expect(parseWindowsReport(file("report.txt", ""))).rejects.toThrow(
      "empty",
    );
    await expect(
      parseWindowsReport({
        name: "report.txt",
        size: 10 * 1024 * 1024 + 1,
      } as File),
    ).rejects.toThrow("too large");
  });
});
describe("source-aware claim comparisons", () => {
  it("distinguishes specific CPU models and ignores equivalent prose/trademark differences", () => {
    expect(normalizeProcessor("i7")).toBeUndefined();
    expect(
      normalizeProcessor(
        "11th Gen Intel(R) Core(TM) i7-1165G7 @ 2.80GHz, 2803 Mhz",
      ),
    ).toBe(normalizeProcessor("Intel Core i7-1165G7"));
    expect(
      compareClaims(
        [fact("processor", "Intel Core i7-1165G7", "user_provided")],
        [fact("processor", "11th Gen Intel(R) Core(TM) i7-1165G7 @ 2.80GHz")],
      )[0].status,
    ).toBe("consistent");
    expect(
      compareClaims(
        [fact("cpu", "i7", "user_provided")],
        [fact("processor", "Intel Core i7-1165G7")],
      )[0].status,
    ).toBe("insufficient");
    expect(
      compareClaims(
        [fact("cpu", "Intel Core i7-12700H", "user_provided")],
        [fact("processor", "Intel Core i7-1165G7")],
      )[0].status,
    ).toBe("difference");
  });
  it("compares installed memory only and preserves decimal/binary unit differences", () => {
    expect(normalizeMemory("1 GiB")?.bytes).toBe(1073741824);
    expect(normalizeMemory("1 GB")?.bytes).toBe(1000000000);
    expect(normalizeMemory("16,384 MB")?.bytes).toBe(16384000000);
    const claims = [fact("ram", "16 GB", "user_provided")];
    expect(
      compareClaims(claims, [fact("installed_memory", "16.0 GB")])[0].status,
    ).toBe("consistent");
    expect(
      compareClaims(claims, [fact("installed_memory", "8 GB")])[0].status,
    ).toBe("difference");
    expect(
      compareClaims(claims, [
        fact("memory_hint", "16 GB", "browser_reported"),
      ])[0].status,
    ).toBe("insufficient");
    expect(
      compareClaims(claims, [
        fact("installed_memory", "8 GB"),
        fact("installed_memory", "16 GB"),
      ])[0].status,
    ).toBe("insufficient");
    expect(
      compareClaims(
        [fact("storage", "512 GB", "user_provided")],
        [fact("model", "Notebook")],
      )[0].actual,
    ).toBe("Unknown");
  });
});
describe("portable report boundary", () => {
  it("round trips a versioned report including user notes", async () => {
    const r = report();
    r.inspection.attempts = [
      {
        id: crypto.randomUUID(),
        testId: "KEY-01",
        testVersion: "1.0.0",
        status: "completed",
        finding: "observed",
        facts: [],
        explanation: "Keys were received.",
        note: "Spacebar felt sticky.",
      },
    ];
    expect(
      await parseReport(file("report.json", "\uFEFF" + JSON.stringify(r))),
    ).toEqual(r);
  });
  it("rejects newer versions, unknown nested fields, invalid IDs/status/dates, huge notes, and aggregate fact excess", () => {
    const newer = { ...report(), schemaVersion: 2 };
    expect(() => validateReport(newer)).toThrow("version");
    const extra = report();
    (extra.inspection as unknown as Record<string, unknown>).rawCapture = "no";
    expect(() => validateReport(extra)).toThrow("unsupported field");
    const invalid = report();
    invalid.reportId = "../bad";
    expect(() => validateReport(invalid)).toThrow("characters");
    const date = report();
    date.finalizedAt = "2026-02-31T01:00:00Z";
    expect(() => validateReport(date)).toThrow("calendar");
    const excessive = report();
    excessive.inspection.profileFacts = Array.from({ length: 1000 }, () =>
      fact("model", "Example"),
    );
    excessive.inspection.sellerClaims = [fact("processor", "i7")];
    expect(() => validateReport(excessive)).toThrow("1,000");
    const attempt = report();
    attempt.inspection.attempts = [
      {
        id: crypto.randomUUID(),
        testId: "KEY-01",
        testVersion: "1",
        status: "completed",
        facts: [],
        finding: "observed",
        explanation: "Observed",
        note: "x".repeat(2001),
      },
    ];
    expect(() => validateReport(attempt)).toThrow("2000");
  });
  it("rejects malformed/oversize JSON and unsupported private identifiers", async () => {
    await expect(parseReport(file("report.json", "{bad"))).rejects.toThrow(
      "could not be read",
    );
    await expect(
      parseReport({ name: "report.json", size: 5 * 1024 * 1024 + 1 } as File),
    ).rejects.toThrow("too large");
    const r = report();
    r.inspection.profileFacts = [fact("serial_number", "ABC123")];
    await expect(
      parseReport(file("report.json", JSON.stringify(r))),
    ).rejects.toThrow("private identifiers");
  });
  it("removes sensitive facts and redacts local paths from exported notes without mutating originals", () => {
    const r = report();
    r.inspection.profileFacts = [
      fact("model", "Example"),
      fact("serial_number", "SECRET"),
    ];
    r.inspection.nickname = "C:\\Users\\Example\\Private";
    const safe = prepareReportExport(r);
    expect(safe.inspection.profileFacts).toHaveLength(1);
    expect(safe.inspection.nickname).toBe("[local path removed]");
    expect(r.inspection.profileFacts).toHaveLength(2);
  });
});
describe("bounded engine and storage behavior", () => {
  it("preserves immutable report snapshots when an imported ID collides", async () => {
    const r = report();
    await saveReport(r);
    await expect(saveReport(structuredClone(r))).resolves.toBeUndefined();
    const edited = structuredClone(r);
    edited.inspection.nickname = "Changed copy";
    await expect(saveReport(edited)).rejects.toThrow("cannot be overwritten");
    expect(
      (await listReports()).find((x) => x.reportId === r.reportId)?.inspection
        .nickname,
    ).toEqual(r.inspection.nickname);
  });
  it("verifies the independent known workload checksum and keeps a stable registry", () => {
    expect(computeBlock()).toBe(BLOCK_CHECKSUM);
    expect(TESTS.map((t) => t.id)).toEqual([
      "SYS-01",
      "PERF-01",
      "GFX-01",
      "KEY-01",
      "PTR-01",
      "TOUCH-01",
      "CAM-01",
      "MIC-01",
      "SPK-01",
      "DISP-01",
    ]);
  });
  it("does not run a workload when cancellation was already requested", async () => {
    const c = new AbortController();
    c.abort();
    const a = await runAutomatic("PERF-01", c.signal);
    expect(a.status).toBe("cancelled");
    expect(a.finding).toBe("not_assessed");
    expect(a.facts).toEqual([]);
  });
  it("recovers progress in memory when IndexedDB is unavailable and deletes related reports", async () => {
    const i = inspection();
    const r = report();
    r.inspection = i;
    await saveInspection(i);
    await saveReport(r);
    i.nickname = "mutated";
    expect((await loadInspection(i.id))?.nickname).toBeUndefined();
    expect((await listInspections()).some((a) => a.id === i.id)).toBe(true);
    expect(getStorageStatus().mode).toBe("memory");
    await deleteInspection(i.id);
    expect(await loadInspection(i.id)).toBeUndefined();
    expect((await listReports()).some((a) => a.reportId === r.reportId)).toBe(
      false,
    );
  });
});
