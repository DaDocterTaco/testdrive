export type DeviceClass = "computer" | "phone" | "tablet" | "unknown";
export type SourceKind =
  | "browser_reported"
  | "measured"
  | "imported_system_report"
  | "user_provided"
  | "user_confirmed";
export type ExecutionStatus =
  | "queued"
  | "running"
  | "completed"
  | "skipped"
  | "unsupported"
  | "permission_denied"
  | "interrupted"
  | "error"
  | "cancelled";
export type TestId =
  | "SYS-01"
  | "PERF-01"
  | "GFX-01"
  | "KEY-01"
  | "PTR-01"
  | "TOUCH-01"
  | "CAM-01"
  | "MIC-01"
  | "SPK-01"
  | "PWR-01"
  | "DISP-01";
export interface Fact {
  id: string;
  key: string;
  label: string;
  value: string | number | boolean;
  unit?: string;
  source: SourceKind;
  observedAt: string;
  qualification?: string;
}
export interface TestAttempt {
  id: string;
  testId: TestId;
  testVersion: string;
  status: ExecutionStatus;
  startedAt?: string;
  endedAt?: string;
  facts: Fact[];
  finding: "observed" | "attention" | "not_assessed";
  humanAnswer?: "looks_good" | "issue" | "not_sure";
  reasonCode?: string;
  explanation: string;
  nextStep?: string;
  note?: string;
}
export interface Inspection {
  schemaVersion: 1;
  id: string;
  appVersion: string;
  commitId?: string;
  deviceClass: DeviceClass;
  purpose: "buying_used" | "checking_device" | "after_repair";
  nickname?: string;
  createdAt: string;
  updatedAt: string;
  profileFacts: Fact[];
  sellerClaims: Fact[];
  attempts: TestAttempt[];
  selectedTestIds: TestId[];
  state: string;
}
export interface ReportSnapshot {
  schemaVersion: 1;
  reportId: string;
  revision: number;
  finalizedAt: string;
  inspection: Inspection;
  limitations: string[];
}
export interface Capabilities {
  touch: boolean;
  camera: boolean;
  microphone: boolean;
  webgl: boolean;
  worker: boolean;
  secureContext: boolean;
}
export interface TestDefinition {
  id: TestId;
  title: string;
  description: string;
  mode: "automatic" | "guided";
  group: "performance" | "input" | "media" | "display";
  duration: string;
}
export const APP_VERSION = "1.1.0-beta.3";
