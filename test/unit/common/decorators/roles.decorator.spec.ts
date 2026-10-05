import { describe, expect, it } from 'vitest';

import {
  ROLES_KEY,
  Roles,
} from '@quickdialog/common/decorators/roles.decorator.js';

describe('Roles decorator', () => {
  it('stores roles metadata', () => {
    class TestController {}

    const decorator = Roles('OWNER', 'STAFF');

    decorator(TestController);

    expect(Reflect.getMetadata(ROLES_KEY, TestController)).toEqual([
      'OWNER',
      'STAFF',
    ]);
  });
});
