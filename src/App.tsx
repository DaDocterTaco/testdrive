import {
  Component,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  AudioLines,
  BatteryCharging,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Cpu,
  FileCheck2,
  FileJson,
  FileText,
  Fingerprint,
  HardDrive,
  Info,
  Keyboard,
  Laptop,
  Layers,
  LockKeyhole,
  Monitor,
  MoreHorizontal,
  MousePointer2,
  Plus,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Square,
  Touchpad,
  Trash2,
  Upload,
  Volume2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { APP_VERSION } from "./types";
import type {
  DeviceClass,
  Fact,
  Inspection,
  ReportSnapshot,
  TestAttempt,
  TestId,
} from "./types";
import { detectDevice, makeFact, runAutomatic, TESTS } from "./diagnostics";
import {
  deleteInspection,
  deleteReport,
  getStorageStatus,
  listInspections,
  listReports,
  loadInspection,
  saveInspection,
  saveReport,
} from "./storage";
import {
  compareClaims,
  exportReport,
  parseReport,
  parseWindowsReport,
} from "./imports";
import TestWorkbench from "./features/tests/TestWorkbench";
import { validateInspection } from "./schemas";
import { DeviceProfilePanel } from "./devices/DeviceProfilePanel";
import { matchDeviceProfile } from "./devices/catalog";
import {
  inspectionProfile,
  chooseInspectionProfile,
  preferredKeyboardProfile,
  rememberKeyboardProfile,
} from "./devices/selection";
import "./experience.css";

const icons: Record<TestId, LucideIcon> = {
  "SYS-01": Laptop,
  "PERF-01": Cpu,
  "GFX-01": Layers,
  "KEY-01": Keyboard,
  "PTR-01": MousePointer2,
  "TOUCH-01": Fingerprint,
  "CAM-01": Camera,
  "MIC-01": AudioLines,
  "SPK-01": Volume2,
  "PWR-01": BatteryCharging,
  "DISP-01": Monitor,
};
const sources: Record<Fact["source"], string> = {
  browser_reported: "Browser-reported",
  measured: "Measured",
  imported_system_report: "Imported",
  user_provided: "User-provided",
  user_confirmed: "You confirmed",
};
const purposes = {
  buying_used: "Buying used",
  checking_device: "Checking my device",
  after_repair: "After a repair",
};
const LIMITATIONS = [
  "A browser inspection cannot guarantee a healthy device or reveal every defect.",
  "Exact hardware specifications are unknown unless imported or provided by you. Imported reports are not independent verification.",
  "Battery wear, internal storage health, ownership, locks, and functions outside this browser were not checked.",
  "Performance describes this browser session. Camera and microphone recordings are not included in this report.",
];
function latest(i: Inspection, id: TestId) {
  return [...i.attempts].reverse().find((a) => a.testId === id);
}
function counts(i: Inspection) {
  const a = i.selectedTestIds.map((id) => latest(i, id));
  return {
    completed: a.filter((x) => x?.status === "completed").length,
    attention: a.filter((x) => x?.finding === "attention").length,
    unassessed: a.filter(
      (x) =>
        !x ||
        x.finding === "not_assessed" ||
        x.humanAnswer === "not_sure" ||
        x.facts.some(
          (f) =>
            ["keyboard.untested", "touch.uncovered"].includes(f.key) &&
            typeof f.value === "number" &&
            f.value > 0,
        ),
    ).length,
  };
}
function label(a?: TestAttempt) {
  if (!a) return "Not checked";
  if (a.finding === "attention") return "Needs attention";
  if (a.humanAnswer === "not_sure") return "Not sure";
  if (a.humanAnswer === "looks_good") return "You confirmed";
  return a.status === "completed" && a.finding === "observed"
    ? "Observed"
    : "Not checked";
}
function Status({ attempt }: { attempt?: TestAttempt }) {
  const text = label(attempt);
  return (
    <span
      className={`status ${text === "Needs attention" ? "attention" : text === "Observed" || text === "You confirmed" ? "success" : "neutral"}`}
    >
      {text === "Observed" || text === "You confirmed" ? (
        <Check size={12} />
      ) : (
        <span className="status-dot" />
      )}
      {text}
    </span>
  );
}
function Source({ fact }: { fact: Fact }) {
  return (
    <span className="source-badge" title={fact.qualification}>
      {sources[fact.source]}
    </span>
  );
}
function Icon({ id, size = 22 }: { id: TestId; size?: number }) {
  const C = icons[id];
  return <C size={size} />;
}
function Loader() {
  return (
    <div className="empty-state">
      <ScanLine className="spin" size={28} />
      <p>Opening your local inspection…</p>
    </div>
  );
}
function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <FileText size={36} />
      <h2>{title}</h2>
      <p>{body}</p>
      <Link className="button primary" to="/">
        Back to overview <ArrowRight size={16} />
      </Link>
    </div>
  );
}

class ErrorBoundary extends Component<
  { children: ReactNode; resetKey: string },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidUpdate(previous: { children: ReactNode; resetKey: string }) {
    if (this.state.error && previous.resetKey !== this.props.resetKey)
      this.setState({ error: false });
  }
  render() {
    return this.state.error ? (
      <main className="page">
        <Empty
          title="Let’s get you back on track"
          body="This screen could not open. Your previously saved local results are still available. Reload the page or return to your saved reports."
        />
        <a className="button" href="/reports">
          Open saved reports
        </a>
      </main>
    ) : (
      this.props.children
    );
  }
}

function useStart() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  return {
    busy,
    start: async (specific?: TestId) => {
      setBusy(true);
      try {
        const d = detectDevice();
        const now = new Date().toISOString();
        const selected: TestId[] = specific
          ? [specific]
          : TESTS.filter(
              (t) =>
                t.mode === "automatic" ||
                (!(
                  ["KEY-01", "PTR-01"].includes(t.id) &&
                  d.deviceClass !== "computer"
                ) &&
                  !(t.id === "TOUCH-01" && !d.capabilities.touch) &&
                  !(
                    t.id === "PWR-01" &&
                    (d.deviceClass !== "computer" ||
                      !("getBattery" in navigator))
                  )),
            ).map((t) => t.id);
        let i: Inspection = {
          schemaVersion: 1,
          id: crypto.randomUUID(),
          appVersion: APP_VERSION,
          deviceClass: d.deviceClass,
          purpose: "checking_device",
          createdAt: now,
          updatedAt: now,
          profileFacts: d.facts,
          sellerClaims: [],
          attempts: [],
          selectedTestIds: selected,
          state: "ready",
        };
        const preference = preferredKeyboardProfile();
        if (preference && d.deviceClass === "computer")
          i = chooseInspectionProfile(i, preference);
        await saveInspection(i);
        navigate(
          specific
            ? `/inspect/${i.id}/${TESTS.find((t) => t.id === specific)?.mode === "automatic" ? "scan?start=1" : `test/${specific}`}`
            : `/inspect/${i.id}/scan?start=1`,
        );
      } finally {
        setBusy(false);
      }
    },
  };
}

