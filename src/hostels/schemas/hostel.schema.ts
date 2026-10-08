import { z } from 'zod';

export const createHostelSchema = z.object({
  name: z.string().trim().min(1),
  phoneNumber: z.string().trim().min(1),
  token: z.string().trim().min(1),
});

export type CreateHostelDTO = z.infer<typeof createHostelSchema>;
