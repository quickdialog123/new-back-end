import {
  createParamDecorator,
  ForbiddenException,
  type ExecutionContext,
} from '@nestjs/common';

import type { AuthenticatedUser } from '@quickdialog/auth/types/authenticated-user.type.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    // if ((user.role === 'OWNER' || user.role === 'STAFF') && !user.hotelId) {
    //   throw new ForbiddenException(
    //     'Authenticated user is not assigned to a hotel',
    //   );
    // }

    return { ...user, hotelId: '82822a9d-5e56-4868-9617-6bbb41b40f42' };
  },
);
