import { useState } from "react";
import { CheckCircle2, Clipboard, Keyboard, Search } from "lucide-react";
import { DEVICE_PROFILES, matchDeviceProfile } from "./catalog";
import {
  chooseInspectionProfile,
  inspectionProfile,
  rememberKeyboardProfile,
} from "./selection";
import type { Inspection } from "../types";

const modelCommand = "(Get-CimInstance -ClassName Win32_ComputerSystem).Model";
export function DeviceProfilePanel({
  inspection,
  onChange,
}: {
  inspection: Inspection;
  onChange: (next: Inspection) => void;
}) {
  const [model, setModel] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const profile = inspectionProfile(inspection);
  const manual = inspection.profileFacts.some(
    (f) => f.key === "keyboard_profile_id",
  );
  const match = matchDeviceProfile("", model);
  const select = (id: string) => {
    rememberKeyboardProfile(id);
    onChange(chooseInspectionProfile(inspection, id));
    setMessage("");
  };
  return (
    <section className="panel device-profile-panel">
      <div className="panel-title">
        <h3>
          <Keyboard size={19} /> Match your laptop keyboard
        </h3>
        <span className="subtle-chip">English · US</span>
      </div>
      <p>
        Choose your laptop once. A supported Windows system report can also
        match the model automatically.
      </p>
      <label className="field-label" htmlFor="device-catalog-profile">
        Laptop or keyboard profile
      </label>
      <select
        id="device-catalog-profile"
        value={profile?.id ?? ""}
        onChange={(e) => select(e.target.value)}
      >
        <option value="">Match from imported specifications</option>
        <option value="generic-ansi-us">
          Standard US keyboard / another model
        </option>
        {DEVICE_PROFILES.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <small className="file-hint">
        Your choice is remembered in this browser for the next inspection.
        Change it when testing a different keyboard.
      </small>
      {profile && (
        <div className="profile-match">
          <CheckCircle2 size={19} />
          <div>
            <strong>{profile.name}</strong>
            <p>
              {manual
                ? "You selected this layout."
                : "Matched to your imported system model."}{" "}
              This selects key positions, not installed RAM or CPU.
            </p>
          </div>
        </div>
      )}
      <details className="model-lookup">
        <summary>
          <Search size={15} /> Find my Windows laptop model
        </summary>
        <p>
          Windows doesn’t share your exact laptop name with websites. This
          read-only command shows the model without serial numbers.
        </p>
        <ol>
          <li>
            Open <strong>PowerShell</strong> from the Windows Start menu.
          </li>
          <li>Paste this command and press Enter.</li>
          <li>Paste the model it prints below. We’ll look it up locally.</li>
        </ol>
        <code>{modelCommand}</code>
        <button
          className="button small"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(modelCommand);
              setCopied(true);
            } catch {
              setMessage("Select the command above and copy it manually.");
            }
          }}
        >
          <Clipboard size={14} />{" "}
          {copied ? "Command copied" : "Copy model command"}
        </button>
        <label className="field-label" htmlFor="model-lookup-value">
          Model from your computer
        </label>
        <input
          id="model-lookup-value"
          maxLength={200}
          value={model}
          placeholder="e.g. ASUS Zenbook Duo UX8406CA_UX8406CA"
          onChange={(e) => {
            setModel(e.target.value);
            setMessage("");
          }}
        />
        {model.trim() && (
          <p className="lookup-status" role="status">
            {match
              ? `Found: ${match.profile.name}`
              : "No exact match yet. Choose a standard US layout, or add a system report for more details."}
          </p>
        )}
        {match && (
          <button
            className="button primary small"
            onClick={() => {
              select(match.profile.id);
              setMessage(`Selected ${match.profile.name}.`);
            }}
          >
            Use this keyboard <CheckCircle2 size={15} />
          </button>
        )}
        {message && <p role="status">{message}</p>}
      </details>
      {profile && (
        <details className="profile-reference">
          <summary>About this reference profile</summary>
          <ul>
            {profile.summary.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
          <p>{profile.keyboard.note}</p>
          <p>
            Manufacturer references:{" "}
            {profile.sources.map((source, index) => (
              <span key={source.url}>
                {index > 0 ? " · " : ""}
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.title}
                </a>
              </span>
            ))}
          </p>
        </details>
      )}
    </section>
  );
}
