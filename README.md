# QuickDialog API

Backend API for QuickDialog, built with NestJS, Fastify, PostgreSQL and Prisma.

The project is intentionally kept as a modular monolith. Business features live in their own modules, controllers stay thin, services own application logic, and Prisma is used directly from services unless a separate abstraction is actually needed.

## Stack

- Node.js 24
- TypeScript
- NestJS 12
- Fastify
- PostgreSQL
- Prisma 7 with `@prisma/adapter-pg`
- Zod with `StandardSchemaValidationPipe`
- Passport JWT
- bcryptjs
- Swagger / OpenAPI
- nestjs-pino / pino-http
- Vitest
- Testcontainers
- Oxlint
- Prettier
- pnpm 10.32.1

## Project structure

```text
.
├── prisma/
│   ├── migrations/
│   ├── models/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── auth/
│   │   ├── schemas/
│   │   ├── strategies/
│   │   ├── types/
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   └── auth.utils.ts
│   ├── common/
│   │   ├── decorators/
│   │   ├── errors/
│   │   │   ├── database-exception.filter.ts
│   │   │   ├── global-exception.filter.ts
│   │   │   └── validation-exception.factory.ts
│   │   ├── guards/
│   │   └── logging/
│   ├── config/
│   ├── database/
│   ├── health/
│   ├── hotels/
│   │   ├── schemas/
│   │   ├── hotels.controller.ts
│   │   ├── hotels.module.ts
│   │   └── hotels.service.ts
│   ├── whatsapp/
│   │   ├── embedded-signup/
│   │   │   ├── schemas/
│   │   │   ├── embedded-signup.controller.ts
│   │   │   └── embedded-signup.service.ts
│   │   ├── meta/
│   │   │   ├── meta-graph.client.ts
│   │   │   ├── meta-token.util.ts
│   │   │   └── meta.types.ts
│   │   ├── webhooks/
│   │   │   ├── webhook-signature.guard.ts
│   │   │   ├── webhook.controller.ts
│   │   │   ├── webhook.service.ts
│   │   │   └── webhook.types.ts
│   │   ├── whatsapp.controller.ts
│   │   ├── whatsapp.module.ts
│   │   └── whatsapp.service.ts
│   ├── swagger/
│   │   ├── decorators/
│   │   ├── examples/
│   │   ├── schemas/
│   │   ├── README.md
│   │   ├── swagger.config.ts
│   │   └── swagger.setup.ts
│   ├── app.module.ts
│   └── main.ts
├── test/
├── prisma.config.ts
├── vitest.config.ts
├── vitest.integration.config.ts
├── vitest.coverage.config.ts
└── package.json
```

## Architecture

The normal request path is:

```text
HTTP request -> Fastify -> Global guards / Zod validation -> Controller -> Service -> Prisma / external integration -> PostgreSQL
```

A few rules are intentional:

- keep business logic out of controllers
- keep services focused on application behavior
- use Prisma directly from services unless a repository solves a real problem
- add modules around business areas, not technical layers
- do not introduce CQRS, event buses, generic repositories or DDD layers without a concrete need
- keep authentication and validation secure by default

## Authentication

Authentication is database-backed.

Current auth endpoints cover:

- login with email and password
- short-lived access JWT
- refresh-token sessions stored in PostgreSQL
- refresh-token rotation
- refresh-token replay detection
- absolute session lifetime
- logout
- logout from all active sessions
- current authenticated user

Protected routes use the global JWT guard. Public routes must be marked explicitly with `@Public()`.

Access tokens are sent as bearer tokens:

```text
Authorization: Bearer <access-token>
```

Refresh tokens are stored in an HttpOnly cookie and are not stored in plaintext in the database.

### Access token behavior

Access tokens are stateless. Logging out revokes refresh sessions, but an already-issued access token remains valid until its normal expiration time.

Keep access-token TTL short for that reason.

