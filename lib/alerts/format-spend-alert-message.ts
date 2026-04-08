/** Telegram Bot API HTML: escape dynamic text so <b> etc. in names do not break markup. */
export function escapeTelegramHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

type FormatSpendAlertParams = {
  projectName: string;
  neonProjectId: string;
  utcDateIso: string;
  spendUsd: number;
  thresholdUsd: number;
  pricingPlan: string;
  thresholdSource: "project" | "default";
  dashboardUrl: string | null;
};

function formatMoney(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Rich HTML body for Telegram (parse_mode: HTML). Labels in English to match the dashboard.
 */
export function formatSpendAlertTelegramHtml(p: FormatSpendAlertParams): string {
  const name = escapeTelegramHtml(p.projectName);
  const id = escapeTelegramHtml(p.neonProjectId);
  const plan = escapeTelegramHtml(p.pricingPlan);
  const date = escapeTelegramHtml(p.utcDateIso);

  const spend = formatMoney(p.spendUsd);
  const limit = formatMoney(p.thresholdUsd);
  const over = p.spendUsd - p.thresholdUsd;
  const overFmt = formatMoney(over);
  const pct =
    p.thresholdUsd > 0
      ? ((over / p.thresholdUsd) * 100).toFixed(1).replace(/\.0$/, "")
      : "—";

  const sourceLine =
    p.thresholdSource === "project"
      ? "<i>Limit: custom (this project)</i>"
      : "<i>Limit: org default from env</i>";

  const linkBlock =
    p.dashboardUrl !== null
      ? `\n\n<a href="${escapeTelegramHtml(p.dashboardUrl)}">Open usage dashboard</a>`
      : "";

  return (
    `🚨 <b>Neon — spend above threshold</b>\n\n` +
    `📦 <b>Project</b>\n` +
    `${name}\n` +
    `<code>${id}</code>\n\n` +
    `📅 <b>Day (UTC)</b>\n` +
    `${date}\n\n` +
    `💵 <b>Estimated cost (that day)</b>\n` +
    `${spend}\n\n` +
    `🎯 <b>Your alert limit</b>\n` +
    `${limit}\n` +
    `${sourceLine}\n\n` +
    `📈 <b>Over limit</b>\n` +
    `${overFmt}` +
    (pct !== "—" ? ` <i>(+${pct}% vs limit)</i>` : "") +
    `\n\n` +
    `⚙️ Neon pricing plan: <code>${plan}</code>` +
    linkBlock
  );
}
