/** Default USD threshold when `TELEGRAM_SPEND_ALERT_DEFAULT_USD` is unset and project has no override. */
export const DEFAULT_TELEGRAM_SPEND_ALERT_USD = 1;

/**
 * Default percent of the per-project alert limit used as the minimum spend increase for each
 * further Telegram alert the same UTC day (see `SPEND_ALERT_ESCALATION_PERCENT_OF_THRESHOLD`).
 */
export const DEFAULT_SPEND_ALERT_ESCALATION_PERCENT_OF_THRESHOLD = 30;

/** Minimum USD increase before another alert = `thresholdUsd * (percent / 100)`. */
export function escalationStepUsd(thresholdUsd: number, percentOfThreshold: number): number {
  return thresholdUsd * (percentOfThreshold / 100);
}
