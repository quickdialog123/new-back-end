import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EmbeddedSignupController } from '@quickdialog/whatsapp/embedded-signup/embedded-signup.controller.js';
import { EmbeddedSignupService } from '@quickdialog/whatsapp/embedded-signup/embedded-signup.service.js';

describe('EmbeddedSignupController', () => {
  let controller: EmbeddedSignupController;
  const embeddedSignupService = { complete: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [EmbeddedSignupController],
      providers: [
        { provide: EmbeddedSignupService, useValue: embeddedSignupService },
      ],
    }).compile();
    controller = moduleRef.get(EmbeddedSignupController);
  });

  it('uses the authenticated hotel for signup completion', async () => {
    const input = {
      code: 'signup-code',
      wabaId: 'waba-id',
      phoneNumberId: 'phone-id',
    };
    const user = {
      userId: 'user-id',
      sessionId: 'session-id',
      hotelId: 'hotel-id',
      role: 'OWNER',
    };
    embeddedSignupService.complete.mockResolvedValue({ status: 'connected' });

    await expect(controller.complete(user as never, input)).resolves.toEqual({
      status: 'connected',
    });
    expect(embeddedSignupService.complete).toHaveBeenCalledWith(
      'hotel-id',
      input,
    );
  });

  it('rejects completion without a hotel context', () => {
    expect(() =>
      controller.complete(
        {
          userId: 'user-id',
          sessionId: 'session-id',
          hotelId: null,
          role: 'OWNER',
        } as never,
        { code: 'code', wabaId: 'waba-id', phoneNumberId: 'phone-id' },
      ),
    ).toThrow(BadRequestException);
    expect(embeddedSignupService.complete).not.toHaveBeenCalled();
  });
});
