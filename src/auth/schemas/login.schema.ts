import { z } from 'zod';

export const loginRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const loginResponseSchema = z.object({
  accessToken: z.string(),
});

export type LoginDTO = z.infer<typeof loginRequestSchema>;

export type LoginResponse = z.infer<typeof loginResponseSchema>;
