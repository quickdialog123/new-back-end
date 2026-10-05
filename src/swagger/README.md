# Swagger Documentation Guidelines

This document defines the rules for maintaining Swagger/OpenAPI documentation in the QuickDialog backend.

The goal is simple:

> Keep API documentation accurate, readable, close to the real HTTP contract, and easy to maintain without polluting controllers or duplicating application logic.

These rules apply to every developer adding or modifying an API endpoint.

---

## 1. Core principles

Swagger documentation must describe the **real API behavior**.

Do not document what the API might support later.

Do not invent response fields, HTTP statuses, authentication requirements, request fields, or examples.

Swagger must stay aligned with:

- controllers
- Zod request schemas
- authentication guards
- global error handling
- actual service responses
- real HTTP status codes

The preferred style is:

```text
Controller -> small Swagger composite decorator -> Swagger schemas/examples
```

Avoid large blocks of Swagger decorators directly inside controllers.

---

## 2. Current Swagger structure

Keep Swagger-related code inside:

```text
src/swagger/
├── decorators/
│   ├── auth.decorator.ts
│   ├── health.decorator.ts
│   └── ...
│
├── examples/
│   ├── auth.examples.ts
│   └── ...
│
├── schemas/
│   ├── auth.swagger.ts
│   ├── error.swagger.ts
│   ├── health.swagger.ts
│   └── ...
│
├── swagger.config.ts
└── swagger.setup.ts
```

Do not create a new Swagger folder inside each feature module unless there is a strong reason.

For the current project size, centralizing API documentation under `src/swagger/` keeps the structure easy to understand.

---

## 3. Controller rule

Controllers should stay focused on HTTP behavior.

Preferred:

```ts
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  @Public()
  @ApiLoginDocs()
  @Post('login')
  login(...) {}

  @Public()
  @ApiRefreshDocs()
  @Post('refresh')
  refresh(...) {}

  @ApiMeDocs()
  @Get('me')
  me(...) {}
}
```

Avoid this style:

```ts
@Post('login')
@ApiOperation(...)
@ApiBody(...)
@ApiOkResponse(...)
@ApiBadRequestResponse(...)
@ApiUnauthorizedResponse(...)
@ApiTooManyRequestsResponse(...)
@ApiInternalServerErrorResponse(...)
login(...) {}
```

If several Swagger decorators describe one endpoint, wrap them in a small composite decorator using `applyDecorators()`.

---

## 4. Composite decorators

Use focused decorators such as:

```ts
@ApiLoginDocs()
@ApiRefreshDocs()
@ApiLogoutDocs()
@ApiLogoutAllDocs()
@ApiMeDocs()
@ApiHealthDocs()
```

Example:

```ts
import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export function ApiLoginDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Sign in',
    }),

    ApiBody({
      schema: loginRequestSwaggerSchema,
    }),

    ApiBadRequestResponse({
      schema: apiErrorSchema,
    }),

    ApiUnauthorizedResponse({
      schema: apiErrorSchema,
    }),
  );
}
```

Keep decorators explicit.

Do not build a generic Swagger framework.

Avoid abstractions such as:

```text
SwaggerFactory
GenericSwaggerBuilder
ApiCrudDocs<T>
BaseSwaggerDecorator
SwaggerRepository
```

unless the codebase develops a real repeated pattern that justifies them.

---

## 5. Request schemas

QuickDialog uses **Zod** for runtime validation.

Swagger must not introduce a second validation architecture.

Do not add:

```text
class-validator
class-transformer
duplicate DTO classes only for Swagger
```

unless the architecture explicitly changes later.

Swagger request schemas must match the real Zod schema.

Example Zod schema:

```ts
export const loginRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
});
```

The Swagger schema must represent the same contract:

```ts
export const loginRequestSwaggerSchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: {
      type: 'string',
      format: 'email',
      example: 'staff@example.com',
    },
    password: {
      type: 'string',
      format: 'password',
      minLength: 8,
      example: 'Password123!',
    },
  },
} as const;
```

Whenever the Zod schema changes, update Swagger in the same PR.

---

## 6. Response schemas

Swagger schemas describe **public HTTP contracts only**.

Never expose internal database or security fields.