function Header() {
  return (
    <header className="site-header">
      <Link to="/" className="brand" aria-label="Testdrive home">
        <span className="brand-icon">
          <ScanLine size={23} />
        </span>
        TESTDRIVE<span className="beta">BETA</span>
      </Link>
      <nav aria-label="Main navigation">
        <NavLink to="/" end>
          Overview
        </NavLink>
        <NavLink to="/tests">Test library</NavLink>
        <NavLink to="/reports">Saved reports</NavLink>
      </nav>
      <Link to="/about" className="header-help">
        <CircleHelp size={18} />
        <span>How it works</span>
      </Link>
    </header>
  );
}
function Footer() {
  return (
    <footer className="footer">
      <Link className="footer-brand" to="/">
        TESTDRIVE<span>Know what you’re getting.</span>
      </Link>
      <div>
        <span className="local-dot" /> Built for a more informed decision
      </div>
      <div>
        <Link to="/about">About</Link>
        <Link to="/privacy">Privacy</Link>
        <a
          href="https://github.com/DaDocterTaco/testdrive"
          target="_blank"
          rel="noreferrer"
        >
          Source
        </a>
        <span>v{APP_VERSION}</span>
      </div>
    </footer>
  );
}
export default function App() {
  const loc = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [loc.pathname]);
  return (
    <ErrorBoundary resetKey={loc.pathname}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tests" element={<Library />} />
          <Route path="/inspect/:id/*" element={<InspectionShell />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/:reportId" element={<ReportPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route
            path="*"
            element={
              <Empty
                title="This page took a wrong turn"
                body="Start a new inspection or open a saved report to continue."
              />
            }
          />
        </Routes>
      </main>
      <Footer />
    </ErrorBoundary>
  );
}