### JWT payload validation

The JWT strategy verifies the token issuer, audience, expiration, and HS256 signature before validating the payload with Zod. Payloads require a non-empty `sub`, UUID `sid`, and a role-compatible `hotelId`: `SUPER_ADMIN` may have a nullable hotel ID, while all other roles require a UUID hotel ID. Invalid payloads receive a 401 response.

## Hotels

Hotel endpoints require the `SUPER_ADMIN` role. The following paths use the default `API_PREFIX=api`:

- `POST /api/hotels` creates a hotel and its initial owner in one transaction.
- `GET /api/hotels` lists hotels, including inactive hotels.
- `GET /api/hotels/:id` retrieves one hotel.
- `PATCH /api/hotels/:id` updates one or more hotel fields.
- `POST /api/hotels/:id/deactivate` deactivates a hotel.

Hotel IDs are UUIDs. Creating a hotel requires its name, phone number, token, and owner email, full name, and password. Updates require at least one of name, phone number, or token.

Successful responses never include hotel tokens or owner password hashes. Deactivation is not a hard delete: it runs atomically, marks the hotel and its users inactive, and revokes active refresh sessions. It does not invalidate access JWTs that were already issued.

There is no reactivation endpoint. `PATCH /api/hotels/:id` cannot change a hotel's `active` state.

## Validation

Request validation uses Zod through Nest's built-in `StandardSchemaValidationPipe`.

Example:

```ts
@Body({ schema: loginRequestSchema })
input: LoginDTO
```

Do not add a parallel `class-validator` DTO layer unless the project validation strategy changes.

Environment variables are also validated before the application starts.

## Error responses

All API errors use one response shape.

Example:

```json
{
  "statusCode": 401,
  "code": "UNAUTHORIZED",
  "message": "Invalid email or password",
  "path": "/api/auth/login",
  "requestId": "00000000-0000-4000-8000-000000000001",
  "timestamp": "2026-10-05T12:00:00.000Z"
}
```

Validation errors may also contain `details`.

Two global filters own the error handling responsibilities:

- `DatabaseExceptionFilter` handles `PrismaClientKnownRequestError` only. It maps `P2002` to 409 conflict and `P2025` to 404 not found. Other Prisma known-request errors are logged and return a generic 500 response.
- `GlobalExceptionFilter` handles HTTP exceptions, Zod-derived validation exceptions, and every exception that is not a Prisma known-request error.

Both filters are registered through `APP_FILTER`. `DatabaseExceptionFilter` is registered after `GlobalExceptionFilter` because Nest evaluates global filters in reverse registration order, allowing Prisma errors to reach the database filter first.

Unexpected exceptions are logged, while internal implementation details are not returned to the client.

## Logging

Logging uses `nestjs-pino` and `pino-http`.

Development uses readable/colored logs. Production keeps structured JSON output.

Sensitive fields are redacted, including:

- authorization headers
- cookies
- passwords
- access tokens
- refresh tokens
- API keys

Request IDs are included in logs and error responses so a request can be traced across the application.

## Swagger

Swagger is kept separate from controller logic.

```text
src/swagger/
├── decorators/
├── examples/
├── schemas/
├── README.md
├── swagger.config.ts
└── swagger.setup.ts
```

Controllers should use small composite decorators such as:

```ts
@ApiLoginDocs()
@ApiRefreshDocs()
@ApiMeDocs()
```

instead of large blocks of Swagger decorators directly in controller methods.

Swagger contribution rules are documented in [the Swagger guidelines](./src/swagger/README.md).

Hotel endpoints document their success, validation, authentication, authorization, conflict, and not-found responses. When an API contract changes, update the implementation, Zod validation, Swagger documentation, and tests in the same PR.

## Database and Prisma

`DatabaseModule` is global and exports a single `PrismaService` for dependency injection.

```text
Service -> PrismaService -> PrismaPg adapter -> PostgreSQL
```

