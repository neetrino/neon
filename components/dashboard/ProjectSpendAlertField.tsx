"use client";

import { useCallback, useState } from "react";

/** Upper bound for per-project Telegram spend threshold (USD). */
const SPEND_ALERT_USD_MAX = 1_000_000;

type ProjectSpendAlertFieldProps = {
  neonProjectId: string;
  spendAlertThresholdUsd: number | null;
  defaultSpendAlertUsd: number;
  onSaved: () => void;
};

export function ProjectSpendAlertField({
  neonProjectId,
  spendAlertThresholdUsd,
  defaultSpendAlertUsd,
  onSaved,
}: ProjectSpendAlertFieldProps) {
  const [value, setValue] = useState(
    spendAlertThresholdUsd === null ? "" : String(spendAlertThresholdUsd),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(async () => {
    setError(null);
    const trimmed = value.trim();
    const payload =
      trimmed === ""
        ? { spendAlertThresholdUsd: null as number | null }
        : { spendAlertThresholdUsd: Number.parseFloat(trimmed.replace(",", ".")) };

    if (payload.spendAlertThresholdUsd !== null) {
      const n = payload.spendAlertThresholdUsd;
      if (!Number.isFinite(n) || n <= 0) {
        setError("Use a positive number or leave empty for default.");
        return;
      }
      if (n > SPEND_ALERT_USD_MAX) {
        setError(`Maximum is $${SPEND_ALERT_USD_MAX.toLocaleString("en-US")}.`);
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/usage/projects/${encodeURIComponent(neonProjectId)}/spend-alert`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || res.statusText);
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [neonProjectId, onSaved, value]);

  return (
    <div className="flex min-w-[7.5rem] flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <span className="text-zinc-400" aria-hidden>
          $
        </span>
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-label={`Telegram alert threshold for project ${neonProjectId}`}
          placeholder={`${defaultSpendAlertUsd}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-20 rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-right font-mono text-xs text-zinc-800 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-700 hover:bg-zinc-200 disabled:opacity-50"
        >
          {saving ? "…" : "Set"}
        </button>
      </div>
      {error ? <p className="max-w-[12rem] text-right text-[10px] text-red-600">{error}</p> : null}
      <p className="text-[10px] text-zinc-400" title="Empty = org default from env">
        default ${defaultSpendAlertUsd}
      </p>
    </div>
  );
}
