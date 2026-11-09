import { UserRole } from '@quickdialog/generated/prisma/client.js';
import { z } from 'zod';

const jwtPayloadBaseSchema = z.object({
  sub: z.string().min(1),
  sid: z.string().uuid(),
});

export const jwtPayloadSchema = z.union([
  jwtPayloadBaseSchema.extend({
    hotelId: z.string().uuid().nullable(),
    role: z.literal(UserRole.SUPER_ADMIN),
  }),
  jwtPayloadBaseSchema.extend({
    hotelId: z.string().uuid(),
    role: z.enum([
      UserRole.OWNER,
      UserRole.STAFF,
      UserRole.CLIENT,
      UserRole.AUTHORITY,
    ]),
  }),
]);

export type JwtPayload = z.infer<typeof jwtPayloadSchema>;
