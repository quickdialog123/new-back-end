import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TemplatesController } from '@quickdialog/whatsapp/templates/templates.controller.js';
import { TemplatesService } from '@quickdialog/whatsapp/templates/templates.service.js';

describe('TemplatesController', () => {
  const templates = {
    list: vi.fn(),
    detail: vi.fn(),
    create: vi.fn(),
    uploadMedia: vi.fn(),
    edit: vi.fn(),
    delete: vi.fn(),
  };
  const user = { hotelId: 'hotel-1' };
  let controller: TemplatesController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new TemplatesController(templates as unknown as TemplatesService);
  });

  it('lists templates for the authenticated hotel and cursor', () => {
    const result = { data: [], paging: { after: null } };
    templates.list.mockReturnValue(result);

    expect(controller.list(user as never, { after: 'cursor-1' })).toBe(result);
    expect(templates.list).toHaveBeenCalledWith('hotel-1', 'cursor-1');
  });

  it('gets a template for the authenticated hotel', () => {
    const result = { id: 'template-1' };
    templates.detail.mockReturnValue(result);

    expect(controller.detail(user as never, { id: 'template-1' })).toBe(result);
    expect(templates.detail).toHaveBeenCalledWith('hotel-1', 'template-1');
  });

  it('creates a template for the authenticated hotel', () => {
    const input = { name: 'welcome' };
    const result = { id: 'template-1' };
    templates.create.mockReturnValue(result);

    expect(controller.create(user as never, input as never)).toBe(result);
    expect(templates.create).toHaveBeenCalledWith('hotel-1', input);
  });

  it('uploads media using the request headers and authenticated hotel', () => {
    const file = Buffer.from('image');
    const result = { mediaHandle: 'meta-handle' };
    templates.uploadMedia.mockReturnValue(result);

    expect(
      controller.uploadMedia(user as never, 'image/png', 'header.png', file),
    ).toBe(result);
    expect(templates.uploadMedia).toHaveBeenCalledWith(
      'hotel-1',
      file,
      'header.png',
      'image/png',
    );
  });

  it('edits a template for the authenticated hotel', () => {
    const input = { name: 'welcome-edited' };
    const result = { id: 'template-1' };
    templates.edit.mockReturnValue(result);

    expect(
      controller.edit(user as never, { id: 'template-1' }, input as never),
    ).toBe(result);
    expect(templates.edit).toHaveBeenCalledWith('hotel-1', 'template-1', input);
  });

  it('deletes a template for the authenticated hotel', () => {
    const result = undefined;
    templates.delete.mockReturnValue(result);

    expect(controller.delete(user as never, { id: 'template-1' })).toBe(result);
    expect(templates.delete).toHaveBeenCalledWith('hotel-1', 'template-1');
  });
});
