import { useCallback, useEffect, useRef, useState } from "react";
import type {
  DeviceClass,
  ExecutionStatus,
  TestAttempt,
  TestId,
} from "../../types";
import { KeyboardTest, PointerTest, TouchTest } from "./InputTests";
import { CameraTest, MicrophoneTest } from "./MediaTests";
import { DisplayTest, SpeakerTest } from "./OutputTests";
import { PowerTest } from "./PowerTest";
import { fact, uid } from "./shared";
import type { Evidence } from "./shared";
import "./workbench.css";

interface Props {
  testId: TestId;
  onComplete: (attempt: TestAttempt) => void;
  onProgress?: (attempt: TestAttempt) => void;
  onExit: () => void;
  deviceClass: DeviceClass;
  profileId?: string;
  onProfileChange?: (id: string) => void;
  continueLabel?: string;
}
const definitions: Partial<
  Record<
    TestId,
    {
      title: string;
      eyebrow: string;
      prompt: string;
      component: typeof KeyboardTest;
    }
  >
> = {
  "KEY-01": {
    title: "Press your keyboard’s keys.",
    eyebrow: "Keyboard check",
    prompt: "Did the keys you tested respond as expected?",
    component: KeyboardTest,
  },
  "PTR-01": {
    title: "Follow the mouse challenge.",
    eyebrow: "Mouse & trackpad check",
    prompt: "Did your pointer, buttons and scrolling feel right?",
    component: PointerTest,
  },
  "TOUCH-01": {
    title: "Touch each square.",
    eyebrow: "Touchscreen check",
    prompt: "Did the touch areas and gestures you tested respond correctly?",
    component: TouchTest,
  },
  "CAM-01": {
    title: "Let’s check your camera.",
    eyebrow: "Camera check",
    prompt: "Does the camera picture look clear, without visible issues?",
    component: CameraTest,
  },
  "MIC-01": {
    title: "Say a short phrase.",
    eyebrow: "Microphone check",
    prompt: "After playback, did your voice sound clear?",
    component: MicrophoneTest,
  },
  "SPK-01": {
    title: "Listen to the test sounds.",
    eyebrow: "Speaker check",
    prompt:
      "Did the sound you heard seem clear and come from the intended output?",
    component: SpeakerTest,
  },
  "DISP-01": {
    title: "Look for spots or uneven colors.",
    eyebrow: "Display check",
    prompt:
      "Did the patterns look even, without persistent dots or discoloration?",
    component: DisplayTest,
  },
  "PWR-01": {
    title: "Check battery and power.",
    eyebrow: "Battery & charger check",
    prompt: "Did the charger connect as expected?",
    component: PowerTest,
  },
};
export function TestWorkbench(props: Props) {
  return <TestSession key={props.testId} {...props} />;
}
function TestSession({
  testId,
  onComplete,
  onProgress,
  onExit,
  deviceClass,
  profileId,
  onProfileChange,
  continueLabel = "Save result",
}: Props) {
  const [evidence, setEvidence] = useState<Evidence>({ facts: [] });
  const [note, setNote] = useState("");
  const [answer, setAnswer] = useState<TestAttempt["humanAnswer"]>();
  const started = useRef(new Date().toISOString());
  const attemptId = useRef(uid());
  const finished = useRef(false);
  const mounted = useRef(true);
  const progressCallback = useRef(onProgress);
  progressCallback.current = onProgress;
  const currentEvidence = useRef(evidence);
  const noteRef = useRef(note);
  noteRef.current = note;
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProgress = useRef(0);
  const progressAttempt = useCallback(
    (status: ExecutionStatus): TestAttempt => {
      const current = currentEvidence.current;
      return {
        id: attemptId.current,
        testId,
        testVersion: "1.1.0",
        status: status === "running" ? (current.status ?? status) : status,
        startedAt: started.current,
        ...(status === "interrupted"
          ? { endedAt: new Date().toISOString() }
          : {}),
        facts: current.facts,
        finding: "not_assessed",
        reasonCode:
          current.reason ??
          (status === "interrupted" ? "left_before_assessment" : undefined),
        explanation:
          status === "interrupted"
            ? "You left this check before a final assessment. Partial browser observations are retained."
            : current.status
              ? (current.explanation ??
                "This check could not finish in the current browser environment.")
              : "This hands-on check is in progress. Its physical condition has not been assessed.",
        ...(noteRef.current.trim() ? { note: noteRef.current.trim() } : {}),
      };
    },
    [testId],
  );
  const receive = useCallback(
    (next: Evidence) => {
      currentEvidence.current = next;
      setEvidence(next);
      if (!next.ready || next.status)
        setAnswer((previous) =>
          previous === "looks_good" ? undefined : previous,
        );
      if (
        finished.current ||
        progressTimer.current ||
        !progressCallback.current
      )
        return;
      progressTimer.current = setTimeout(
        () => {
          progressTimer.current = null;
          if (finished.current || !mounted.current) return;
          lastProgress.current = performance.now();
          progressCallback.current?.(progressAttempt("running"));
        },
        Math.max(0, 700 - (performance.now() - lastProgress.current)),
      );
    },
    [progressAttempt],
  );
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (progressTimer.current) {
        clearTimeout(progressTimer.current);
        progressTimer.current = null;
      }
      // React Strict Mode immediately replays effects. Defer to distinguish that
      // replay from a real departure, while retaining the latest callback.
      queueMicrotask(() => {
        if (
          !mounted.current &&
          !finished.current &&
          currentEvidence.current.facts.length
        )
          progressCallback.current?.(progressAttempt("interrupted"));
      });
    };
  }, [progressAttempt]);
  useEffect(() => {
    if (!note || finished.current || !progressCallback.current) return;
    const timer = setTimeout(() => {
      if (!finished.current && mounted.current) {
        lastProgress.current = performance.now();
        progressCallback.current?.(progressAttempt("running"));
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [note, progressAttempt]);
  const definition = definitions[testId];
  if (!definition)
    return (
      <div className="td-workbench">
        <p>This check runs as part of the automatic scan.</p>
        <button onClick={onExit}>Return to inspection</button>
      </div>
    );
  const Module = definition.component;
  function finish(status: ExecutionStatus = "completed") {
    if (finished.current) return;
    finished.current = true;
    if (progressTimer.current) {
      clearTimeout(progressTimer.current);
      progressTimer.current = null;
    }
    const human = status === "completed" ? answer : undefined;
    const actualStatus =
      status === "completed" && evidence.status ? evidence.status : status;
    const humanFact = human
      ? [
          fact(
            "human.answer",
            "Your assessment",
            human === "looks_good"
              ? "Looks / sounds right"
              : human === "issue"
                ? "I noticed a problem"
                : "Not sure",
            undefined,
            "user_confirmed",
          ),
        ]
      : [];
    onComplete({
      id: attemptId.current,
      testId,
      testVersion: "1.1.0",
      status: actualStatus,
      startedAt: started.current,
      endedAt: new Date().toISOString(),
      facts: [...evidence.facts, ...humanFact],
      finding:
        human === "issue" ||
        (evidence.automatic?.attention && actualStatus === "completed")
          ? "attention"
          : (human === "looks_good" ||
                (evidence.automatic?.complete && human !== "not_sure")) &&
              actualStatus === "completed"
            ? "observed"
            : "not_assessed",
      ...(human ? { humanAnswer: human } : {}),
      ...(evidence.reason
        ? { reasonCode: evidence.reason }
        : status === "skipped"
          ? { reasonCode: "user_skipped" }
          : status === "interrupted"
            ? { reasonCode: "user_left_test" }
            : {}),
      explanation:
        status === "skipped"
          ? "You skipped this check. Any observations already received are retained."
          : status === "interrupted"
            ? "The check ended before a final assessment. Any observations already received are retained."
            : (evidence.explanation ??
              "A hands-on check was completed with your assessment."),
      nextStep:
        human === "issue" || evidence.automatic?.attention
          ? "Repeat the check, confirm your input or output source, and discuss a persistent issue with the seller or a repair professional."
          : human === "not_sure"
            ? "Repeat this check or ask someone to help assess it."
            : actualStatus !== "completed"
              ? "Review the stated browser or permission limitation and retry if appropriate."
              : undefined,
      ...(note.trim() ? { note: note.trim() } : {}),
    });
  }
  return (
    <section
      className="td-workbench"
      aria-label={definition.eyebrow}
      data-device-class={deviceClass}
    >
      <header className="td-workbench-heading">
        <div>
          <span className="td-eyebrow">{definition.eyebrow}</span>
          <h2>{definition.title}</h2>
        </div>
        <button
          className="td-close"
          aria-label="Close test and preserve partial observations"
          onClick={() =>
            evidence.facts.length ? finish("interrupted") : onExit()
          }
        >
          ×
        </button>
      </header>
      <Module
        onChange={receive}
        profileId={profileId}
        onProfileChange={onProfileChange}
        onConfirmAssessment={setAnswer}
      />
      {evidence.automatic?.complete && !evidence.status && (
        <div
          className={`td-automatic-result ${evidence.automatic.attention ? "attention" : ""}`}
          role="status"
        >
          <strong>
            {evidence.automatic.attention
              ? "Something needs a closer look"
              : "Your result is ready"}
          </strong>
          <p>{evidence.automatic.summary}</p>
          <small>
            You can continue now. Add your own assessment below if you noticed a
            problem.
          </small>
        </div>
      )}
      <details className="td-assessment" open={!evidence.automatic}>
        <summary>
          {evidence.automatic
            ? "Add your feedback (optional)"
            : "How did it look or feel?"}
        </summary>
        <h3>{definition.prompt}</h3>
        <p>
          Your answer is recorded separately from the browser’s observations.
        </p>
        <div className="td-answer-options">
          <button
            className={answer === "looks_good" ? "selected" : ""}
            disabled={!evidence.ready || !!evidence.status}
            onClick={() => setAnswer("looks_good")}
          >
            ✓ Looks / sounds right
          </button>
          <button
            className={answer === "issue" ? "selected issue" : ""}
            onClick={() => setAnswer("issue")}
          >
            ! I noticed a problem
          </button>
          <button
            className={answer === "not_sure" ? "selected" : ""}
            onClick={() => setAnswer("not_sure")}
          >
            ? Not sure
          </button>
        </div>
        <details className="td-note-details">
          <summary>Add a note</summary>
          <label className="td-note-label">
            Optional note
            <textarea
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything you want to remember about this check"
              rows={2}
            />
          </label>
        </details>
      </details>
      {evidence.automatic &&
        !evidence.automatic.complete &&
        evidence.ready &&
        !answer && (
          <p className="td-save-hint">
            Some input was received. Finish the remaining steps, or add your
            feedback above to save a partial check. You can also skip for now.
          </p>
        )}
      <footer className="td-workbench-footer">
        <button onClick={() => finish("skipped")}>Skip this check</button>
        <button
          className="primary"
          disabled={
            (!answer && (!evidence.automatic?.complete || !!evidence.status)) ||
            (answer === "looks_good" && (!evidence.ready || !!evidence.status))
          }
          onClick={() => finish()}
        >
          {continueLabel} <span aria-hidden="true">→</span>
        </button>
      </footer>
    </section>
  );
}
export default TestWorkbench;
