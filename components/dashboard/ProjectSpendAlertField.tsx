"use client";

import { useCallback, useMemo, useState } from "react";
import { escalationStepUsd } from "@/lib/constants/spend-alert-default";

/** Upper bound for per-project Telegram spend threshold (USD). */
const SPEND_ALERT_USD_MAX = 1_000_000;

type ProjectSpendAlertFieldProps = {
  neonProjectId: string;
  spendAlertThresholdUsd: number | null;
  /** Null = use org default from env. */
  spendAlertEscalationPercentOfThreshold: number | null;
  orgDefaultSpendAlertUsd: number;
  orgDefaultEscalationPercent: number;
  onSaved: () => void;
};

function parseUsdPayload(trimmed: string): { ok: true; value: number | null } | { ok: false; error: string } {
  if (trimmed === "") {
    return { ok: true, value: null };
  }
  const n = Number.parseFloat(trimmed.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, error: "Limit: positive number or empty for org default." };
  }
  if (n > SPEND_ALERT_USD_MAX) {
    return { ok: false, error: `Limit max $${SPEND_ALERT_USD_MAX.toLocaleString("en-US")}.` };
  }
  return { ok: true, value: n };
}

function parsePctPayload(trimmed: string): { ok: true; value: number | null } | { ok: false; error: string } {
  if (trimmed === "") {
    return { ok: true, value: null };
  }
  const n = Number.parseFloat(trimmed.replace(",", "."));
  if (!Number.isFinite(n) || n < 0.1 || n > 100) {
    return { ok: false, error: "Escalation %: 0.1–100 or empty for org default." };
  }
  return { ok: true, value: n };
}

export function ProjectSpendAlertField({
  neonProjectId,
  spendAlertThresholdUsd,
  spendAlertEscalationPercentOfThreshold,
  orgDefaultSpendAlertUsd,
  orgDefaultEscalationPercent,
  onSaved,
}: ProjectSpendAlertFieldProps) {
  const [usd, setUsd] = useState(
    spendAlertThresholdUsd === null ? "" : String(spendAlertThresholdUsd),
  );
  const [pct, setPct] = useState(
    spendAlertEscalationPercentOfThreshold === null
      ? ""
      : String(spendAlertEscalationPercentOfThreshold),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewLimitUsd = useMemo(() => {
    const t = usd.trim();
    if (t === "") {
      return orgDefaultSpendAlertUsd;
    }
    const n = Number.parseFloat(t.replace(",", "."));
    if (Number.isFinite(n) && n > 0 && n <= SPEND_ALERT_USD_MAX) {
      return n;
    }
    return spendAlertThresholdUsd ?? orgDefaultSpendAlertUsd;
  }, [usd, spendAlertThresholdUsd, orgDefaultSpendAlertUsd]);

  const previewEscalationPct = useMemo(() => {
    const t = pct.trim();
    if (t === "") {
      return orgDefaultEscalationPercent;
    }
    const n = Number.parseFloat(t.replace(",", "."));
    if (Number.isFinite(n) && n >= 0.1 && n <= 100) {
      return n;
    }
    return spendAlertEscalationPercentOfThreshold ?? orgDefaultEscalationPercent;
  }, [pct, spendAlertEscalationPercentOfThreshold, orgDefaultEscalationPercent]);

  const escalationStep = useMemo(
    () => escalationStepUsd(previewLimitUsd, previewEscalationPct),
    [previewLimitUsd, previewEscalationPct],
  );

  const save = useCallback(async () => {
    setError(null);
    const usdParsed = parseUsdPayload(usd.trim());
    if (!usdParsed.ok) {
      setError(usdParsed.error);
      return;
    }
    const pctParsed = parsePctPayload(pct.trim());
    if (!pctParsed.ok) {
      setError(pctParsed.error);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/usage/projects/${encodeURIComponent(neonProjectId)}/spend-alert`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spendAlertThresholdUsd: usdParsed.value,
          spendAlertEscalationPercentOfThreshold: pctParsed.value,
        }),
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
  }, [neonProjectId, onSaved, pct, usd]);

  return (
    <div className="flex min-w-[9rem] flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <span className="text-zinc-400" aria-hidden>
          $
        </span>
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-label={`Telegram alert limit USD for project ${neonProjectId}`}
          placeholder={`${orgDefaultSpendAlertUsd}`}
          value={usd}
          onChange={(e) => setUsd(e.target.value)}
          className="w-[4.25rem] rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-right font-mono text-xs text-zinc-800 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        <span className="text-[10px] text-zinc-400" aria-hidden>
          %
        </span>
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-label={`Escalation percent of limit for project ${neonProjectId}`}
          placeholder={`${orgDefaultEscalationPercent}`}
          value={pct}
          onChange={(e) => setPct(e.target.value)}
          className="w-11 rounded border border-zinc-200 bg-white px-1 py-0.5 text-right font-mono text-xs text-zinc-800 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
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
      {error ? <p className="max-w-[14rem] text-right text-[10px] text-red-600">{error}</p> : null}
      <p className="text-[10px] text-zinc-400" title="Empty fields use org defaults from env">
        defaults ${orgDefaultSpendAlertUsd} · {orgDefaultEscalationPercent}%
      </p>
      <p
        className="max-w-[14rem] text-right text-[10px] leading-snug text-zinc-400"
        title="Same UTC day: further alerts when spend rises by at least this % of this row’s limit."
      >
        +{previewEscalationPct}% of limit ≈ ${escalationStep.toFixed(2)} step
      </p>
    </div>
  );
}
