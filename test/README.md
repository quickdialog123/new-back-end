# Testing Guidelines

This document defines the testing rules for the QuickDialog backend

The project uses **Vitest** for unit and integration tests. Tests must focus on application behavior, contracts, and failure cases rather than framework internals.

## General rules

- Keep tests deterministic, isolated, and independent from execution order.
- Test observable behavior, contracts, security boundaries, and important failure cases.
- Do not write tests only to increase coverage.
- Do not duplicate production implementation logic inside tests.
- Use clear `describe` and `it` names that describe expected behavior.
- Prefer small focused tests over large multi-purpose test files.
- Every bug fix should include a regression test when practical.
- New backend behavior must include tests in the same PR.
- Never use production credentials, tokens, users, phone numbers, or database data in tests.

## Unit tests

Unit tests isolate one class, function, schema, guard, or service from its external dependencies.

Use unit tests for:

- services with mocked dependencies
- controllers
- guards
- strategies
- decorators
- Zod schemas
- utility functions
- error mapping
- configuration helpers
- pure business rules

Mock dependencies such as:

```text
PrismaService
JwtService
ConfigService
external API clients
RealtimeService
ETC...
```
