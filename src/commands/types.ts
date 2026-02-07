/**
 * Command handler type definitions
 */

import TelegramBot from "node-telegram-bot-api";

/**
 * Command interface for the Command Pattern
 */
export interface Command {
  /** Regex pattern to match the command */
  pattern: RegExp;

  /** Execute the command */
  execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void>;
}

/**
 * Message handler interface (for non-command messages)
 */
export interface MessageHandler {
  /** Check if this handler should process the message */
  shouldHandle(msg: TelegramBot.Message): boolean;

  /** Handle the message */
  handle(bot: TelegramBot, msg: TelegramBot.Message): Promise<void>;
}

/**
 * Callback query handler for inline buttons
 */
export interface CallbackHandler {
  /** Prefix for callback data this handler responds to */
  prefix: string;

  /** Handle the callback query */
  handle(bot: TelegramBot, query: TelegramBot.CallbackQuery, data: string): Promise<void>;
}
