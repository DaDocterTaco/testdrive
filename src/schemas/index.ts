import type {
  Fact,
  Inspection,
  ReportSnapshot,
  TestAttempt,
  TestId,
} from "../types";

const TEST_IDS: TestId[] = [
  "SYS-01",
  "PERF-01",
  "GFX-01",
  "KEY-01",
  "PTR-01",
  "TOUCH-01",
  "CAM-01",
  "MIC-01",
  "SPK-01",
  "PWR-01",
  "DISP-01",
];
const SOURCES = [
  "browser_reported",
  "measured",
  "imported_system_report",
  "user_provided",
  "user_confirmed",
];
const STATUSES = [
  "queued",
  "running",
  "completed",
  "skipped",
  "unsupported",
  "permission_denied",
  "interrupted",
  "error",
  "cancelled",
];
type Obj = Record<string, unknown>;
function fail(message: string): never {
  throw new Error(`Invalid report: ${message}`);
}
function obj(value: unknown, name: string, keys: string[]): Obj {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(`${name} must be an object.`);
  const record = value as Obj;
  const extra = Object.keys(record).find((k) => !keys.includes(k));
  if (extra)
    fail(`${name} contains unsupported field “${extra.slice(0, 60)}”.`);
  return record;
}
function str(value: unknown, name: string, max = 500, optional = false): void {
  if (optional && (value === undefined || value === "")) return;
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > max ||
    Array.from(value).some((c) => {
      const n = c.charCodeAt(0);
      return n <= 8 || n === 11 || n === 12 || (n >= 14 && n <= 31);
    })
  )
    fail(`${name} must be text of 1–${max} characters.`);
}
function enumeration(value: unknown, values: string[], name: string): void {
  if (typeof value !== "string" || !values.includes(value))
    fail(`${name} is unsupported.`);
}
function iso(value: unknown, name: string, optional = false): void {
  if (optional && value === undefined) return;
  str(value, name, 40);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(
      value as string,
    ) ||
    !Number.isFinite(Date.parse(value as string))
  )
    fail(`${name} must be a UTC ISO timestamp.`);
  if (
    new Date(value as string).toISOString().slice(0, 19) !==
    (value as string).slice(0, 19)
  )
    fail(`${name} is not a valid calendar date.`);
}
function id(value: unknown, name: string): void {
  str(value, name, 100);
  if (!/^[a-zA-Z0-9_-]+$/.test(value as string))
    fail(`${name} contains invalid characters.`);
}
function arr(value: unknown, name: string, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max)
    fail(`${name} must contain at most ${max} items.`);
  return value;
}
export function validateFact(value: unknown): Fact {
  const f = obj(value, "fact", [
    "id",
    "key",
    "label",
    "value",
    "unit",
    "source",
    "observedAt",
    "qualification",
  ]);
  id(f.id, "fact ID");
  str(f.key, "fact key", 100);
  str(f.label, "fact label");
  if (!/^[a-zA-Z][a-zA-Z0-9_.-]*$/.test(f.key as string))
    fail("fact key contains invalid characters.");
  if (typeof f.value === "string") str(f.value, "fact value");
  else if (
    typeof f.value !== "boolean" &&
    (typeof f.value !== "number" || !Number.isFinite(f.value))
  )
    fail("fact value must be text, a finite number, or boolean.");
  str(f.unit, "fact unit", 40, true);
  str(f.qualification, "fact qualification", 500, true);
  enumeration(f.source, SOURCES, "fact source");
  iso(f.observedAt, "fact observation time");
  return value as Fact;
}
export function validateAttempt(value: unknown): TestAttempt {
  const a = obj(value, "attempt", [
    "id",
    "testId",
    "testVersion",
    "status",
    "startedAt",
    "endedAt",
    "facts",
    "finding",
    "humanAnswer",
    "reasonCode",
    "explanation",
    "nextStep",
    "note",
  ]);
  id(a.id, "attempt ID");
  enumeration(a.testId, TEST_IDS, "test ID");
  str(a.testVersion, "test version", 40);
  enumeration(a.status, STATUSES, "execution status");
  iso(a.startedAt, "start time", true);
  iso(a.endedAt, "end time", true);
  arr(a.facts, "attempt facts", 1000).forEach(validateFact);
  enumeration(a.finding, ["observed", "attention", "not_assessed"], "finding");
  if (a.humanAnswer !== undefined)
    enumeration(
      a.humanAnswer,
      ["looks_good", "issue", "not_sure"],
      "human answer",
    );
  str(a.reasonCode, "reason code", 100, true);
  str(a.explanation, "explanation", 500);
  str(a.nextStep, "next step", 500, true);
  str(a.note, "note", 2000, true);
  if (
    a.startedAt &&
    a.endedAt &&
    Date.parse(a.endedAt as string) < Date.parse(a.startedAt as string)
  )
    fail("attempt ends before it starts.");
  return value as TestAttempt;
}
export function validateInspection(value: unknown): Inspection {
  const i = obj(value, "inspection", [
    "schemaVersion",
    "id",
    "appVersion",
    "commitId",
    "deviceClass",
    "purpose",
    "nickname",
    "createdAt",
    "updatedAt",
    "profileFacts",
    "sellerClaims",
    "attempts",
    "selectedTestIds",
    "state",
  ]);
  if (i.schemaVersion !== 1)
    fail(
      "this inspection schema version is unsupported; use a version 1 report.",
    );
  id(i.id, "inspection ID");
  str(i.appVersion, "app version", 80);
  str(i.commitId, "commit ID", 100, true);
  enumeration(
    i.deviceClass,
    ["computer", "phone", "tablet", "unknown"],
    "device class",
  );
  enumeration(
    i.purpose,
    ["buying_used", "checking_device", "after_repair"],
    "purpose",
  );
  str(i.nickname, "nickname", 500, true);
  iso(i.createdAt, "creation time");
  iso(i.updatedAt, "update time");
  const facts = arr(i.profileFacts, "profile facts", 1000);
  facts.forEach(validateFact);
  const claims = arr(i.sellerClaims, "seller claims", 1000);
  claims.forEach(validateFact);
  const attempts = arr(i.attempts, "attempts", 100);
  attempts.forEach(validateAttempt);
  const count =
    facts.length +
    claims.length +
    attempts.reduce<number>((n, a) => n + (a as TestAttempt).facts.length, 0);
  if (count > 1000)
    fail("a report may contain at most 1,000 normalized facts in total.");
  const selected = arr(i.selectedTestIds, "selected tests", TEST_IDS.length);
  selected.forEach((t) => enumeration(t, TEST_IDS, "selected test"));
  if (new Set(selected).size !== selected.length)
    fail("selected tests contain duplicates.");
  if (
    new Set(attempts.map((a) => (a as TestAttempt).id)).size !== attempts.length
  )
    fail("attempt IDs contain duplicates.");
  str(i.state, "inspection state", 40);
  enumeration(
    i.state,
    [
      "new",
      "setup",
      "ready",
      "scanning",
      "guided",
      "review",
      "complete",
      "paused",
    ],
    "inspection state",
  );
  return value as Inspection;
}
export function validateReport(value: unknown): ReportSnapshot {
  const r = obj(value, "report", [
    "schemaVersion",
    "reportId",
    "revision",
    "finalizedAt",
    "inspection",
    "limitations",
  ]);
  if (r.schemaVersion !== 1)
    fail("this report schema version is unsupported; use a version 1 report.");
  id(r.reportId, "report ID");
  if (
    typeof r.revision !== "number" ||
    !Number.isSafeInteger(r.revision) ||
    r.revision < 1
  )
    fail("revision must be a positive integer.");
  iso(r.finalizedAt, "finalization time");
  validateInspection(r.inspection);
  arr(r.limitations, "limitations", 100).forEach((s) =>
    str(s, "limitation", 500),
  );
  return value as ReportSnapshot;
}
