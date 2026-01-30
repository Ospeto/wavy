import * as dotenv from "dotenv";

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try loading .env from current directory, then root
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: Number(process.env.PORT ?? 3000),
  // Remnawave
  remnawaveApiUrl: process.env.REMNAWAVE_API_URL ?? "https://rempanel.yamoe.xyz",
  remnawaveApiKey: process.env.REMNAWAVE_API_KEY ?? "",
  // Gemini
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  // Telegram Bot
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  adminUserIds: (process.env.ADMIN_USER_IDS ?? "").split(",").map(id => id.trim()).filter(id => id !== "")
};

export function assertConfig() {
  if (!config.remnawaveApiKey) {
    throw new Error("REMNAWAVE_API_KEY is not set");
  }
  if (!config.telegramBotToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set");
  }
  if (!config.geminiApiKey) {
    console.warn("GEMINI_API_KEY is not set – verification will not work");
  }
}