function Home() {
  const { start, busy } = useStart();
  const [device] = useState(detectDevice);
  const [draft, setDraft] = useState<Inspection>();
  useEffect(() => {
    listInspections().then((i) =>
      setDraft(i.find((x) => x.state !== "complete")),
    );
  }, []);
  const fact = (key: string) => device.facts.find((f) => f.key === key);
  return (
    <div className="home page">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="local-dot" /> A LITTLE CERTAINTY GOES A LONG WAY
          </div>
          <h1>
            Good devices.
            <br />
            <span>No guesswork.</span>
          </h1>
          <p className="hero-description">
            Start once. We run the quick checks, then guide you through the
            rest—one simple task at a time. Get a clear report of what responded
            and what needs a closer look.
          </p>
          <div className="hero-actions">
            <button
              className="button primary large"
              disabled={busy}
              onClick={() => start()}
            >
              Start inspection <ArrowRight size={19} />
            </button>
            <Link to="/tests" className="text-button">
              Explore the tests <ChevronRight size={16} />
            </Link>
          </div>
          <p className="start-explainer">
            Starts a short browser scan. Camera and microphone ask separately.
          </p>
          <div className="hero-trust">
            <span>
              <Check size={15} /> No account needed
            </span>
            <span>
              <LockKeyhole size={14} /> Your data stays local
            </span>
            <span>
              <Clock3 size={14} /> About 5–10 min
            </span>
          </div>
          {draft && (
            <Link className="resume-link" to={`/inspect/${draft.id}/tests`}>
              You have an unfinished inspection. Pick up where you left off{" "}
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
        <div className="device-visual">
          <div className="visual-top">
            <span>
              <span className="local-dot" /> READY WHEN YOU ARE
            </span>
            <MoreHorizontal size={20} />
          </div>
          <div className="computer-art" aria-hidden="true">
            <div className="art-screen">
              <div className="art-ui-bar">
                <i />
                <i />
                <i />
              </div>
              <div className="art-scan">
                <ScanLine size={39} />
                <span>Let’s take a closer look.</span>
                <div className="art-line" />
              </div>
            </div>
            <div className="art-base" />
            <div className="art-phone">
              <div className="phone-speaker" />
              <Fingerprint size={26} />
              <div className="phone-dots">
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
          <div className="visual-divider" />
          <div className="device-preview">
            <span className="mini-icon">
              <Laptop size={20} />
            </span>
            <div>
              <strong>Your next inspection starts here</strong>
              <p>Computers, phones & tablets. One simple check.</p>
            </div>
            <span className="ready-pill">Browser ready</span>
          </div>
          <div className="preview-facts">
            <span>
              <Monitor size={14} />
              {window.screen.width} × {window.screen.height} CSS screen
            </span>
            <span>
              <Touchpad size={14} />
              {device.capabilities.touch
                ? "Touch API available"
                : "Keyboard & pointer"}
            </span>
            <span>
              <ShieldCheck size={14} />
              {fact("secure_context")?.value === false
                ? "Local preview"
                : "Local inspection"}
            </span>
          </div>
        </div>
      </section>
      <section className="home-lower">
        <div className="section-title">
          <div>
            <span className="eyebrow">THE IMPORTANT THINGS, COVERED</span>
            <h2>A proper check. Without the technical degree.</h2>
          </div>
          <Link className="text-button" to="/tests">
            See all {TESTS.length} checks <ArrowRight size={16} />
          </Link>
        </div>
        <div className="category-grid">
          {[
            {
              icon: Keyboard,
              title: "Every key. Every click.",
              copy: "Keyboard, pointer, and touch checks that respond to your real interactions.",
              tag: "INPUT & CONTROLS",
            },
            {
              icon: Camera,
              title: "Seen and heard.",
              copy: "Get automatic camera and microphone feedback, then listen to your speakers.",
              tag: "CAMERA & AUDIO",
            },
            {
              icon: Monitor,
              title: "A clearer picture.",
              copy: "Look for display issues with simple colors, gradients, and patterns.",
              tag: "SCREEN & DISPLAY",
            },
            {
              icon: Cpu,
              title: "Under the surface.",
              copy: "Run a quick scan, check charging, and match your laptop’s keyboard profile.",
              tag: "PERFORMANCE & SPECS",
            },
          ].map((c) => (
            <Link to="/tests" className="category-card" key={c.title}>
              <span className="category-icon">
                <c.icon size={24} />
              </span>
              <span className="micro-label">{c.tag}</span>
              <h3>{c.title}</h3>
              <p>{c.copy}</p>
              <ArrowRight className="category-arrow" size={18} />
            </Link>
          ))}
        </div>
      </section>
      <section className="how-strip">
        <div className="how-intro">
          <span className="eyebrow">LESS DOUBT. BETTER DECISIONS.</span>
          <h2>
            From “looks okay”
            <br />
            to knowing more.
          </h2>
        </div>
        {[
          [
            "01",
            "Open it on the device",
            "The browser gathers what it can. You stay in control.",
          ],
          [
            "02",
            "Try the important things",
            "Follow short, hands-on checks. Skip anything you need to.",
          ],
          [
            "03",
            "Keep the whole picture",
            "Save clear findings, unknowns, and next steps in one report.",
          ],
        ].map(([n, t, c]) => (
          <div className="how-step" key={n}>
            <span>{n}</span>
            <h3>{t}</h3>
            <p>{c}</p>
          </div>
        ))}
      </section>
      <div className="honesty-note">
        <Info size={18} />
        <p>
          A useful inspection, with honest limits. Browser checks can reveal
          observations and guide a closer look. They don’t guarantee a
          fault-free device.
        </p>
        <Link to="/about">
          Understand the results <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}

function Library() {
  const { start, busy } = useStart();
  const [filter, setFilter] = useState("all");
  return (
    <div className="page content-page">
      <PageHeading
        eyebrow="YOUR DEVICE, A CLOSER LOOK"
        title="The test library"
        description="One concern or a complete check. Choose where you want to start."
      />
      <div className="tabs library-tabs">
        {["all", "input", "media", "display", "performance"].map((f) => (
          <button
            key={f}
            className={filter === f ? "active" : ""}
            onClick={() => setFilter(f)}
          >
            {f === "all"
              ? "All checks"
              : f === "media"
                ? "Camera & audio"
                : f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      <div className="test-grid">
        {TESTS.filter((t) => filter === "all" || t.group === filter).map(
          (t) => (
            <article className="test-card" key={t.id}>
              <div className="test-card-top">
                <span className="category-icon">
                  <Icon id={t.id} />
                </span>
                <span className="subtle-chip">
                  {t.mode === "automatic" ? "Automatic" : "Hands-on"}
                </span>
              </div>
              <h3>{t.title}</h3>
              <p>{t.description}</p>
              <div className="test-card-bottom">
                <span>
                  <Clock3 size={14} />
                  {t.duration}
                </span>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => start(t.id)}
                >
                  Run check <ArrowRight size={15} />
                </button>
              </div>
            </article>
          ),
        )}
      </div>
      <div className="callout">
        <ShieldCheck size={22} />
        <div>
          <strong>You’re in the driver’s seat.</strong>
          <p>
            Media access is requested only when you open that check. Every test
            can be stopped or skipped.
          </p>
        </div>
      </div>
    </div>
  );
}
function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}

type InspectionContextValue = {
  inspection: Inspection;
  update: (i: Inspection) => Promise<boolean>;
};
const InspectionContext = createContext<InspectionContextValue | null>(null);
function useInspection() {
  const c = useContext(InspectionContext);
  if (!c) throw new Error("Inspection missing");
  return c;
}
function InspectionShell() {
  const { id } = useParams();
  const [i, setI] = useState<Inspection>();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const loc = useLocation();
  useEffect(() => {
    let active = true;
    loadInspection(id!)
      .then((x) => {
        if (active) {
          setI(x);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [id]);
  const update = async (n: Inspection) => {
    const v = { ...n, updatedAt: new Date().toISOString() };
    try {
      validateInspection(v);
      setI(v);
      await saveInspection(v);
      setError("");
      return true;
    } catch (error) {
      setError(
        error instanceof Error && /at most/.test(error.message)
          ? "This inspection has reached its record limit. Your earlier results are preserved. Finish and export this inspection, then start a new one for more checks."
          : "This change could not be saved. Your earlier results are preserved. Return to review to finish or export the inspection.",
      );
      return false;
    }
  };
  if (!loaded) return <Loader />;
  if (!i)
    return (
      <Empty
        title="This inspection isn’t saved here"
        body="Local inspections belong to this browser. Import a report or begin a new inspection on this device."
      />
    );
  const current = loc.pathname.split("/")[3];
  const c = counts(i);
  return (
    <InspectionContext.Provider value={{ inspection: i, update }}>
      <div
        className={`page inspection-page ${current === "test" ? "guided-page" : ""}`}
      >
        <div className="inspection-topline">
          <Link to="/reports" className="text-button">
            <ArrowLeft size={15} /> Your inspections
          </Link>
          <span>
            <span className="local-dot" />
            {getStorageStatus().mode === "memory"
              ? "Saved for this visit"
              : "Saved on this device"}
          </span>
        </div>
        <div className="inspection-title">
          <div>
            <span className="eyebrow">DEVICE INSPECTION</span>
            <h1>
              {i.nickname ||
                `Your ${i.deviceClass === "unknown" ? "device" : i.deviceClass}`}
            </h1>
            <p>
              {purposes[i.purpose]}
              <span className="separator">/</span>
              {c.completed} of {i.selectedTestIds.length} checks completed
            </p>
          </div>
          <div className="inspection-number">
            INSPECTION <span>#{i.id.slice(0, 8).toUpperCase()}</span>
          </div>
        </div>
        <div className="inspection-layout">
          <aside className="inspection-sidebar">
            <div className="sidebar-label">YOUR INSPECTION</div>
            {[
              { route: "setup", name: "Device & setup", icon: Laptop },
              { route: "tests", name: "Run your checks", icon: ScanLine },
              { route: "specs", name: "Specifications", icon: FileText },
              { route: "review", name: "Review & report", icon: FileCheck2 },
            ].map((n, idx) => (
              <NavLink
                key={n.route}
                className={
                  current === n.route ||
                  (n.route === "tests" && ["test", "scan"].includes(current))
                    ? "sidebar-link active"
                    : "sidebar-link"
                }
                to={`/inspect/${i.id}/${n.route}`}
              >
                <span className="sidebar-step">0{idx + 1}</span>
                <n.icon size={18} />
                {n.name}
                <ChevronRight size={15} />
              </NavLink>
            ))}
            <div className="sidebar-tip">
              <LockKeyhole size={19} />
              <strong>Private by design.</strong>
              <p>
                Your results stay in this browser. Export a report to take them
                with you.
              </p>
            </div>
          </aside>
          <div className="inspection-content">
            {error && <div className="alert">{error}</div>}
            {getStorageStatus().mode === "memory" && (
              <div className="alert">
                Local storage is unavailable. Progress may be lost on refresh.
                Export your finished report.
              </div>
            )}
            <Routes>
              <Route path="setup" element={<Setup />} />
              <Route path="scan" element={<QuickScan />} />
              <Route path="tests" element={<InspectionTests />} />
              <Route path="test/:testId" element={<Guided />} />
              <Route path="specs" element={<Specs />} />
              <Route path="review" element={<Review />} />
              <Route
                path="*"
                element={
                  <Empty
                    title="Choose a step"
                    body="Use the inspection menu to continue your check."
                  />
                }
              />
            </Routes>
          </div>
        </div>
      </div>
    </InspectionContext.Provider>
  );
}

function Setup() {
  const { inspection: i, update } = useInspection();
  const navigate = useNavigate();
  const [n, setN] = useState(i);
  const [saving, setSaving] = useState(false);
  const chooseClass = (v: DeviceClass) =>
    setN({
      ...n,
      deviceClass: v,
      selectedTestIds: TESTS.filter(
        (t) =>
          (t.id !== "TOUCH-01" || detectDevice().capabilities.touch) &&
          (t.id !== "PWR-01" ||
            (v === "computer" && "getBattery" in navigator)),
      )
        .filter((t) => v === "computer" || !["KEY-01", "PTR-01"].includes(t.id))
        .map((t) => t.id),
    });
  const submit = async () => {
    setSaving(true);
    if (!(await update({ ...n, state: "ready" }))) {
      setSaving(false);
      return;
    }
    navigate(
      `/inspect/${i.id}/${i.attempts.some((a) => a.testId === "SYS-01") ? "tests" : "scan?start=1"}`,
    );
  };
  return (
    <>
      <div className="panel-heading">
        <h2>Make this inspection yours.</h2>
        <p>
          A few details help us tailor the inspection. You can change these
          anytime.
        </p>
      </div>
      <section className="panel">
        <div className="field-label">What are you checking?</div>
        <div className="device-options">
          {(["computer", "phone", "tablet"] as DeviceClass[]).map((v) => (
            <button
              key={v}
              className={`choice-card ${n.deviceClass === v ? "selected" : ""}`}
              onClick={() => chooseClass(v)}
            >
              {v === "computer" ? (
                <Laptop />
              ) : v === "phone" ? (
                <Smartphone />
              ) : (
                <Monitor />
              )}
              <strong>
                {v === "computer"
                  ? "Computer"
                  : v === "phone"
                    ? "Phone"
                    : "Tablet"}
              </strong>
              {n.deviceClass === v && <CheckCircle2 size={17} />}
            </button>
          ))}
        </div>
        <label className="field-label" htmlFor="purpose">
          What brings you here?
        </label>
        <select
          id="purpose"
          value={n.purpose}
          onChange={(e) =>
            setN({ ...n, purpose: e.target.value as Inspection["purpose"] })
          }
        >
          {Object.entries(purposes).map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </select>
        <label className="field-label" htmlFor="nickname">
          Give it a name <span>Optional</span>
        </label>
        <input
          id="nickname"
          maxLength={80}
          placeholder="e.g. The laptop I’m looking at"
          value={n.nickname || ""}
          onChange={(e) => setN({ ...n, nickname: e.target.value })}
        />
      </section>
      {n.deviceClass === "computer" && (
        <DeviceProfilePanel inspection={n} onChange={setN} />
      )}
      <section className="panel">
        <div className="panel-title">
          <h3>Your inspection plan</h3>
          <span className="subtle-chip">Adjust as needed</span>
        </div>
        <p className="muted">
          Three quick browser observations, then hands-on checks with you in
          control.
        </p>
        <div className="selection-grid">
          {TESTS.map((t) => (
            <label className="test-selection" key={t.id}>
              <input
                type="checkbox"
                checked={n.selectedTestIds.includes(t.id)}
                onChange={(e) =>
                  setN({
                    ...n,
                    selectedTestIds: e.target.checked
                      ? [...n.selectedTestIds, t.id]
                      : n.selectedTestIds.filter((x) => x !== t.id),
                  })
                }
              />
              <Icon id={t.id} size={17} />
              <span>{t.title}</span>
            </label>
          ))}
        </div>
      </section>
      <div className="bottom-action">
        <p>
          <Clock3 size={15} /> Browser workloads take a few seconds. Keep this
          tab open.
        </p>
        <button
          className="button primary"
          disabled={saving || !n.selectedTestIds.length}
          onClick={submit}
        >
          {i.attempts.some((a) => a.testId === "SYS-01")
            ? "Save & continue"
            : "Run quick scan"}{" "}
          <ArrowRight size={17} />
        </button>
      </div>
    </>
  );
}

function QuickScan() {
  const { inspection: i, update } = useInspection();
  const navigate = useNavigate();
  const location = useLocation();
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<TestId>();
  const [finished, setFinished] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const controller = useRef<AbortController | undefined>(undefined);
  const scanRef = useRef<() => void>(() => {});
  const latestI = useRef(i);
  latestI.current = i;
  const auto = i.selectedTestIds.filter(
    (id) => TESTS.find((t) => t.id === id)?.mode === "automatic",
  );
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!new URLSearchParams(location.search).has("start")) return;
    const timer = setTimeout(() => {
      navigate(location.pathname, { replace: true });
      scanRef.current();
    }, 80);
    return () => clearTimeout(timer);
  }, [location.pathname, location.search, navigate]);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setElapsed((x) => x + 1), 1000);
    return () => clearInterval(timer);
  }, [running]);
  const scan = async () => {
    if (controller.current && !controller.current.signal.aborted && running)
      return;
    controller.current = new AbortController();
    setRunning(true);
    setFinished(false);
    setElapsed(0);
    let next = { ...latestI.current, state: "scanning" };
    await update(next);
    for (const id of auto) {
      if (controller.current.signal.aborted) break;
      setCurrent(id);
      const a = await runAutomatic(id, controller.current.signal);
      next = { ...next, attempts: [...next.attempts, a] };
      if (!(await update(next))) {
        setRunning(false);
        setCurrent(undefined);
        return;
      }
    }
    await update({
      ...next,
      state: controller.current.signal.aborted ? "paused" : "guided",
    });
    setCurrent(undefined);
    setRunning(false);
    setFinished(true);
  };
  scanRef.current = () => {
    void scan();
  };
  const nextGuided = i.selectedTestIds.find(
    (id) =>
      TESTS.find((t) => t.id === id)?.mode === "guided" &&
      (!latest(i, id) ||
        ["running", "interrupted", "cancelled"].includes(
          latest(i, id)!.status,
        )),
  );
  const nextTitle = TESTS.find((t) => t.id === nextGuided)?.title;
  return (
    <>
      <div className="panel-heading">
        <h2>First, we’ll handle the automatic checks.</h2>
        <p>
          Sit tight for a few seconds. Then we’ll guide you through one simple
          task at a time.
        </p>
      </div>
      <section className="panel scan-panel">
        <div className={`scan-orb ${running ? "scanning" : ""}`}>
          <ScanLine size={38} />
        </div>
        <h3>
          {running
            ? TESTS.find((t) => t.id === current)?.title ||
              "Preparing your scan"
            : finished
              ? "Your quick scan is saved."
              : "Ready for a quick scan?"}
        </h3>
        <p>
          {running
            ? "Keep this tab visible. You can stop at any time."
            : finished
              ? nextGuided
                ? `Next is ${nextTitle?.toLowerCase()}. We’ll show you exactly what to do.`
                : "Your selected checks are finished. Review your results when you’re ready."
              : "We’ll collect browser information and run short, bounded processing and rendering samples."}
        </p>
        <div className="scan-tasks">
          {auto.map((id) => (
            <div className="scan-task" key={id}>
              <span
                className={current === id ? "running-dot" : "scan-task-icon"}
              >
                {current === id ? (
                  <Activity size={16} />
                ) : latest(i, id) ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <Icon id={id} size={16} />
                )}
              </span>
              <span>{TESTS.find((t) => t.id === id)?.title}</span>
              {current === id ? (
                <span className="micro-label">RUNNING</span>
              ) : (
                <Status attempt={latest(i, id)} />
              )}
            </div>
          ))}
        </div>
        {running ? (
          <button
            className="button"
            onClick={() => controller.current?.abort()}
          >
            <Square size={15} /> Stop scan
          </button>
        ) : (
          <button
            className="button primary"
            onClick={
              finished
                ? () =>
                    navigate(
                      `/inspect/${i.id}/${nextGuided ? `test/${nextGuided}` : "review"}`,
                    )
                : scan
            }
          >
            {finished
              ? nextGuided
                ? `Continue to ${nextTitle?.toLowerCase()}`
                : "Review results"
              : auto.length
                ? "Run quick scan"
                : "Continue without automatic checks"}
            <ArrowRight size={17} />
          </button>
        )}
        {running && (
          <span className="elapsed" role="status">
            {elapsed}s elapsed · {auto.findIndex((x) => x === current) + 1} of{" "}
            {auto.length} checks
          </span>
        )}
      </section>
      <div className="callout">
        <Info size={19} />
        <p>
          These samples describe this browser session. They don’t measure
          battery wear, certify stability, or assign a device score.
        </p>
      </div>
      <div className="scan-secondary">
        <Link to={`/inspect/${i.id}/setup`}>Change device or checks</Link>
        <Link to={`/inspect/${i.id}/tests`}>See all checks</Link>
      </div>
    </>
  );
}

function InspectionTests() {
  const { inspection: i } = useInspection();
  const navigate = useNavigate();
  const next = i.selectedTestIds.find(
    (id) =>
      (!latest(i, id) ||
        ["running", "interrupted", "cancelled"].includes(
          latest(i, id)!.status,
        )) &&
      TESTS.find((t) => t.id === id)?.mode === "guided",
  );
  return (
    <>
      <div className="panel-heading">
        <h2>Let’s check the essentials.</h2>
        <p>
          Take each check at your own pace. Your report keeps track of what’s
          still unknown.
        </p>
      </div>
      {next && (
        <div className="next-check">
          <span className="category-icon">
            <Icon id={next} />
          </span>
          <div>
            <span className="micro-label">UP NEXT</span>
            <h3>{TESTS.find((t) => t.id === next)?.title}</h3>
          </div>
          <Link className="button primary" to={`/inspect/${i.id}/test/${next}`}>
            Start check <ArrowRight size={16} />
          </Link>
        </div>
      )}
      <div className="inspection-checks">
        {i.selectedTestIds.map((id) => {
          const t = TESTS.find((t) => t.id === id)!;
          const a = latest(i, id);
          return (
            <div className="inspection-check" key={id}>
              <span className="mini-icon">
                <Icon id={id} size={20} />
              </span>
              <div>
                <h3>{t.title}</h3>
                <p>{a?.explanation || t.description}</p>
              </div>
              <Status attempt={a} />
              <button
                className="button small"
                onClick={() =>
                  navigate(
                    `/inspect/${i.id}/${t.mode === "automatic" ? "scan" : `test/${id}`}`,
                  )
                }
              >
                {a ? "Check again" : "Start"}
                <ChevronRight size={14} />
              </button>
            </div>
          );
        })}
      </div>
      <div className="bottom-action">
        <Link className="text-button" to={`/inspect/${i.id}/specs`}>
          Add exact specifications <Plus size={16} />
        </Link>
        <Link className="button primary" to={`/inspect/${i.id}/review`}>
          Review inspection <ArrowRight size={16} />
        </Link>
      </div>
    </>
  );
}
function Guided() {
  const { inspection: i, update } = useInspection();
  const { testId } = useParams();
  const navigate = useNavigate();
  const currentInspection = useRef(i);
  currentInspection.current = i;
  const t = TESTS.find((t) => t.id === testId);
  const record = async (a: TestAttempt) => {
    const base = currentInspection.current;
    const next = {
      ...base,
      selectedTestIds: base.selectedTestIds.includes(a.testId)
        ? base.selectedTestIds
        : [...base.selectedTestIds, a.testId],
      attempts: [...base.attempts.filter((x) => x.id !== a.id), a],
      state: "guided",
    };
    currentInspection.current = next;
    const saved = await update(next);
    if (!saved) currentInspection.current = base;
    return saved;
  };
  const done = async (a: TestAttempt) => {
    if (!(await record(a))) return;
    if (a.status === "interrupted") {
      navigate(`/inspect/${i.id}/tests`);
      return;
    }
    const base = currentInspection.current;
    const remaining = base.selectedTestIds.find(
      (id) =>
        id !== a.testId &&
        TESTS.find((t) => t.id === id)?.mode === "guided" &&
        (!latest(base, id) ||
          ["running", "interrupted", "cancelled"].includes(
            latest(base, id)!.status,
          )),
    );
    navigate(`/inspect/${i.id}/${remaining ? `test/${remaining}` : "review"}`);
  };
  if (!t || t.mode === "automatic")
    return (
      <Empty
        title="Choose a hands-on check"
        body="Open the test library to pick a check that’s available."
      />
    );
  return (
    <>
      <div className="guided-topbar">
        <Link to={`/inspect/${i.id}/tests`}>
          <ArrowLeft size={15} /> All checks
        </Link>
        <span>
          {
            i.selectedTestIds.filter(
              (id) =>
                latest(i, id) &&
                !["running", "interrupted", "cancelled"].includes(
                  latest(i, id)!.status,
                ),
            ).length
          }{" "}
          of {i.selectedTestIds.length} checked
        </span>
        <Link to={`/inspect/${i.id}/review`}>Finish early</Link>
      </div>
      <TestWorkbench
        key={testId}
        testId={t.id}
        deviceClass={i.deviceClass}
        profileId={inspectionProfile(i)?.id}
        onProfileChange={(profileId) => {
          rememberKeyboardProfile(profileId);
          const next = chooseInspectionProfile(
            currentInspection.current,
            profileId,
          );
          currentInspection.current = next;
          void update(next);
        }}
        continueLabel={
          i.selectedTestIds.some(
            (id) =>
              id !== t.id &&
              TESTS.find((x) => x.id === id)?.mode === "guided" &&
              (!latest(i, id) ||
                ["running", "interrupted", "cancelled"].includes(
                  latest(i, id)!.status,
                )),
          )
            ? "Save & next check"
            : "Save & review"
        }
        onComplete={done}
        onProgress={record}
        onExit={() => navigate(`/inspect/${i.id}/tests`)}
      />
    </>
  );
}

function HardwareSummary({ inspection: i }: { inspection: Inspection }) {
  return (
    <div className="hardware-summary">
      {[
        ["model", "Exact model"],
        ["processor", "Exact processor"],
        ["installed_memory", "Installed memory"],
      ].map(([key, title]) => {
        const f = [...i.profileFacts]
          .reverse()
          .find(
            (f) =>
              f.key === key &&
              ["imported_system_report", "user_provided"].includes(f.source),
          );
        return (
          <div key={key}>
            <span>{title}</span>
            <strong>{f ? String(f.value) : "Unknown"}</strong>
            {f ? (
              <Source fact={f} />
            ) : (
              <small>Add a supported system report</small>
            )}
          </div>
        );
      })}
    </div>
  );
}
function Facts({ facts }: { facts: Fact[] }) {
  return (
    <div className="facts-list">
      {facts.map((f) => (
        <div className="fact-row" key={f.id}>
          <div>
            <span>{f.label}</span>
            {f.qualification && <small>{f.qualification}</small>}
          </div>
          <strong>
            {String(f.value)}
            {f.unit ? ` ${f.unit}` : ""}
          </strong>
          <Source fact={f} />
        </div>
      ))}
    </div>
  );
}
function Specs() {
  const { inspection: i, update } = useInspection();
  const [preview, setPreview] = useState<{
    facts: Fact[];
    warnings: string[];
  }>();
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ram, setRam] = useState(
    String(
      i.sellerClaims.find((f) => f.key === "installed_memory")?.value || "",
    ),
  );
  const [cpu, setCpu] = useState(
    String(i.sellerClaims.find((f) => f.key === "processor")?.value || ""),
  );
  const [saved, setSaved] = useState(false);
  const read = async (file?: File) => {
    if (!file) return;
    setError("");
    setPreview(undefined);
    setConfirmed(false);
    setBusy(true);
    try {
      setPreview(await parseWindowsReport(file));
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "This report could not be read. Choose an English System Information text export.",
      );
    } finally {
      setBusy(false);
    }
  };
  const apply = async () => {
    if (!preview || !confirmed) return;
    const match = matchDeviceProfile(
      String(preview.facts.find((f) => f.key === "manufacturer")?.value ?? ""),
      String(preview.facts.find((f) => f.key === "model")?.value ?? ""),
    );
    const saved = await update({
      ...i,
      profileFacts: [
        ...i.profileFacts.filter(
          (f) =>
            f.source !== "imported_system_report" &&
            !(
              match &&
              ["keyboard_profile_id", "keyboard_profile_name"].includes(f.key)
            ),
        ),
        ...preview.facts,
      ],
    });
    if (!saved) return;
    if (match) rememberKeyboardProfile(match.profile.id);
    setPreview(undefined);
    setSaved(true);
  };
  const saveClaims = async () => {
    const claims: Fact[] = [];
    if (ram.trim())
      claims.push(
        makeFact(
          "installed_memory",
          "Seller-claimed installed memory",
          ram.trim(),
          "user_provided",
        ),
      );
    if (cpu.trim())
      claims.push(
        makeFact(
          "processor",
          "Seller-claimed processor",
          cpu.trim(),
          "user_provided",
        ),
      );
    await update({ ...i, sellerClaims: claims });
    setSaved(true);
  };
  return (
    <>
      <div className="panel-heading">
        <h2>Get the full specification.</h2>
        <p>
          Your browser knows some things. A system report can fill in the
          important gaps.
        </p>
      </div>
      {i.deviceClass === "computer" && (
        <DeviceProfilePanel
          inspection={i}
          onChange={(next) => {
            void update(next);
          }}
        />
      )}
      <section className="panel">
        <div className="panel-title">
          <h3>
            <FileText size={19} /> Add exact Windows specifications
          </h3>
          <span className="subtle-chip">Local import</span>
        </div>
        <p>
          Supports English Windows System Information text exports. No file
          leaves this device.
        </p>
        <ol className="import-steps">
          <li>
            Search Windows for <strong>System Information</strong> and open it.
          </li>
          <li>
            Choose <strong>File → Export</strong> and save a text file.
          </li>
          <li>
            Choose that <strong>.txt</strong> file below. Review the extracted
            fields before saving.
          </li>
        </ol>
        <label className={`button ${busy ? "disabled" : ""}`}>
          <Upload size={16} />
          {busy ? "Reading locally…" : "Choose system report"}
          <input
            className="sr-only"
            type="file"
            accept=".txt"
            disabled={busy}
            onChange={(e) => {
              read(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <span className="file-hint">.txt · UTF-8 or UTF-16 · Up to 10 MiB</span>
        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}
        {preview && (
          <div className="import-preview">
            <h3>Review extracted fields</h3>
            <Facts facts={preview.facts} />
            {preview.warnings.map((w) => (
              <p className="muted" key={w}>
                {w}
              </p>
            ))}
            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              I confirm this report describes the device I’m inspecting.
            </label>
            <button
              className="button primary"
              disabled={!confirmed}
              onClick={apply}
            >
              Use these specifications <Check size={16} />
            </button>
          </div>
        )}
        {saved && (
          <p className="saved-message" role="status">
            <CheckCircle2 size={16} /> Changes saved on this device.
          </p>
        )}
      </section>
      <section className="panel">
        <h3>Does it match the listing?</h3>
        <p className="muted">
          Add the seller’s claims to compare them with imported specifications.
          A browser memory hint is never used as installed RAM.
        </p>
        <div className="form-grid">
          <div>
            <label className="field-label" htmlFor="ram-claim">
              Claimed installed memory
            </label>
            <input
              id="ram-claim"
              placeholder="e.g. 16 GB"
              maxLength={120}
              value={ram}
              onChange={(e) => setRam(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="cpu-claim">
              Claimed exact processor
            </label>
            <input
              id="cpu-claim"
              placeholder="e.g. Intel Core i7-1165G7"
              maxLength={500}
              value={cpu}
              onChange={(e) => setCpu(e.target.value)}
            />
          </div>
        </div>
        <button className="button" onClick={saveClaims}>
          Save seller claims <Check size={16} />
        </button>
        {i.sellerClaims.length > 0 && <Comparisons inspection={i} />}
      </section>
      <section className="panel">
        <h3>What we know about this device</h3>
        <HardwareSummary inspection={i} />
        <Facts facts={i.profileFacts} />
        <div className="unknown-facts">
          <span>
            <HardDrive size={16} /> Storage capacity: unknown
          </span>
          <span>Battery wear: not checked</span>
          <span>
            Exact specs on a phone or Mac: check Settings / About this device.
          </span>
        </div>
      </section>
      <div className="bottom-action">
        <span />
        <Link className="button primary" to={`/inspect/${i.id}/review`}>
          Review inspection <ArrowRight size={16} />
        </Link>
      </div>
    </>
  );
}
function Comparisons({ inspection: i }: { inspection: Inspection }) {
  return (
    <div className="comparisons">
      {compareClaims(i.sellerClaims, i.profileFacts).map((c, idx) => (
        <div className={`comparison ${c.status}`} key={idx}>
          <span
            className={`status ${c.status === "difference" ? "attention" : c.status === "consistent" ? "success" : "neutral"}`}
          >
            {c.status === "difference"
              ? "Difference to check"
              : c.status === "consistent"
                ? "Consistent"
                : "Insufficient information"}
          </span>
          <h4>{c.label}</h4>
          <p>
            Listing: <strong>{c.claim}</strong> · Report:{" "}
            <strong>{c.actual || "Unknown"}</strong>
          </p>
          <small>{c.explanation}</small>
        </div>
      ))}
    </div>
  );
}

function Review() {
  const { inspection: i, update } = useInspection();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(
    String(i.profileFacts.find((f) => f.key === "inspectionNote")?.value || ""),
  );
  const navigate = useNavigate();
  const finish = async () => {
    setBusy(true);
    const next = {
      ...i,
      state: "complete",
      profileFacts: [
        ...i.profileFacts.filter((f) => f.key !== "inspectionNote"),
        ...(note.trim()
          ? [
              makeFact(
                "inspectionNote",
                "Inspection note",
                note.trim(),
                "user_provided",
              ),
            ]
          : []),
      ],
    };
    if (!(await update(next))) {
      setBusy(false);
      return;
    }
    const old = (await listReports()).filter((r) => r.inspection.id === i.id);
    const report: ReportSnapshot = {
      schemaVersion: 1,
      reportId: crypto.randomUUID(),
      revision: old.length + 1,
      finalizedAt: new Date().toISOString(),
      inspection: { ...next, updatedAt: new Date().toISOString() },
      limitations: LIMITATIONS,
    };
    await saveReport(report);
    navigate(`/reports/${report.reportId}`);
  };
  return (
    <>
      <div className="panel-heading">
        <h2>The whole picture.</h2>
        <p>
          Review what you observed and what still needs a closer look. You can
          finish at any time.
        </p>
      </div>
      <Summary inspection={i} />
      <Results inspection={i} editable />
      <section className="panel">
        <label className="field-label" htmlFor="inspection-note">
          Anything else to remember?
        </label>
        <textarea
          id="inspection-note"
          maxLength={500}
          rows={3}
          placeholder="Add a short note about the device or what to recheck."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <span className="file-hint">
          {note.length}/500 characters · Saved in your report
        </span>
      </section>
      <div className="bottom-action">
        <p>
          <LockKeyhole size={15} /> Finished reports stay in this browser.
        </p>
        <button className="button primary" disabled={busy} onClick={finish}>
          Finish & create report <FileCheck2 size={17} />
        </button>
      </div>
    </>
  );
}
function Summary({ inspection: i }: { inspection: Inspection }) {
  const c = counts(i);
  const differences = compareClaims(i.sellerClaims, i.profileFacts).filter(
    (x) => x.status === "difference",
  );
  return (
    <>
      <div className="summary-grid">
        <div>
          <span className="summary-icon success">
            <CheckCircle2 size={21} />
          </span>
          <strong>
            {c.completed}
            <small>of {i.selectedTestIds.length}</small>
          </strong>
          <span>Checks completed</span>
        </div>
        <div>
          <span className="summary-icon attention">
            <Activity size={21} />
          </span>
          <strong>{c.attention + differences.length}</strong>
          <span>Items to review</span>
        </div>
        <div>
          <span className="summary-icon neutral">
            <CircleHelp size={21} />
          </span>
          <strong>{c.unassessed}</strong>
          <span>Not fully assessed</span>
        </div>
      </div>
      {differences.length > 0 && (
        <section className="panel">
          <h3>Specification differences to check</h3>
          <Comparisons inspection={i} />
        </section>
      )}
    </>
  );
}
function Results({
  inspection: i,
  editable = false,
}: {
  inspection: Inspection;
  editable?: boolean;
}) {
  return (
    <section className="panel results-panel">
      <div className="panel-title">
        <h3>Inspection findings</h3>
        <span className="subtle-chip">Recorded evidence</span>
      </div>
      {i.selectedTestIds.map((id) => {
        const t = TESTS.find((t) => t.id === id)!;
        const a = latest(i, id);
        return (
          <article className="result-item" key={id}>
            <div className="result-title">
              <span className="mini-icon">
                <Icon id={id} size={18} />
              </span>
              <h4>{t.title}</h4>
              <Status attempt={a} />
              {editable && (
                <Link
                  className="text-button"
                  to={`/inspect/${i.id}/${t.mode === "automatic" ? "scan" : `test/${id}`}`}
                >
                  Retest <ArrowRight size={14} />
                </Link>
              )}
            </div>
            <p>
              {a?.explanation ||
                "This check has not been run. Its condition remains unknown."}
            </p>
            {a?.facts.length ? (
              <details className="evidence" open={!editable}>
                <summary>
                  {a.facts.length} recorded observation
                  {a.facts.length === 1 ? "" : "s"}
                </summary>
                <Facts facts={a.facts} />
              </details>
            ) : null}
            {a?.note && <p className="note-text">Your note: {a.note}</p>}
            {a?.nextStep && (
              <p className="next-step">
                <ArrowRight size={13} />
                {a.nextStep}
              </p>
            )}
            {a && (
              <small className="attempt-info">
                {a.status.replaceAll("_", " ")} · Test v{a.testVersion} ·{" "}
                {a.endedAt ? new Date(a.endedAt).toLocaleString() : ""}
                {i.attempts.filter((x) => x.testId === id).length > 1
                  ? ` · ${i.attempts.filter((x) => x.testId === id).length} attempts retained`
                  : ""}
              </small>
            )}
          </article>
        );
      })}
    </section>
  );
}

function Reports() {
  const [reports, setReports] = useState<ReportSnapshot[]>([]);
  const [drafts, setDrafts] = useState<Inspection[]>([]);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<string>();
  const refresh = async () => {
    const [r, d] = await Promise.all([listReports(), listInspections()]);
    setReports(r);
    setDrafts(d.filter((i) => i.state !== "complete"));
  };
  useEffect(() => {
    refresh();
  }, []);
  const read = async (f?: File) => {
    if (!f) return;
    setError("");
    try {
      const r = await parseReport(f);
      await saveReport(r);
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "This report could not be opened.",
      );
    }
  };
  const remove = async (id: string) => {
    if (id === "all") {
      await Promise.all([
        ...reports.map((r) => deleteReport(r.reportId)),
        ...drafts.map((d) => deleteInspection(d.id)),
      ]);
      const all = await listInspections();
      await Promise.all(all.map((x) => deleteInspection(x.id)));
      rememberKeyboardProfile("");
    } else if (reports.some((r) => r.reportId === id)) {
      await deleteReport(id);
    } else await deleteInspection(id);
    setConfirm(undefined);
    refresh();
  };
  return (
    <div className="page content-page">
      <PageHeading
        eyebrow="YOUR DEVICE’S PAPER TRAIL"
        title="Saved reports"
        description="A record of what you checked. Stored in this browser, ready when you need it."
      >
        <label className="button">
          <Upload size={16} />
          Import a report
          <input
            type="file"
            className="sr-only"
            accept=".json,application/json"
            onChange={(e) => {
              read(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </PageHeading>
      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}
      {drafts.length > 0 && (
        <section className="reports-section">
          <h2>
            Pick up where you left off <span>{drafts.length}</span>
          </h2>
          {drafts.map((i) => (
            <div className="saved-row" key={i.id}>
              <span className="category-icon">
                <Laptop size={22} />
              </span>
              <div>
                <h3>{i.nickname || `Your ${i.deviceClass}`}</h3>
                <p>
                  In progress · {counts(i).completed} of{" "}
                  {i.selectedTestIds.length} checks ·{" "}
                  {new Date(i.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <Link className="button small" to={`/inspect/${i.id}/tests`}>
                Resume <ArrowRight size={15} />
              </Link>
              <button
                className="icon-button"
                aria-label={`Delete ${i.nickname || "draft inspection"}`}
                onClick={() => setConfirm(i.id)}
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </section>
      )}
      <section className="reports-section">
        <h2>
          Finished inspections <span>{reports.length}</span>
        </h2>
        {!reports.length ? (
          <div className="panel empty-reports">
            <FileCheck2 size={35} />
            <h3>Your first report starts with a closer look.</h3>
            <p>
              Finish an inspection, or import a TESTDRIVE JSON report from
              another device.
            </p>
            <Link className="button primary" to="/">
              Start an inspection <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          reports.map((r) => (
            <div className="saved-row" key={r.reportId}>
              <span className="category-icon">
                <FileCheck2 size={22} />
              </span>
              <div>
                <h3>
                  {r.inspection.nickname || `Your ${r.inspection.deviceClass}`}
                </h3>
                <p>
                  {new Date(r.finalizedAt).toLocaleString()} · Revision{" "}
                  {r.revision} · {counts(r.inspection).completed} checks
                  completed
                </p>
              </div>
              <Link className="button small" to={`/reports/${r.reportId}`}>
                View report <ChevronRight size={15} />
              </Link>
              <button
                className="icon-button"
                aria-label="Delete report"
                onClick={() => setConfirm(r.reportId)}
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))
        )}
      </section>
      <div className="honesty-note">
        <LockKeyhole size={18} />
        <p>
          Reports are local to this browser and may be removed when browser data
          is cleared. Export JSON to keep a portable copy. Downloaded files must
          be deleted separately.
        </p>
        {
          <button
            className="text-button danger"
            onClick={() => setConfirm("all")}
          >
            Clear local data
          </button>
        }
      </div>
      {confirm && (
        <Confirm
          title={
            confirm === "all"
              ? "Clear all local inspection data?"
              : "Delete this local record?"
          }
          body="This removes the selected data from this browser. Any files you downloaded stay on your device."
          onCancel={() => setConfirm(undefined)}
          onConfirm={() => remove(confirm)}
        />
      )}
    </div>
  );
}
function Confirm({
  title,
  body,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <section
        ref={dialog}
        className="confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
          if (e.key === "Tab") {
            const buttons =
              dialog.current?.querySelectorAll<HTMLButtonElement>("button");
            if (!buttons?.length) return;
            const first = buttons[0];
            const last = buttons[buttons.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <button
          className="icon-button modal-close"
          autoFocus
          onClick={onCancel}
          aria-label="Cancel deletion"
        >
          <X size={19} />
        </button>
        <Trash2 size={28} />
        <h2 id="confirm-title">{title}</h2>
        <p>{body}</p>
        <div>
          <button className="button" onClick={onCancel}>
            Keep it
          </button>
          <button className="button danger-button" onClick={onConfirm}>
            Delete local data
          </button>
        </div>
      </section>
    </div>
  );
}
function ReportPage() {
  const { reportId } = useParams();
  const [report, setReport] = useState<ReportSnapshot>();
  const [loaded, setLoaded] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    listReports().then((r) => {
      setReport(r.find((x) => x.reportId === reportId));
      setLoaded(true);
    });
  }, [reportId]);
  if (!loaded) return <Loader />;
  if (!report)
    return (
      <Empty
        title="This report isn’t saved in this browser"
        body="Open Saved reports to import a TESTDRIVE JSON file, or begin a new inspection."
      />
    );
  const i = report.inspection;
  return (
    <div className="page report-page">
      <div className="report-actions no-print">
        <Link to="/reports" className="text-button">
          <ArrowLeft size={16} /> Saved reports
        </Link>
        <div>
          <button className="button" onClick={() => exportReport(report)}>
            <FileJson size={16} />
            Export JSON
          </button>
          <button className="button primary" onClick={() => window.print()}>
            <ArrowDownToLine size={16} />
            Print / Save PDF
          </button>
        </div>
      </div>
      <div className="report-heading">
        <span className="report-brand">
          <ScanLine size={19} />
          TESTDRIVE INSPECTION REPORT
        </span>
        <span className="status success">
          <FileCheck2 size={13} />
          Inspection recorded
        </span>
        <h1>
          {i.nickname ||
            `Your ${i.deviceClass === "unknown" ? "device" : i.deviceClass}`}
        </h1>
        <p>
          {purposes[i.purpose]} ·{" "}
          {new Date(report.finalizedAt).toLocaleString(undefined, {
            timeZoneName: "short",
          })}
        </p>
        <div className="report-meta">
          <span>REPORT #{report.reportId.slice(0, 8).toUpperCase()}</span>
          <span>REVISION {report.revision}</span>
          <span>APP v{i.appVersion}</span>
        </div>
      </div>
      <Summary inspection={i} />
      <Results inspection={i} />
      <section className="panel">
        <h3>Device profile & specifications</h3>
        <HardwareSummary inspection={i} />
        <Facts
          facts={i.profileFacts.filter((f) => f.key !== "inspectionNote")}
        />
        <p className="muted">
          Physical storage capacity and battery wear: not checked. Browser hints
          are qualified observations.
        </p>
      </section>
      {i.sellerClaims.length > 0 && (
        <section className="panel">
          <h3>Seller claim comparison</h3>
          <Comparisons inspection={i} />
        </section>
      )}
      {i.profileFacts.some((f) => f.key === "inspectionNote") && (
        <section className="panel">
          <h3>Inspection notes</h3>
          <p className="note-text">
            {String(
              i.profileFacts.find((f) => f.key === "inspectionNote")?.value,
            )}
          </p>
        </section>
      )}
      <section className="report-limitations">
        <h3>
          <Info size={18} /> What this report means
        </h3>
        <ul>
          {report.limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <p>
          Recorded client time and device information are not proof of
          authenticity. This is an inspection record, not a device
          certification.
        </p>
      </section>
      <div className="bottom-action no-print">
        <button className="text-button danger" onClick={() => setConfirm(true)}>
          <Trash2 size={15} />
          Delete this inspection
        </button>
        <Link className="button" to="/">
          Inspect another device <Plus size={16} />
        </Link>
      </div>
      {confirm && (
        <Confirm
          title="Delete this inspection and its reports?"
          body="All local revisions for this inspection will be removed. Downloaded files are separate."
          onCancel={() => setConfirm(false)}
          onConfirm={async () => {
            const related = (await listReports()).filter(
              (r) => r.inspection.id === i.id,
            );
            await Promise.all(related.map((r) => deleteReport(r.reportId)));
            await deleteInspection(i.id);
            navigate("/reports");
          }}
        />
      )}
    </div>
  );
}

function About() {
  const { start, busy } = useStart();
  return (
    <div className="page prose-page">
      <PageHeading
        eyebrow="A LITTLE MORE CLARITY"
        title="Know what you’re getting."
        description="TESTDRIVE helps you inspect a device with real browser observations and guided checks you complete yourself."
      />
      <section className="panel">
        <h2>Three steps to an informed decision.</h2>
        <ol className="about-steps">
          <li>
            <strong>Start on the device you want to inspect.</strong> We collect
            available browser information without requesting camera or
            microphone access.
          </li>
          <li>
            <strong>Run the checks that matter to you.</strong> Try inputs,
            camera, audio, and display. Short processing and graphics samples
            record this session’s behavior.
          </li>
          <li>
            <strong>Keep an understandable record.</strong> See observations,
            your own confirmations, attention items, and unknowns. Export JSON
            or use Print / Save PDF.
          </li>
        </ol>
      </section>
      <section className="panel">
        <h2>Honest results. Useful boundaries.</h2>
        <p>
          “Observed” means a specific event or measurement was recorded. “You
          confirmed” means you inspected or listened and answered positively.
          “Needs attention” records something to investigate. “Not checked” and
          “Not sure” keep uncertainty visible.
        </p>
        <p>
          A website cannot fully test internal hardware, prove ownership,
          measure battery wear, or guarantee a good purchase. Performance
          depends on the browser, power mode, background activity, and
          environment.
        </p>
        <p>
          Exact Windows specifications can be added using an English System
          Information text export. Fields are labeled as imported and can be
          compared with specific seller claims. The report does not prove the
          imported file belongs to the inspected device.
        </p>
      </section>
      <section className="panel">
        <h2>Built for modern browsers.</h2>
        <p>
          Designed for current Chrome, Edge, Firefox, Safari, Android Chrome,
          and iPhone/iPad Safari. Available checks depend on browser support and
          permissions. Real-device verification is recorded in the project’s
          release documentation; responsive emulation does not establish
          physical hardware behavior.
        </p>
        <p>
          TESTDRIVE is built with React, TypeScript, Vite, and Lucide icons. No
          AI model, account, or paid service is required to run an inspection.
        </p>
      </section>
      <button
        className="button primary"
        disabled={busy}
        onClick={() => start()}
      >
        Start inspection <ArrowRight size={17} />
      </button>
    </div>
  );
}
function Privacy() {
  return (
    <div className="page prose-page">
      <PageHeading
        eyebrow="YOUR DEVICE. YOUR DATA."
        title="Private by design."
        description="Your inspection data stays in your browser. Here’s exactly what that means."
      />
      {[
        [
          "What is stored",
          "TESTDRIVE saves normalized device observations, test attempts, your answers, short notes, and finished reports in this browser’s IndexedDB. Your chosen keyboard profile is remembered in localStorage for future inspections; it does not identify hardware. Random inspection IDs do not identify you. If storage is unavailable, inspection data stays in memory for this visit and may be lost on refresh.",
        ],
        [
          "Camera, microphone, and imports",
          "Access starts only from a button you press in the relevant test. Captures and short recordings are held in memory and discarded when you leave the test. They are not included in reports. System reports are parsed locally; the raw file is not stored. Only allowlisted specification fields are retained.",
        ],
        [
          "What reaches a server",
          "The hosting provider receives ordinary page requests and may keep access logs. TESTDRIVE does not send your inspection data, imported files, recordings, captures, or normalized profile to an application backend. No advertising trackers, analytics, or model API calls are included.",
        ],
        [
          "Retention and deletion",
          "Finished local records remain until you delete them or the browser clears its data. Local browser storage is not a permanent backup. Use Saved reports to delete individual records or clear all local data. Exported files are separate copies; delete them yourself if needed.",
        ],
        [
          "Moving your report",
          "Export JSON and import that file in another browser to move a report. Print / Save PDF uses your browser’s print service. Opening this site on another device does not automatically transfer records.",
        ],
      ].map(([title, text]) => (
        <section className="panel" key={title}>
          <h2>{title}</h2>
          <p>{text}</p>
        </section>
      ))}
      <Link className="button" to="/reports">
        Manage local reports <ArrowRight size={16} />
      </Link>
    </div>
  );
}
