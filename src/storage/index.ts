import type { Inspection, ReportSnapshot } from "../types";
import { validateInspection, validateReport } from "../schemas";

const memoryInspections = new Map<string, Inspection>();
const memoryReports = new Map<string, ReportSnapshot>();
let unavailable = typeof indexedDB === "undefined";
let database: Promise<IDBDatabase> | undefined;
export function getStorageStatus(): {
  mode: "persistent" | "memory";
  message: string;
} {
  return unavailable
    ? {
        mode: "memory",
        message:
          "Temporary storage: progress stays in memory for this visit. Export a report before refreshing or closing this page.",
      }
    : {
        mode: "persistent",
        message:
          "Saved in this browser on this device. Browser cleanup or clearing site data removes these records.",
      };
}
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
function db(): Promise<IDBDatabase> {
  if (!database)
    database = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("Local database unavailable."));
        return;
      }
      const request = indexedDB.open("testdrive-records", 1);
      const timeout = setTimeout(
        () => reject(new Error("Local database did not open.")),
        2000,
      );
      request.onupgradeneeded = () => {
        for (const s of ["inspections", "reports"])
          if (!request.result.objectStoreNames.contains(s))
            request.result.createObjectStore(s);
      };
      request.onsuccess = () => {
        clearTimeout(timeout);
        const result = request.result;
        result.onversionchange = () => result.close();
        resolve(result);
      };
      request.onerror = () => {
        clearTimeout(timeout);
        reject(request.error);
      };
      request.onblocked = () => {
        clearTimeout(timeout);
        reject(new Error("Local database is blocked."));
      };
    });
  return database;
}
async function operation<T>(
  store: string,
  mode: IDBTransactionMode,
  perform: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T | undefined> {
  if (unavailable) return undefined;
  try {
    const database = await db();
    return await new Promise<T>((resolve, reject) => {
      const tx = database.transaction(store, mode);
      const req = perform(tx.objectStore(store));
      let result: T;
      const timeout = setTimeout(() => {
        try {
          tx.abort();
        } catch {
          /* already inactive */
        }
        reject(new Error("Local save timed out."));
      }, 2500);
      req.onsuccess = () => {
        result = req.result;
      };
      req.onerror = () => {
        clearTimeout(timeout);
        reject(req.error);
      };
      tx.oncomplete = () => {
        clearTimeout(timeout);
        resolve(result);
      };
      tx.onabort = tx.onerror = () => {
        clearTimeout(timeout);
        reject(tx.error ?? new Error("Local save failed."));
      };
    });
  } catch {
    unavailable = true;
    return undefined;
  }
}
export async function saveInspection(inspection: Inspection): Promise<void> {
  validateInspection(inspection);
  const record = clone(inspection);
  memoryInspections.set(record.id, record);
  await operation("inspections", "readwrite", (s) => s.put(record, record.id));
}
export async function listInspections(): Promise<Inspection[]> {
  const records = await operation<unknown[]>("inspections", "readonly", (s) =>
    s.getAll(),
  );
  if (records)
    for (const value of records) {
      try {
        const i = validateInspection(value);
        memoryInspections.set(i.id, i);
      } catch {
        /* Do not load malformed legacy records. */
      }
    }
  return clone(
    [...memoryInspections.values()].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    ),
  );
}
export async function loadInspection(
  id: string,
): Promise<Inspection | undefined> {
  const record = await operation<unknown>("inspections", "readonly", (s) =>
    s.get(id),
  );
  if (record) {
    try {
      memoryInspections.set(id, validateInspection(record));
    } catch {
      return undefined;
    }
  }
  const result = memoryInspections.get(id);
  return result ? clone(result) : undefined;
}
export async function deleteInspection(id: string): Promise<void> {
  memoryInspections.delete(id);
  await operation("inspections", "readwrite", (s) => s.delete(id));
  for (const report of await listReports())
    if (report.inspection.id === id) await deleteReport(report.reportId);
}
export async function saveReport(report: ReportSnapshot): Promise<void> {
  validateReport(report);
  const record = clone(report);
  const stored = await operation<unknown>("reports", "readonly", (s) =>
    s.get(record.reportId),
  );
  const existing = stored
    ? validateReport(stored)
    : memoryReports.get(record.reportId);
  if (existing) {
    if (JSON.stringify(existing) !== JSON.stringify(record))
      throw new Error(
        "A different report with this ID is already saved. Existing report snapshots cannot be overwritten.",
      );
    return;
  }
  memoryReports.set(record.reportId, record);
  await operation("reports", "readwrite", (s) =>
    s.put(record, record.reportId),
  );
}
export async function listReports(): Promise<ReportSnapshot[]> {
  const records = await operation<unknown[]>("reports", "readonly", (s) =>
    s.getAll(),
  );
  if (records)
    for (const value of records) {
      try {
        const r = validateReport(value);
        memoryReports.set(r.reportId, r);
      } catch {
        /* Ignore invalid records. */
      }
    }
  return clone(
    [...memoryReports.values()].sort((a, b) =>
      b.finalizedAt.localeCompare(a.finalizedAt),
    ),
  );
}
export async function deleteReport(id: string): Promise<void> {
  memoryReports.delete(id);
  await operation("reports", "readwrite", (s) => s.delete(id));
}
