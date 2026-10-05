import type { UserRole } from '@quickdialog/generated/prisma/client.js';

export type AuthenticatedUser = {
  userId: string;
  sessionId: string;
  hotelId: string | null;
  role: UserRole;
};
