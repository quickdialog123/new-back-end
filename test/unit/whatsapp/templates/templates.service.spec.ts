import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { HttpResponseError } from '@nestjs/http-client';
import { encryptMetaToken } from '@quickdialog/whatsapp/meta/meta-token.util.js';
import { TemplatesService } from '@quickdialog/whatsapp/templates/templates.service.js';
import { templateInputSchema } from '@quickdialog/whatsapp/templates/template.schema.js';

const key = Buffer.alloc(32, 4).toString('base64');
const account = { wabaId: 'waba-1', accessTokenEncrypted: encryptMetaToken('secret-token', key) };
const prisma = { whatsAppAccount: { findFirst: vi.fn().mockResolvedValue(account) } };
const config = { getOrThrow: vi.fn().mockReturnValue(key) };
const meta = {
  listTemplates: vi.fn(), getTemplate: vi.fn(), createTemplate: vi.fn(),
  editTemplate: vi.fn(), deleteTemplate: vi.fn(),
  uploadTemplateMedia: vi.fn(),
};
const service = new TemplatesService(prisma as never, config as never, meta as never);

describe('TemplatesService', () => {
  it('uses the hotel connection and sends only Meta components', async () => {
    meta.createTemplate.mockResolvedValueOnce({ id: '123', status: 'PENDING', category: 'UTILITY' });
    const result = await service.create('hotel-1', {
      name: 'welcome', category: 'UTILITY', language: 'en_GB', header: null,
      body: 'Hi {{firstname}}', footer: null, buttons: [], sampleValues: { firstname: 'Amelia' },
    });
    expect(prisma.whatsAppAccount.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { hotelId: 'hotel-1', status: { in: ['CONNECTED', 'UNVERIFIED'] }, accessTokenEncrypted: { not: null } } }));
    expect(meta.createTemplate).toHaveBeenCalledWith('waba-1', 'secret-token', {
      name: 'welcome', category: 'UTILITY', language: 'en_GB',
      components: [{ type: 'BODY', text: 'Hi {{1}}', example: { body_text: [['Amelia']] } }],
    });
    expect(result.status).toBe('PENDING');
    expect(result).toMatchObject({ body: 'Hi {{1}}', broadcastEligible: false, buttons: [] });
  });

  it('lets Meta template errors reach the global handler', async () => {
    const metaError = new HttpResponseError({
      method: 'POST', url: 'https://graph.facebook.com/message_templates', status: 400,
      body: { error: {
        message: 'Invalid parameter', error_user_msg: 'Sample text does not match body variables',
        error_user_title: 'Invalid template', code: 100, error_subcode: 2388047,
        fbtrace_id: 'trace-123',
      } },
    });
    meta.createTemplate.mockRejectedValueOnce(metaError);
    const response = service.create('hotel-1', {
      name: 'welcome_variable', category: 'MARKETING', language: 'en_US', header: null,
      body: 'Hi {{firstname}}', footer: null, buttons: [], sampleValues: { firstname: 'Amelia' },
    });
    await expect(response).rejects.toBe(metaError);
  });

  it('rejects template IDs outside the connected WABA before detail', async () => {
    meta.listTemplates.mockResolvedValueOnce({ data: [], paging: {} });
    await expect(service.detail('hotel-1', '999')).rejects.toBeInstanceOf(NotFoundException);
    expect(meta.getTemplate).not.toHaveBeenCalled();
  });

  it('requires a connected account with a token', async () => {
    prisma.whatsAppAccount.findFirst.mockResolvedValueOnce(null);
    await expect(service.list('hotel-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('can list templates after signup while phone registration is pending', async () => {
    meta.listTemplates.mockResolvedValueOnce({ data: [], paging: {} });
    await expect(service.list('hotel-1')).resolves.toEqual({ data: [], paging: { after: null } });
    expect(prisma.whatsAppAccount.findFirst).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { hotelId: 'hotel-1', status: { in: ['CONNECTED', 'UNVERIFIED'] }, accessTokenEncrypted: { not: null } },
    }));
  });

  it('maps Meta components and approves broadcasts only from current Meta status', async () => {
    meta.listTemplates.mockResolvedValueOnce({ data: [{
      id: '123', name: 'welcome', language: 'en_GB', category: 'UTILITY', status: 'APPROVED', rejected_reason: 'NONE',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Welcome' },
        { type: 'BODY', text: 'Hi {{1}}' },
        { type: 'FOOTER', text: 'Hotel' },
        { type: 'BUTTONS', buttons: [{ type: 'PHONE_NUMBER', text: 'Call', phone_number: '+15551234567' }] },
      ],
    }], paging: {} });
    const result = await service.list('hotel-1');
    expect(result.data[0]).toMatchObject({
      header: { type: 'TEXT', text: 'Welcome' }, body: 'Hi {{1}}', footer: 'Hotel',
      buttons: [{ type: 'PHONE_NUMBER', text: 'Call', phoneNumber: '+15551234567' }],
      status: 'APPROVED', broadcastEligible: true,
    });
    expect(result.data[0]).not.toHaveProperty('rejectionReason');
  });

  it('rejects filename-only media and generic authentication payloads', () => {
    const input = { name: 'welcome', language: 'en_GB', body: 'Hello', footer: null, buttons: [], sampleValues: {} };
    expect(templateInputSchema.safeParse({ ...input, category: 'UTILITY', header: { type: 'IMAGE', mediaSample: 'banner.jpg' } }).success).toBe(false);
    expect(templateInputSchema.safeParse({ ...input, category: 'AUTHENTICATION', header: null }).success).toBe(false);
  });

  it('rejects unused samples and variables in unsupported components', () => {
    const input = { name: 'welcome', category: 'UTILITY', language: 'en_GB', header: null, body: 'Hi {{guest}}', footer: null, buttons: [], sampleValues: { guest: 'Amelia' } };
    expect(templateInputSchema.safeParse({ ...input, sampleValues: { ...input.sampleValues, unused: 'Extra' } }).success).toBe(false);
    expect(templateInputSchema.safeParse({ ...input, footer: 'For {{guest}}' }).success).toBe(false);
    expect(templateInputSchema.safeParse({ ...input, buttons: [{ type: 'QUICK_REPLY', text: '{{guest}}' }] }).success).toBe(false);
    expect(templateInputSchema.safeParse({ ...input, buttons: [{ type: 'URL', text: 'Open', url: 'https://example.com/{{guest}}' }] }).success).toBe(false);
  });

  it('uploads binary media using the hotel token and returns only the handle', async () => {
    const file = Buffer.from('image bytes');
    meta.uploadTemplateMedia.mockResolvedValueOnce('meta-handle');
    await expect(service.uploadMedia('hotel-1', file, 'header.png', 'image/png')).resolves.toEqual({ mediaHandle: 'meta-handle' });
    expect(meta.uploadTemplateMedia).toHaveBeenCalledWith('secret-token', file, 'header.png', 'image/png');
    await expect(service.uploadMedia('hotel-1', file, '../bad.png', 'image/png')).rejects.toBeInstanceOf(BadRequestException);
  });
});
