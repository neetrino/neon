import { logger } from "@/lib/logger";

type SendParams = {
  botToken: string;
  chatId: string;
  text: string;
  /** When set, `text` must follow Telegram HTML rules (entities escaped where needed). */
  parseMode?: "HTML";
};

/**
 * Sends a Telegram message via Bot API (plain text or HTML).
 */
export async function sendTelegramMessage(params: SendParams): Promise<void> {
  const url = `https://api.telegram.org/bot${params.botToken}/sendMessage`;
  const body: Record<string, unknown> = {
    chat_id: params.chatId,
    text: params.text,
    disable_web_page_preview: true,
  };
  if (params.parseMode) {
    body.parse_mode = params.parseMode;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram API ${res.status}: ${body}`);
  }

  const json = (await res.json()) as { ok?: boolean; description?: string };
  if (!json.ok) {
    logger.error({ description: json.description }, "Telegram sendMessage returned ok=false");
    throw new Error(json.description ?? "Telegram sendMessage failed");
  }
}
