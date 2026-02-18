import TelegramBot from "node-telegram-bot-api";

export interface Command {
  pattern: RegExp;
  execute(bot: TelegramBot, msg: TelegramBot.Message, match: RegExpMatchArray | null): Promise<void>;
}

export interface MessageHandler {
  shouldHandle(msg: TelegramBot.Message): boolean | Promise<boolean>;
  handle(bot: TelegramBot, msg: TelegramBot.Message): Promise<void>;
}

export interface CallbackHandler {
  prefix: string;
  handle(bot: TelegramBot, query: TelegramBot.CallbackQuery, data: string): Promise<void>;
}