Do not document fields such as:

```text
passwordHash
tokenHash
refresh session hashes
internal Prisma metadata
private audit data
internal family identifiers
```

unless they intentionally belong to the public API.

Use the real controller/service response as the source of truth.

---

## 7. Error responses

QuickDialog has centralized error handling.

Swagger errors must match the real API error envelope.

Conceptually:

```json
{
  "statusCode": 401,
  "code": "UNAUTHORIZED",
  "message": "Invalid email or password",
  "path": "/api/auth/login",
  "requestId": "00000000-0000-0000-0000-000000000000",
  "timestamp": "2026-10-05T12:00:00.000Z"
}
```

Validation errors may include:

```json
{
  "details": {}
}
```

Reuse the shared error schema instead of redefining the same structure for every endpoint.

Preferred:

```ts
ApiBadRequestResponse({
  schema: apiErrorSchema,
});
```

Do not manually duplicate the error object in every endpoint decorator.

---

## 8. Authentication documentation

Swagger must reflect the real authentication model.

QuickDialog currently uses:

```text
Access token
→ Bearer JWT

Refresh token
→ HttpOnly cookie
```

Protected routes should explicitly use:

```ts
@ApiBearerAuth('access-token')
```

Public endpoints must not falsely appear protected.

Refresh must document its cookie requirement if it authenticates through the refresh-token cookie.

Never expose a real JWT or refresh token in examples.

Use:

```text
<access-token>
<refresh-token>
```

or clearly fake values.

---

## 9. HTTP status codes

Document only statuses that the application actually produces.

Do not add every possible HTTP response to every endpoint.

Example:

### Login

```text
201  success
400  invalid request
401  invalid credentials
429  rate limited
```

### Current user

```text
200  success
401  unauthorized
```

### Refresh

```text
201  success
401  invalid or expired session
429  rate limited
```

Verify the controller's actual `@HttpCode()` behavior before documenting a status.

---

## 10. Examples

Examples should be:

- short
- realistic
- safe
- clearly non-production
- consistent

Good:

```json
{
  "email": "staff@example.com",
  "password": "Password123!"
}
```

Use fake UUIDs and ISO timestamps.

Do not use:

- production emails
- real access tokens
- real refresh tokens
- real passwords
- database secrets
- copied production payloads containing sensitive data

---

## 11. Tags

Use one clear Swagger tag per feature/module.

Current examples:

```ts
@ApiTags('Auth')
@ApiTags('Health')
```

Future modules may use:

```text
Hotels
Guests
Conversations
Messages
Requests
Staff
Integrations
```

Only add a tag when the corresponding module and endpoints actually exist.

---

## 12. Swagger configuration

Global Swagger setup belongs only in:

```text
src/swagger/swagger.config.ts
src/swagger/swagger.setup.ts
```

Do not configure Swagger independently inside feature modules.

Global configuration may include:

```text
API title
description
version
security schemes
Swagger UI options
enabled/disabled behavior
```

Keep UI customization minimal.

---

## 13. Swagger enable/disable behavior

Swagger must continue respecting the configured environment flag.

Example behavior:

```text
SWAGGER_ENABLED=true # Swagger available

SWAGGER_ENABLED=false # Swagger not mounted
```

Do not hardcode Swagger to always run in production.

---

## 14. Adding a new endpoint

When adding an endpoint, use this checklist.

### Step 1 - implement the real API

Create/update:

```text
controller
service
Zod schema
guards/permissions when required
```

### Step 2 - create the Swagger schema if needed

Example:

```text
src/swagger/schemas/hotel.swagger.ts
```

Only create a new file when it contains meaningful reusable schemas.

### Step 3 - add examples only if useful

Example:

```text
src/swagger/examples/hotel.examples.ts
```

Do not create an examples file just to store one trivial string.

### Step 4 - create/update the module decorator

Example:

```ts
@ApiCreateHotelDocs()
```

inside:

```text
src/swagger/decorators/hotel.decorator.ts
```

### Step 5 - apply the decorator to the controller

Example:

```ts
@ApiCreateHotelDocs()
@Post()
createHotel(...) {}
```

### Step 6 - verify Swagger UI

Check:

