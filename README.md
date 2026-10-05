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
│   │   ├── guards/
│   │   └── logging/
│   ├── config/
│   ├── database/
│   ├── health/
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
HTTP request -> Fastify -> Global guards / validation -> Controller -> Service -> Prisma / external integration -> PostgreSQL
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

Refresh tokens are stored in an HttpOnly cookie and are not stored in plaintext in the database (hashed).

### Access token behavior

Access tokens are stateless. Logging out revokes refresh sessions, but an already-issued access token remains valid until its normal expiration time.

Keep access-token TTL short for that reason.

## Validation

Request validation uses Zod through Nest `StandardSchemaValidationPipe` (Build-in).

Example:

```ts
@Body({ schema: loginRequestSchema })
input: LoginDTO
```

Do not add a parallel `class-validator` DTO layer unless the project validation strategy changes.

Environment variables are also validated before the application starts.

## Error responses

`GlobalExceptionFilter` normalizes API errors into one response shape (uniform)

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

Swagger is kept separate from controller logic

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

Swagger contribution rules are documented in: [[Guidelines](./src/swagger/README.md)]

When an API contract changes, update the implementation, validation, Swagger documentation and tests in the same PR.

## Database and Prisma

`DatabaseModule` exposes a single `PrismaService` dont DI is already have global injection.

```text
Service -> PrismaService -> PrismaPg adapter -> PostgreSQL
```

Prisma CLI and the running application can use separate database credentials.

Recommended environment variables (Future):

```env
DATABASE_URL=postgresql://quickdialog_app:password@localhost:5432/quickdialog
DIRECT_URL=postgresql://quickdialog_migrator:password@localhost:5432/quickdialog
SHADOW_DATABASE_URL=postgresql://quickdialog_migrator:password@localhost:5432/quickdialog_shadow
```

Usage:

```text
DATABASE_URL -> NestJS runtime

DIRECT_URL -> Prisma CLI / migrations

SHADOW_DATABASE_URL -> prisma migrate dev only
```

Production normally needs only `DATABASE_URL` and `DIRECT_URL` (NOW WE USE ONLY `DATABASE_URL`)

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
Integration tests use a real PostgreSQL instance through Testcontainers and apply Prisma migrations before running.

Useful commands:

```bash
pnpm test:unit
pnpm test:integration
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

Pull requests targeting `main` (production) or `staging` (pre-production) run CI.

Deployment follows this flow:

```text
PR -> CI -> merge PR -> CI on merged commit -> deploy if CI pass
```

Expected branch mapping:

```text
staging -> pre-roduction environment
main    -> production environment
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