Prisma CLI and the running application use `DATABASE_URL`. The current Prisma configuration does not define `DIRECT_URL` or `SHADOW_DATABASE_URL`.

Do not run development seeding against production

## Environment setup

Copy the example file:

```bash
cp .env.example .env
```

On Windows CMD:

```cmd
copy .env.example .env
```

Then update the values for your local environment.

Typical configuration:

```env
NODE_ENV=development

HOST=0.0.0.0
PORT=4099
API_PREFIX=api
CORS_ORIGIN=http://localhost:3000

DATABASE_URL=postgresql://quickdialog_app:password@localhost:5432/quickdialog

JWT_ACCESS_SECRET=replace-with-a-strong-random-secret
JWT_ACCESS_TTL=15m
JWT_ISSUER=quickdialog-api
JWT_AUDIENCE=quickdialog-web

REFRESH_TOKEN_TTL=7d
AUTH_SESSION_MAX_TTL=30d

SWAGGER_ENABLED=true
SWAGGER_PATH=docs

LOG_LEVEL=debug
```

Keep real secrets out of Git.

## Local setup

Install dependencies:

```bash
pnpm install
```

Generate the Prisma client:

```bash
pnpm db:generate
```

Validate the Prisma schema/config:

```bash
pnpm db:validate
```

Apply local migrations as required by your development workflow, then start the API:

```bash
pnpm start:dev
```

Typical local endpoints:

```text
API:     http://localhost:4099/api
Health:  http://localhost:4099/api/health
Swagger: http://localhost:4099/docs
```

Swagger is mounted only when `SWAGGER_ENABLED=true`.

## Tests

The project uses Vitest.
Unit tests cover isolated application behavior.
Integration tests use a real PostgreSQL instance through Testcontainers and apply Prisma migrations before running. The current suite covers authentication flows, hotel service and HTTP behavior, JWT validation, and both exception filters. Migration-specific tests are not part of the integration suite.

Useful commands:

```bash
pnpm test:unit
pnpm test:integration
pnpm test:all
pnpm test:coverage
```

The coverage workflow generates both summary and file-level reports for CI.

## Code quality

Before opening a PR, run:

```bash
pnpm db:generate
pnpm db:validate
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm build
```

CI runs the same quality checks before deployment.

## CI/CD

Pull requests targeting `production` (production) or `main` (pre-production) run CI.

Deployment follows this flow:

```text
PR -> CI -> merge PR -> CI on merged commit -> deploy if CI pass
```

Expected branch mapping:

```text
main          -> pre-production environment
production    -> production environment
```

Deployment must never run when the CI job fails.

## Useful commands

```bash
# development
pnpm start:dev

# production build
pnpm build
pnpm start:prod

# formatting / linting
pnpm format
pnpm lint
pnpm typecheck

# tests
pnpm test:unit
pnpm test:integration
pnpm test:all
pnpm test:coverage

# Prisma
pnpm db:generate
pnpm db:validate
pnpm db:format
pnpm db:migrate
pnpm db:studio
```

Check `package.json` for the exact scripts available in the current branch.

## Development guidelines

Keep changes straightforward.

- prefer explicit code over generic abstractions
- keep controllers thin
- keep business rules in services
- keep Prisma access close to the service that owns the behavior
- keep public API contracts documented in Swagger
- keep Zod and Swagger schemas aligned
- use `@Public()` only where authentication is intentionally not required
- never log credentials or tokens
- never commit `.env`
- keep migrations safe for existing production data
- remove temporary scripts and dead code instead of leaving them in the repository
- update this README when project behavior changes

## Release guidelines

- PR title follows [TICKET_ID] - TICKET TITLE
- PR is assigned to you
- At least one reviewer is added
- Jira ticket link is included
- Proof or verification notes are included (optional but useful)
- CI is passing
- Double check the code changes to avoid commit unnecessary files
