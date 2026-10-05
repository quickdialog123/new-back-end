import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createValidationException } from '@quickdialog/common/errors/validation-exception.factory.js';

describe('createValidationException', () => {
  it('creates a BadRequestException', () => {
    const exception = createValidationException([
      {
        path: ['email'],
        message: 'Invalid email',
      },
    ]);

    expect(exception).toBeInstanceOf(BadRequestException);

    expect(exception.getStatus()).toBe(400);
  });

  it('creates the validation error payload', () => {
    const exception = createValidationException([
      {
        path: ['email'],
        message: 'Invalid email',
      },
    ]);

    expect(exception.getResponse()).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: [
        {
          field: 'email',
          message: 'Invalid email',
        },
      ],
    });
  });

  it('joins nested validation paths', () => {
    const exception = createValidationException([
      {
        path: ['user', 'profile', 'email'],
        message: 'Invalid email',
      },
    ]);

    expect(exception.getResponse()).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: [
        {
          field: 'user.profile.email',
          message: 'Invalid email',
        },
      ],
    });
  });

  it('supports object path segments', () => {
    const exception = createValidationException([
      {
        path: [
          {
            key: 'user',
          },
          {
            key: 'email',
          },
        ],
        message: 'Invalid email',
      },
    ]);

    expect(exception.getResponse()).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: [
        {
          field: 'user.email',
          message: 'Invalid email',
        },
      ],
    });
  });

  it('uses request when no field path exists', () => {
    const exception = createValidationException([
      {
        message: 'Invalid request',
      },
    ]);

    expect(exception.getResponse()).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: [
        {
          field: 'request',
          message: 'Invalid request',
        },
      ],
    });
  });

  it('maps multiple validation issues', () => {
    const exception = createValidationException([
      {
        path: ['email'],
        message: 'Invalid email',
      },
      {
        path: ['password'],
        message: 'Password is required',
      },
    ]);

    expect(exception.getResponse()).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: [
        {
          field: 'email',
          message: 'Invalid email',
        },
        {
          field: 'password',
          message: 'Password is required',
        },
      ],
    });
  });
});
