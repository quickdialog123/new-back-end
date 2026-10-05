import { UserRole } from '@quickdialog/generated/prisma/client.js';
import { z } from 'zod';

export const jwtPayloadSchema = z.object({
  sub: z.string().min(1),
  sid: z.string().uuid(),
  hotelId: z.string().uuid().nullable(),
  role: z.enum(UserRole),
});

export type JwtPayload = z.infer<typeof jwtPayloadSchema>;
