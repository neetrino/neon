import { logger } from "@/lib/logger";

type SendParams = {
  botToken: string;
  chatId: string;
  text: string;
};

/**
 * Sends a plain-text Telegram message via Bot API.
 */
export async function sendTelegramMessage(params: SendParams): Promise<void> {
  const url = `https://api.telegram.org/bot${params.botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: params.chatId,
      text: params.text,
      disable_web_page_preview: true,
    }),
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
