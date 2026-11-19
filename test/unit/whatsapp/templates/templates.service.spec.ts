import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
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
    expect(prisma.whatsAppAccount.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { hotelId: 'hotel-1', status: 'CONNECTED', accessTokenEncrypted: { not: null } } }));
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

  it('rejects a missing create response', async () => {
    meta.createTemplate.mockResolvedValueOnce(null);
    await expect(service.create('hotel-1', {
      name: 'welcome', category: 'UTILITY', language: 'en_GB', header: null,
      body: 'Hello', footer: null, buttons: [],
    })).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects an empty media handle from Meta', async () => {
    meta.uploadTemplateMedia.mockResolvedValueOnce('');
    await expect(service.uploadMedia('hotel-1', Buffer.from('image'), 'header.png', 'image/png')).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects an unconfirmed template edit', async () => {
    meta.listTemplates.mockResolvedValueOnce({ data: [{ id: '123', name: 'welcome', language: 'en_GB' }], paging: {} });
    meta.editTemplate.mockResolvedValueOnce({ success: false, id: '123', name: 'welcome', category: 'UTILITY' });
    await expect(service.edit('hotel-1', '123', {
      name: 'welcome', category: 'UTILITY', language: 'en_GB', header: null,
      body: 'Hello', footer: null, buttons: [],
    })).rejects.toBeInstanceOf(ConflictException);
    expect(meta.getTemplate).not.toHaveBeenCalled();
  });

  it('returns an empty template list when Meta has no templates', async () => {
    meta.listTemplates.mockResolvedValueOnce({ data: [], paging: {} });
    await expect(service.list('hotel-1')).resolves.toEqual({ data: [], paging: { after: null } });
  });

  it('rejects a missing template list response from Meta', async () => {
    meta.listTemplates.mockResolvedValueOnce(null);
    await expect(service.list('hotel-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('uses the WABA list result for detail without fetching the template again', async () => {
    const template = { id: '123', name: 'welcome', language: 'en_GB', category: 'UTILITY', status: 'APPROVED', components: [{ type: 'BODY', text: 'Hello' }] };
    meta.listTemplates
      .mockResolvedValueOnce({ data: [], paging: { next: 'page-2', cursors: { after: 'cursor' } } })
      .mockResolvedValueOnce({ data: [template], paging: {} });
    await expect(service.detail('hotel-1', '123')).resolves.toMatchObject({ id: '123', body: 'Hello' });
    expect(meta.listTemplates).toHaveBeenLastCalledWith('waba-1', 'secret-token', 'cursor');
    expect(meta.getTemplate).not.toHaveBeenCalled();
  });

  it('rejects template IDs outside the connected WABA before detail', async () => {
    meta.listTemplates.mockResolvedValueOnce({ data: [], paging: {} });
    await expect(service.detail('hotel-1', '999')).rejects.toBeInstanceOf(NotFoundException);
    expect(meta.getTemplate).not.toHaveBeenCalled();
  });

  it('requires a connected account with a token', async () => {
    prisma.whatsAppAccount.findFirst.mockResolvedValueOnce(null);
    await expect(service.list('hotel-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('requires phone registration before listing templates', async () => {
    prisma.whatsAppAccount.findFirst.mockImplementationOnce((query: { where: { status: string } }) =>
      Promise.resolve(query.where.status === 'CONNECTED' ? null : { ...account, status: 'UNVERIFIED' }));
    await expect(service.list('hotel-1')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.whatsAppAccount.findFirst).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { hotelId: 'hotel-1', status: 'CONNECTED', accessTokenEncrypted: { not: null } },
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

  it('rejects an unconfirmed template deletion', async () => {
    meta.listTemplates.mockResolvedValueOnce({ data: [{ id: '123', name: 'welcome' }], paging: {} });
    meta.deleteTemplate.mockResolvedValueOnce({ success: false });
    await expect(service.delete('hotel-1', '123')).rejects.toBeInstanceOf(ConflictException);
  });

  it('deletes a template after Meta confirms it', async () => {
    meta.listTemplates.mockResolvedValueOnce({ data: [{ id: '123', name: 'welcome' }], paging: {} });
    meta.deleteTemplate.mockResolvedValueOnce({ success: true });
    await expect(service.delete('hotel-1', '123')).resolves.toBeUndefined();
    expect(meta.deleteTemplate).toHaveBeenLastCalledWith('waba-1', '123', 'welcome', 'secret-token');
  });

  it('returns the updated template after Meta confirms the edit', async () => {
    const template = { id: '123', name: 'welcome', language: 'en_GB', category: 'UTILITY', status: 'PENDING', components: [{ type: 'BODY', text: 'Hello' }] };
    meta.listTemplates.mockResolvedValueOnce({ data: [template], paging: {} });
    meta.editTemplate.mockResolvedValueOnce({ success: true, id: '123', name: 'welcome', category: 'UTILITY' });
    meta.getTemplate.mockResolvedValueOnce(template);
    await expect(service.edit('hotel-1', '123', {
      name: 'welcome', category: 'UTILITY', language: 'en_GB', header: null,
      body: 'Hello', footer: null, buttons: [],
    })).resolves.toMatchObject({ id: '123', body: 'Hello', status: 'PENDING' });
  });
});
