import { z } from 'zod';

export const completeEmbeddedSignupSchema = z.object({
  code: z.string().min(1),
  wabaId: z.string().min(1),
  phoneNumberId: z.string().min(1),
});

export type CompleteEmbeddedSignupDto = z.infer<
  typeof completeEmbeddedSignupSchema
>;
