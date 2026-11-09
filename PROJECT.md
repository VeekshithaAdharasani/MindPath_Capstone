# Project: MindPath Onboarding & Authentication Resilience

## Architecture
- **Server Framework**: Node.js / Bun with Express (`server.ts`, bundled into `api/index.js` via esbuild for Vercel Serverless).
- **Client Framework**: React 18 with Vite, TypeScript, Tailwind CSS, Lucide icons.
- **Database Engine**: Turso Cloud Database (`@libsql/client`, SQLite/libSQL dialect) with 14 application tables.
- **External AI Services**: Enzonic AI / OpenAI client (`src/lib/services/enzonic-ai.ts`) targeting model `nvidia/nemotron-3-ultra-550b-a55b`.
- **Authentication**: Local credentials with Scrypt hashing (`crypto.scryptSync`), client-side state stored in `localStorage` (`mindpath_user`), and requests identified via `x-user-id` HTTP header and request body `userId`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Auth Registration Alias & Normalization | Provide `/api/user/register` alias alongside `/api/user/create`, normalize email trimming/lowercase, ensure reliable user creation | M1 | Survey / ORIGINAL_REQUEST §R2 |
| 2 | Login Flow Reliability | Prevent 401 Unauthorized errors on `/api/user/login` immediately post-registration, ensure correct password verification and user state | M1 | Survey / ORIGINAL_REQUEST §R2 |
| 3 | Server-Side Onboarding Timeout Protection | Wrap external LLM calls in `/api/onboarding/complete` with ~7s timeout protection and parallel execution | M2 | Survey / ORIGINAL_REQUEST §R1 |
| 4 | Curated Curriculum & Quiz Fallback | Implement rich, deterministic curated career roadmaps and diagnostic quiz fallback data when LLM exceeds timeout or fails | M2 | Survey / ORIGINAL_REQUEST §R1 |
| 5 | Latent Bug Fix: Assessment Table Reference | Fix `server.ts:553` querying non-existent `assessments` table to use `quiz_attempts` | M2 | Survey |
| 6 | Client-Side Error & Non-JSON Handling | Make `OnboardingTour.tsx` safely handle non-200 and non-JSON responses without unhandled syntax error crashes | M3 | Survey / ORIGINAL_REQUEST §R1 |
| 7 | Client User Identity Passing | Ensure `OnboardingTour.tsx` passes `userId` in both `x-user-id` header and request body to prevent auth resolution failure | M3 | Survey / ORIGINAL_REQUEST §R1, R2 |
| 8 | Hermetic Smoke & Integration Test Suite | Automated test suite in `tests/smoke.test.ts` covering auth, onboarding fallback, and response error handling | M4 | Survey / ORIGINAL_REQUEST §R3 |
| 9 | Verification & Static Checks | Zero type errors (`bun run check`), all tests passing (`bun test`), clean production build (`bun run build`) | M4 | ORIGINAL_REQUEST §R3 |
| 10 | Complete Database Reset | Safely clear all records across 14 application tables in strict reverse-dependency order with 0-row verification | M4 | Survey / ORIGINAL_REQUEST §R4 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Authentication & Registration Resilience | Add `/api/user/register` alias, normalize credentials in `server.ts`, verify login | none | DONE |
| 2 | Server Onboarding & Fallback Engine | Implement ~7s timeout, parallel execution, curated curriculum/quiz fallback in `server.ts` & `enzonic-ai.ts`, fix line 553 | M1 | DONE |
| 3 | Client Onboarding Robustness | Update `OnboardingTour.tsx` with safe response parsing, user feedback on error, body `userId` | M2 | DONE |
| 4 | Verification Suite & Database Reset | Implement `tests/smoke.test.ts`, run `bun run check`, `bun test`, `bun run build`, execute 14-table database reset | M3 | DONE |

## Interface Contracts
### Client ↔ Server: Authentication
- `POST /api/user/create` AND `POST /api/user/register`:
  - Request body: `{ name: string, email: string, password: string, educationLevel?: string, careerInterest?: string }`
  - Response (201/200): `{ ok: true, user: { id: string, name: string, email: string, streakDays: number, onboardingCompleted: boolean, ... } }`
  - Response (400): `{ error: string }`
  - Response (409): `{ error: 'User with this email already exists' }`
- `POST /api/user/login`:
  - Request body: `{ email: string, password: string }`
  - Response (200): `{ ok: true, user: { id: string, name: string, email: string, streakDays: number, onboardingCompleted: boolean, ... } }`
  - Response (401): `{ error: 'Invalid email or password' }`

### Client ↔ Server: Onboarding
- `POST /api/onboarding/complete`:
  - Request headers: `{ 'Content-Type': 'application/json', 'x-user-id': string }`
  - Request body: `{ userId?: string, educationLevel: string, careerInterest: string, targetExam?: string, location?: string, bio?: string, avatarUrl?: string }`
  - Maximum execution duration: <= 7.5 seconds
  - Response (200): `{ ok: true, user: UserObject }`
  - Response (401): `{ error: 'User must be authenticated' }`
  - Response (400/500): `{ error: string }`

### Fallback Generator Interface (`enzonic-ai.ts`)
- `generateCareerPath(careerGoal: string, timeoutMs?: number): Promise<CareerPathPlan>`
  - Guarantees return of valid `CareerPathPlan` with >= 6 levels and milestone details within timeoutMs (~7000ms).
- `generateQuiz(topic: string, level: string, count: number, timeoutMs?: number): Promise<GeneratedQuiz>`
  - Guarantees return of valid `GeneratedQuiz` with >= count questions and valid choices within timeoutMs (~7000ms).

## Code Layout
- `server.ts`: Server routes, authentication endpoints, onboarding endpoint, assessment query fix.
- `src/lib/services/enzonic-ai.ts`: AI services, timeout wrappers, curated curriculum and quiz fallbacks.
- `src/components/onboarding/OnboardingTour.tsx`: Client-side onboarding flow, request dispatcher, safe response parser.
- `tests/smoke.test.ts`: Hermetic unit and smoke test suite executable via `bun test`.
- `scripts/reset-db.ts`: Complete database reset script clearing 14 application tables in reverse dependency order.
