import { z } from 'zod';

const button = z.discriminatedUnion('type', [
  z.object({ type: z.literal('QUICK_REPLY'), text: z.string().trim().min(1).max(25) }),
  z.object({ type: z.literal('URL'), text: z.string().trim().min(1).max(25), url: z.url().startsWith('https://') }),
  z.object({ type: z.literal('PHONE_NUMBER'), text: z.string().trim().min(1).max(25), phoneNumber: z.string().regex(/^\+[1-9]\d{6,14}$/) }),
  z.object({ type: z.literal('CATALOG'), text: z.literal('View catalog') }),
]);

const header = z.discriminatedUnion('type', [
  z.object({ type: z.literal('TEXT'), text: z.string().trim().min(1).max(60) }),
  z.object({ type: z.literal('IMAGE'), mediaSample: z.string().max(128).optional(), mediaHandle: z.string().min(1) }),
  z.object({ type: z.literal('VIDEO'), mediaSample: z.string().max(128).optional(), mediaHandle: z.string().min(1) }),
  z.object({ type: z.literal('DOCUMENT'), mediaSample: z.string().max(128).optional(), mediaHandle: z.string().min(1) }),
]);

export const templateInputSchema = z.object({
  name: z.string().regex(/^[a-z0-9_]+$/),
  category: z.enum(['MARKETING', 'UTILITY', 'AUTHENTICATION']),
  language: z.string().regex(/^[a-z]{2,3}(?:_[A-Z]{2})?$/),
  header: header.nullable(),
  body: z.string().trim().min(1).max(1024),
  footer: z.string().trim().max(60).nullable(),
  buttons: z.array(button).max(3),
  sampleValues: z.record(z.string(), z.string().min(1)).optional(),
}).superRefine((value, context) => {
  if (value.category === 'AUTHENTICATION') context.addIssue({ code: 'custom', path: ['category'], message: 'Authentication templates require Meta authentication-specific settings and OTP button fields' });
  if (value.buttons.some((item) => item.type === 'CATALOG') && (value.category !== 'MARKETING' || value.buttons.length !== 1 || value.header !== null)) {
    context.addIssue({ code: 'custom', path: ['buttons'], message: 'A catalog template needs one catalog button, a marketing category, and no header' });
  }
  if (new Set(value.buttons.map((item) => item.type)).size > 1) context.addIssue({ code: 'custom', path: ['buttons'], message: 'Buttons must have the same type' });
  if (value.buttons[0]?.type !== 'QUICK_REPLY' && value.buttons.length > 2) context.addIssue({ code: 'custom', path: ['buttons'], message: 'At most two call-to-action buttons are supported' });
  const placeholders = [...(value.body + ' ' + (value.header?.type === 'TEXT' ? value.header.text : '')).matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)].map((match) => match[1]);
  const used = new Set(placeholders);
  for (const variable of placeholders) if (!value.sampleValues?.[variable]) context.addIssue({ code: 'custom', path: ['sampleValues', variable], message: 'Sample value is required for each variable' });
  for (const variable of Object.keys(value.sampleValues ?? {})) if (!used.has(variable)) context.addIssue({ code: 'custom', path: ['sampleValues', variable], message: 'Sample value has no matching variable' });
  if (value.footer?.includes('{{')) context.addIssue({ code: 'custom', path: ['footer'], message: 'Footer variables are not supported' });
  value.buttons.forEach((item, index) => {
    if (item.text.includes('{{')) context.addIssue({ code: 'custom', path: ['buttons', index, 'text'], message: 'Button text variables are not supported' });
    if (item.type === 'URL' && item.url.includes('{{')) context.addIssue({ code: 'custom', path: ['buttons', index, 'url'], message: 'Dynamic button URLs are not supported' });
  });
});

export const templateIdSchema = z.object({ id: z.string().regex(/^\d+$/) });
export const templateListSchema = z.object({ after: z.string().min(1).optional() });
export type TemplateInput = z.infer<typeof templateInputSchema>;
export type TemplateIdParamDto = z.infer<typeof templateIdSchema>;
export type TemplateListQueryDto = z.infer<typeof templateListSchema>;
