import { describe, expect, it } from 'vitest';

import {
  IS_PUBLIC_KEY,
  Public,
} from '@quickdialog/common/decorators/public.decorator.js';

describe('Public decorator', () => {
  it('stores public metadata', () => {
    class TestController {}

    const decorator = Public();

    decorator(TestController);

    expect(Reflect.getMetadata(IS_PUBLIC_KEY, TestController)).toBe(true);
  });
});
