/** Telegram Bot API HTML: escape dynamic text so <b> etc. in names do not break markup. */
export function escapeTelegramHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export type SpendAlertMessageKind = "first" | "escalation";

type FormatSpendAlertParams = {
  projectName: string;
  /** UTC calendar day the estimate applies to. */
  targetDayUtc: Date;
  spendUsd: number;
  thresholdUsd: number;
  kind: SpendAlertMessageKind;
  /** Spend at last notification; required when `kind` is `escalation`. */
  previousNotifiedSpendUsd?: number;
};

function formatMoney(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatUtcDayLabel(d: Date): string {
  return `Day ${String(d.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Compact HTML body for Telegram (`parse_mode: HTML`). Only the project name uses `<b>`.
 */
export function formatSpendAlertTelegramHtml(p: FormatSpendAlertParams): string {
  const nameBold = `<b>${escapeTelegramHtml(p.projectName)}</b>`;
  const day = escapeTelegramHtml(formatUtcDayLabel(p.targetDayUtc));
  const spend = formatMoney(p.spendUsd);
  const limit = formatMoney(p.thresholdUsd);

  let body =
    `Neon\n\n` +
    `📦 ${nameBold}\n\n` +
    `📅 ${day}\n\n` +
    `💵 Estimated ${spend}\n\n` +
    `🎯 Limit ${limit}`;

  if (p.kind === "escalation" && p.previousNotifiedSpendUsd !== undefined) {
    const delta = p.spendUsd - p.previousNotifiedSpendUsd;
    const deltaFmt = formatMoney(Math.max(0, delta));
    body += `\n\n↑ ${deltaFmt} since last alert`;
  }

  return body;
}
