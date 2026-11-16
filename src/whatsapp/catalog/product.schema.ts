import { z } from 'zod';

const productFields = {
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  productUrl: z.url({ protocol: /^https?$/ }),
  imageUrl: z.url({ protocol: /^https?$/ }),
  price: z
    .string()
    .trim()
    .regex(/^(?=.*[1-9])\d+(\.\d{1,2})?$/),
  currency: z.string().regex(/^[A-Z]{3}$/),
  availability: z.enum([
    'in stock',
    'out of stock',
    'available for order',
    'discontinued',
  ]),
  brand: z.string().trim().min(1).max(100),
  condition: z.enum(['new', 'refurbished', 'used']),
};

export const createProductSchema = z.object(productFields);

export const updateProductSchema = z
  .object({
    ...productFields,
  })
  .partial()
  .refine(
    (input) => Object.values(input).some((value) => value !== undefined),
    {
      message: 'At least one product field must be provided',
    },
  );

export const catalogIdParamSchema = z.object({ catalogId: z.string().min(1) });
export const productIdParamSchema = z.object({
  catalogId: z.string().min(1),
  productId: z.string().min(1).max(100),
});
export const batchHandleParamSchema = z.object({
  catalogId: z.string().min(1),
  handle: z.string().min(1),
});

export type CreateProductDto = z.infer<typeof createProductSchema>;
export type UpdateProductDto = z.infer<typeof updateProductSchema>;
