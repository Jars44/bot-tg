/**
 * Database type definitions
 */

export interface Reminder {
  id: string;
  chatId: number;
  time: string; // Format: "HH:mm"
  message: string;
  createdAt: number;
}

export interface UserRateLimit {
  userId: number;
  stickerCount: number;
  lastReset: number;
}

export interface DatabaseSchema {
  reminders: Reminder[];
  rateLimits: UserRateLimit[];
}