```text
request body
response body
HTTP status
authentication
errors
examples
nullable fields
required fields
```

### Step 7 - update tests

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:coverage
pnpm build
```

---

## 15. Adding a new module

For a new feature such as `hotel`, prefer:

```text
src/swagger/
├── decorators/
│   └── hotel.decorator.ts
│
├── schemas/
│   └── hotel.swagger.ts
│
└── examples/
    └── hotel.examples.ts
```

Only create the examples file when examples are substantial enough to deserve separation.

The actual application module remains:

```text
src/hotel/
├── schemas/
├── hotel.controller.ts
├── hotel.service.ts
└── hotel.module.ts
```

Do not move business logic into `src/swagger`.

Swagger may describe business behavior, but it must never implement it.

---

## 16. What must never be placed in Swagger code

Do not put:

```text
database queries
Prisma calls
authentication logic
token generation
authorization decisions
business rules
validation execution
environment mutation
HTTP side effects
```

inside Swagger helpers.

Swagger code must remain documentation-only.

---

## 17. Avoid duplication

Reuse schemas when the HTTP contract is truly the same.

Good:

```ts
apiErrorSchema;
authenticatedUserSwaggerSchema;
```

Avoid creating a different error schema per endpoint when all use the same global error contract.

However, do not force unrelated schemas into one generic schema merely to reduce file count.

Prefer clarity over artificial reuse.

---

## 18. Keep naming consistent

Use:

```text
<feature>.decorator.ts
<feature>.swagger.ts
<feature>.examples.ts
```

Examples:

```text
auth.decorator.ts
auth.swagger.ts
auth.examples.ts

health.decorator.ts
health.swagger.ts
```

Decorator names should describe the endpoint:

```ts
ApiLoginDocs;
ApiRefreshDocs;
ApiMeDocs;
ApiCreateHotelDocs;
ApiListHotelsDocs;
```

Avoid vague names such as:

```ts
SwaggerDocs;
ApiDocs;
CommonDocs;
BuildDocs;
```

---

## 19. Do not document implementation details

Swagger is for API consumers.

Do not expose details such as:

```text
bcrypt rounds
dummy password hashes
Prisma model names
refresh-token hash algorithm
refresh-session family internals
internal database IDs that are not public
internal transaction behavior
framework implementation details
```

Good:

> Rotates the current refresh session and issues a new access token.

Avoid:

> SHA-256 hashes the token and updates RefreshSession using Prisma updateMany.

The first describes the API behavior. The second leaks implementation details that API consumers do not need.

---

## 20. Keep summaries short

Good:

```text
Sign in
Refresh session
Sign out
Sign out from all devices
Get current user
Check application health
```

Use `description` only when additional behavior genuinely helps the API consumer.

---

## 21. Review checklist

Every Swagger-related PR should verify:

- [ ] Swagger matches the real controller route.
- [ ] Request schema matches Zod validation.
- [ ] Success response matches the actual service/controller output.
- [ ] HTTP status is correct.
- [ ] Authentication requirement is correct.
- [ ] Public routes do not show bearer auth.
- [ ] Protected routes use the correct security scheme.
- [ ] Refresh-cookie routes document cookie authentication.
- [ ] Error responses reuse the real global error schema.
- [ ] Sensitive/internal fields are not exposed.
- [ ] Examples contain no secrets or production data.
- [ ] Controller remains readable.
- [ ] No unnecessary Swagger abstraction was introduced.
- [ ] Swagger UI renders correctly.
- [ ] Lint passes.
- [ ] Typecheck passes.
- [ ] Tests pass.
- [ ] Build passes.

---

## 22. Definition of done

Swagger documentation is complete when:

```text
Real API contract = Swagger/OpenAPI contract
```

A developer using Swagger should be able to understand:

```text
What endpoint should I call?
What body should I send?
Do I need authentication?
What will I receive?
What errors should I expect?
```

without needing to read the controller or service implementation.

At the same time, the source code should remain clean enough that developers do not avoid maintaining documentation because it became too complicated.

---

## Final rule

When changing an API contract:

> Update the implementation, validation, Swagger documentation, and tests in the same pull request.

Do not merge an endpoint change that leaves Swagger describing an older API.
