import { BadRequestException } from '@nestjs/common';

type ValidationPathSegment = PropertyKey | { key: PropertyKey };

type ValidationIssue = {
  path?: readonly ValidationPathSegment[];
  message: string;
};

export function createValidationException(
  issues: readonly ValidationIssue[],
): BadRequestException {
  return new BadRequestException({
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed',

    details: issues.map((issue) => ({
      field:
        issue.path
          ?.map((segment) =>
            typeof segment === 'object' && segment !== null
              ? String(segment.key)
              : String(segment),
          )
          .join('.') || 'request',

      message: issue.message,
    })),
  });
}
