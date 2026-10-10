# Booking Service — Full Code Review

> Reviewed: 2026-09-23 · Project: Express 5 + TypeScript + Sequelize 6 + MySQL + Zod 4
> Severity legend: 🔴 broken (won't work / data risk) · 🟠 important (robustness/integrity) · 🟡 should fix · 🟢 nit / optional

---

## 1. HIGH-LEVEL OVERVIEW (re-orientation)

### 1.1 What this service is

A **booking microservice**. It owns exactly two jobs:

1. **`POST /booking`** — create a booking: validate the request → check idempotency → ask the Hotel service for the hotel + price → write a `bookingData` row → ask Payment → mark everything confirmed/failed.
2. **`GET /booking?bookingId=`** — look up a booking.

It talks to a **Hotel service** over HTTP (`localhost:7777`) and (planned) a **Payment service**. Data lives in **MySQL** via Sequelize: two tables, `idempotencyKey` and `bookingData`.

### 1.2 Request flow — POST /booking

```
Client
  │  POST /booking
  │  header: idempokey: <uuid>      body: { hotelId, totalGuests }
  ▼
┌────────────────────────────────────────────────────────────┐
│ bookingValidator  (middleware, utils/booking.validator.ts) │
│  • header present? (string check — good TS instinct)       │
│  • zod: hotelId > 0, totalGuests 1..100, key is a UUID     │
│  • validated object stashed at req.body.bookingData        │
└────────────────────────────────────────────────────────────┘
  ▼
┌────────────────────────────────────────────────────────────┐
│ bookingController  (orchestrator)                          │
│                                                            │
│  1. idempoService(key)                                     │
│       ├─ key NEW?        → create row (PROCESSING) → go on │
│       ├─ CONFIRMED/FAILED? → REPLAY stored response, stop  │
│       └─ PROCESSING?     → poll every 1s until it settles  │
│                                                            │
│  2. hotelService(hotelId)   → GET price from Hotel svc     │
│  3. bookingService(data)    → INSERT booking (PENDING)     │
│  4. paymentService(bookingId)                                │
│  5. finish: idempotency key → CONFIRMED/FAILED              │
│             booking       → SUCCESS/FAILED                  │
└────────────────────────────────────────────────────────────┘
```

### 1.3 The idempotency design — the heart of the project

This is the part that makes the project genuinely interesting, and the pattern you chose is the **correct, industry-standard one** (same shape Stripe/Google use):

```
              new request with key K
                      │
                      ▼
               ┌─────────────┐
               │ PROCESSING  │  (row exists the instant the request arrives)
               └─────────────┘
                │               │
   hotel not found,     hotel+booking+payment OK
   booking or payment   ┌───────────┐
   failed               │ CONFIRMED │  response + bookingId stored
                ┌──────────┐        └───────────┘
                │  FAILED  │  response stored
                └──────────┘

  duplicate request with key K (any time, even later):
     → the row already exists → reply with the STORED response,
       exactly the same answer as the first time. No double booking,
       no double charge.
```

Why the `PROCESSING` state exists (worth being able to say out loud): between "key saved" and "booking confirmed" the request is *in flight*. If the client retries **during** that window, a second request must not start a second booking — it must either wait (poll) for the first one to finish and replay its result, or (with a max wait) tell the client "your request is still being processed, try again". That's exactly what your polling loop is for.

### 1.4 Data model

```
idempotencyKey                bookingData
─────────────────────         ─────────────────────
id          PK, autoincr      bookingId   PK, autoincr
key         UUID, UNIQUE      hotelId
bookingId   → the booking     bookingAmount   (= amount × guests)
status      PROCESSING|       totalGuests
            CONFIRMED|FAILED  status    PENDING|SUCCESS|FAILED
response    JSON              createdAt / updatedAt
( stored reply
  to replay )
createdAt / updatedAt
```

One DB, two tables, so the idempotency row and the booking row can live and die in the same flow. (A real production system would also wrap "key → booking" confirmation in a DB transaction; not needed at this scale.)

### 1.5 Overall verdict

**Architecture: strong for a first project.** Layering (routing → validation → controller → service → repository → model) is clean and consistent, the idempotency design is conceptually right, and the in-code comments show you were actually thinking as you built it.

**Execution: has real gaps.** The gaps are not architectural — they're wiring, edge cases, and the one missing cross-cutting layer (error handling). The five things that matter most, in one breath:

1. 🔴 The GET route is wired to the **wrong controller**, and `getBooking` never sends a response → that endpoint is dead.
2. 🔴 `z.number()` on a **query string** always fails → GET can never pass validation even after #1.
3. 🔴 **No global error handler** — every `throw` in the codebase becomes an unstyled default Express 500, and validation errors send clients nothing useful.
4. 🔴 The idempotency "findOne then create" is **not atomic** — two truly concurrent duplicate requests can crash one of them with a unique-constraint violation.
5. 🔴 `paymentService` is a stub that **always fails** — so today, every booking ends `FAILED`.

Everything else in this document is ordered so you can work through it "from the very start, fixing as you go" — see **§3** for the exact sequence.

---

## 2. WALKTHROUGH — the code, from the very start

Order = the order a request (and your brain) meets the code: env/config → startup → routing → validation → controller → services → repositories → models → migrations → packaging/dead code.

### Stage 1 — Environment & config

**Files:** `.env`, `src/config/index.config.ts`, `src/config/config.js`, `src/config/sequelize.config.js`, `src/config/db.ts`, `.sequelizerc`

What's good:
- `index.config.ts` validates env at boot (throws if PORT/DB vars missing or PORT non-numeric) and compiles clean under `strict`. Solid.
- `dotenv.config()` runs before anything reads env. Good.

Issues:

| # | Sev | Where | Problem | Fix |
|---|-----|-------|---------|-----|
| 1.1 | 🔴 | `.sequelizerc` → `sequelize.config.js` | Both use **ESM `import` syntax in a CommonJS project** (no `"type": "module"` in package.json). `npx sequelize-cli db:migrate` requires this file as CJS and **crashes immediately** with `SyntaxError: Cannot use import statement outside a module`. Same applies to `config.js`. (If your tables exist, they were created some other way — GUI, `sync()`, or an earlier setup.) | Make both files CJS, e.g. `sequelize.config.js`: `require('ts-node/register'); module.exports = { development: {…}, test: {…}, production: {…} }` — and delete `config.js` or convert it too. |
| 1.2 | 🟠 | `db.ts` | `console.log(dbConfig.USERNAME)` — prints the DB **username to the console on every startup**. | Delete the line. (Credentials belong in logs-zero.) |
| 1.3 | 🟠 | repo root | No `.gitignore` in the dump. Your `.env` contains a real DB password. | Add `.gitignore`: `node_modules/ dist/ .env`; make sure `.env` never gets committed. |
| 1.4 | 🟡 | `index.config.ts` | `type serverConfiguration = { PORT: Number }` — capital `Number` is the wrapper-object type; the primitive type is `number`. Also `throw new Error` with no message is useless in logs. | `PORT: number`; `throw new Error('PORT is not a valid number')` etc. |
| 1.5 | 🟢 | `.env` | `DB_DIALECT = mysql` is never read (dialect is hard-coded in `db.ts` and `config.js`), and has spaces around `=`. Harmless — delete it or actually use it. | — |

### Stage 2 — Process start & packaging

**Files:** `src/server.ts`, `package.json`, `tsconfig.json`

What's good:
- Fail-fast start: `testConnection()` only then `app.listen`. Correct instinct.
- tsconfig (`strict`, ES2022, CommonJS) is fine for Express 5.

Issues:

| # | Sev | Where | Problem | Fix |
|---|-----|-------|---------|-----|
| 2.1 | 🔴 | `server.ts` | **No error-handling middleware at all.** The codebase `throw`s in ~7 places (validator, controller, repo). Express 5 *does* forward async rejections to error middleware — but there is none, so every failure becomes the default HTML 500, and your "Abhi error handling ki nahi hai" comments have no place to live yet. This is the single most valuable missing piece. | Add `src/middleware/errorHandler.ts`: an `AppError` class (`statusCode`, `message`), a `notFound` handler, and a 4-arg error middleware that maps `ZodError`→400, `UniqueConstraintError`→409, `AppError`→its code, else→500, always as JSON. Mount it **last** in `server.ts`. Then replace the ugly `throw new Error("…")` in the validator with proper 400s (or `next(err)`). |
| 2.2 | 🟡 | `server.ts` | On DB failure: `console.error("❌ Connection failed:")` prints nothing useful, then throws a **new** generic error, swallowing the real cause; the process then just dies quietly. | `console.error(error)` (the real one), `process.exit(1)`. |
| 2.3 | 🟡 | `server.ts` | No CORS. Fine while only other services call it; the moment a browser frontend calls it, requests will be blocked. | Add `cors()` (or manual headers) when a frontend appears. |
| 2.4 | 🟢 | `package.json` | `main: "index.js"` — no such file. `mysql` (v2, deprecated) is a dependency but **never used** (Sequelize uses `mysql2`). `nodemon` belongs in devDependencies. No `build`/`start` scripts for production. | `"main": "dist/server.js"`, `npm i -D nodemon`, `npm rm mysql`, add `"build": "tsc"`, `"start": "node dist/server.js"`. |

### Stage 3 — Routing

**Files:** `src/Routing/v1Router/index.router.ts`, `src/Routing/booking.router.ts`

| # | Sev | Problem | Fix |
|---|-----|---------|-----|
| 3.1 | 🔴 | **`bookingRoute.get('/booking', bookingIdValidator, bookingController)`** — the GET route runs the entire *create* flow. On a GET there is no `req.body.bookingData`, so the controller dies on `req.body.bookingData.idempokey` (TypeError → 500). The handler you wrote for this (`getBooking`) is never used. | `bookingRoute.get('/booking', bookingIdValidator, getBooking)` |
| 3.2 | 🟡 | Folder is `v1Router` but routes are mounted at `/booking`, not `/api/v1/booking` — while your Hotel service uses `/api/v1/…`. Two URL conventions in one project. | `v1Router.use('/api/v1', bookingRoute)` (or rename the folder). Pick one, be consistent. |

### Stage 4 — Validation (`src/utils/booking.validator.ts`)

What's good:
- The header check (`typeof req.headers.idempokey !== 'string'`) before touching it — your comment there shows you understood why TS complains. Correct handling.
- Enforcing UUID shape on the key, not just string. Correct — the key is an idempotency **token**, garbage-in is a real risk.
- Stashing the cleaned object on `req.body.bookingData` and letting the controller work with one typed shape. Pragmatic and fine.

Issues:

| # | Sev | Problem | Fix |
|---|-----|---------|-----|
| 4.1 | 🔴 | `bookingIdValidator`: `z.number()` against `req.query.bookingId`. **Query params are always strings** — `"12"` fails `z.number()` 100% of the time. GET can never pass. | `z.coerce.number().int().positive()` |
| 4.2 | 🔴 | Both validators `throw new Error("…")` on failure with the actual zod details only in `console.log`. Client gets a bare 500 (no error handler, §2.1), and the useful `result.error` is lost. | `res.status(400).json({ message: 'Validation failed', issues: result.error.issues })` — this is exactly the data you already have from `safeParse`. |
| 4.3 | 🟠 | `totalGuests: z.number().positive().max(100)` and `hotelId: z.number().positive()` have **no `.int()`** — a request with `totalGuests: 2.5` passes validation and you'd multiply the price by 2.5. | Add `.int()` to both. |
| 4.4 | 🟡 | `z.uuid()` is **deprecated in Zod 4** (you're on 4.4.3); it dies in Zod 5. | `z.string().uuid()` |
| 4.5 | 🟡 | `bookingId: z.number().positive().max(20).min(5)` — why must a booking id be between 5 and 20? Looks like leftover experimentation; any id ≥ 3 is rejected today. | Just `.int().positive()`. |
| 4.6 | 🟢 | `import { HostNotFoundError } from "sequelize"` — unused and random. `console.log(result)` on every successful parse. `idempokey` (missing the *t*) is a consistent typo across ~15 files — renaming is optional, but `idempotencyKey` would read better; if you rename, do it in one pass (sed across `src/`). | Clean up. |

### Stage 5 — Orchestration (`src/controllers/booking.controller.ts`)

What's good:
- The controller is a proper orchestrator: it doesn't touch the DB directly, it sequences idempotency → hotel → booking → payment → finalization, and every failure branch stores a response in the idempotency table **before** replying. That ordering (persist the verdict, then respond) is exactly right.
- The comments thinking out loud about status codes (404 for payment?) show real judgment — you caught your own mistake in writing.

Issues:

| # | Sev | Problem | Fix |
|---|-----|---------|-----|
| 5.1 | 🔴 | `getBooking`: `const booking = findBookingById(req.body.bookingId); return booking;` — no `await`, no `res.json`. The handler returns a Promise into the void and **never sends a response → the client hangs until timeout**. Even when found, nothing is sent. | ```ts\nexport const getBooking = async (req, res) => {\n  const booking = await findBookingById(req.body.bookingId);\n  return res.status(200).json({ success: true, data: booking });\n}\n``` and make the repo's not-found throw an `AppError(404)` (§2.1) instead of a generic Error. |
| 5.2 | 🟠 | Replay path: `res.send(IdempoResult.response)` always goes out as **HTTP 200** — a replayed *failed* booking (stored `statusCode: 404/500`) still looks successful at the HTTP level. | `res.status(saved.statusCode).json(saved)` |
| 5.3 | 🟠 | Payment failure: stored response says `statusCode: 404` but the client is sent `500`, and 404 is semantically "resource not found" — your own comment says so. Distinguish: **payment declined → 402**, **payment service down/timeout → 502/504**. Pick one, store it, send the same one. | Keep the two responses consistent; `402` is the clean choice for "payment not received". |
| 5.4 | 🟠 | **Stuck states.** If the process crashes between steps 2–5, the idempotency key stays `PROCESSING` and the booking stays `PENDING` **forever** — and the *other* request's poller (§6.2) spins on it forever too. Learning project: acceptable. Production: add (a) a max wait on the poller, and (b) a "reaper" that force-fails `PROCESSING` rows older than N minutes / `PENDING` bookings older than N minutes. Know this answer — it's a classic interview follow-up on exactly this design. | Cap the poll now (§6.2); note the reaper as a known limitation. |
| 5.5 | 🟢 | 5 levels of nesting; `if (IdempoResult == undefined)` is dead code (the service throws, never returns undefined). | Early returns after `res.send`/failure branches; drop the dead check. |

### Stage 6 — Services

**`idempotency.service.ts`**

What's good: the three-state branching (new / terminal / processing) is complete and the polling loop is correctly non-blocking (`await new Promise(setTimeout)` — your comment "without blocking CPU" shows you know why).

| # | Sev | Problem | Fix |
|---|-----|---------|-----|
| 6.1 | 🔴 | **The race (the big one).** In `idempotencyRepo` (§7.1), `findOne` then `create` are two separate round-trips. Two concurrent requests with the same key both see "no row", both `create` — one wins, the other gets `UniqueConstraintError` → unhandled → 500. In a retry storm (the exact scenario idempotency exists for) this will happen. | In the repo's create path: `try { create } catch (e) { if (e instanceof UniqueConstraintError) { const row = await findOne(...); return { response: row, success: false } } throw e }`. The unique index turns a *crash* into a *normal "already exists"* — that's the whole trick. |
| 6.2 | 🔴 | **Unbounded poll.** If the owner of a `PROCESSING` row crashed (§5.4), this loop retries forever: the client's request never completes and each stuck key leaks a polling timer. | Count attempts: ~10 × 1s → return a 409 `{ message: 'Previous request still processing, retry shortly' }`. |
| 6.3 | 🟡 | The `success` flag is overloaded: `success: false` means "replay this stored response", not "your booking failed" — two different things wearing one boolean. Works today because the controller always knows it's a replay, but it's a future bug magnet. | Return a discriminated union: `{ status: 'created' }` / `{ status: 'replay', response }` / `{ status: 'processing', retryAfterMs }`. (Great interview talking point: "I'd refine the service contract to make replay vs failure explicit.") |
| 6.4 | 🟢 | `import { success } from "zod"` unused (here and in `hotel.service.ts`); `idempoDBCallFailure/Confirmed` don't `await` the inner repo call before returning it (harmless — the controller awaits the outer promise — but add `await` for clarity); the double-dot `result.response.response` is correct but dizzying. | Clean up. |

**`hotel.service.ts`**

| # | Sev | Problem | Fix |
|---|-----|---------|-----|
| 6.5 | 🔴 | **Zero error handling.** Hotel service down / wrong shape / timeout → `fetch` rejects or `response.json()` throws → unhandled → 500 with no message. And no timeout at all: a hung hotel service holds your request hostage indefinitely. | `const r = await fetch(url, { signal: AbortSignal.timeout(3000) }); if (!r.ok) throw new AppError(502, 'Hotel service unavailable'); const result = await r.json();` wrapped in try/catch. |
| 6.6 | 🟠 | `http://localhost:7777` hard-coded. The moment this runs on a laptop with a different port, or in a container, it breaks silently. | `process.env.HOTEL_SERVICE_URL` (add to `.env`; read through `index.config.ts`). |
| 6.7 | 🟢 | You assume the hotel service replies `{ success, response: { amount } }` — an implicit contract, no shared type. Fine at this scale; a small `HotelResponse` type (or shared schema) would make the assumption visible. | — |

**`booking.service.ts`**

| # | Sev | Problem | Fix |
|---|-----|---------|-----|
| 6.8 | 🟢 | `bookingService` is not `async` but returns a promise (works — controller awaits it — but misleading). `hotelID` (DTO) vs `hotelId` (model) naming mismatch across the mapping. | Add `async`, align names. |
| 6.9 | 🟢 | `totalAmount = amount × totalGuests` — the per-guest pricing rule lives here silently. One line of comment stating the business rule would save future-you. | — |

**`payment.booking.service.ts`**

| # | Sev | Problem | Fix |
|---|-----|---------|-----|
| 6.10 | 🔴 | **The stub always fails**, so *every* booking currently ends `FAILED` at step 4 — the happy path of your whole service is unreachable today. Also `...paymentService` spreads the *function itself* into the returned object (harmless, but nonsense). | Either (a) a mock that succeeds — `return { success: true, response: { paymentId, status: 'PAID' } }` — so the flow is demoable, or (b) a real fetch to a payment service exactly like `hotelService` (env URL + timeout + try/catch). Return `{ success, response }` — same shape as the hotel service, and drop the spread. |

### Stage 7 — Repositories

**`idempotency.repository.ts`**

What's good: the split between "check-or-create" (`idempotencyRepo`), "read by id" (`idempoIdChecker`) and the two terminal updaters is clean; the comments correctly note that `update` only returns a row-count, so the response payload is built by the caller.

| # | Sev | Problem | Fix |
|---|-----|---------|-----|
| 7.1 | 🔴 | See §6.1 — the **findOne→create race** lives here. Fix = catch `UniqueConstraintError` on create, re-read, return "exists". This + the unique index (which your model has) is the complete fix. | — |
| 7.2 | 🟢 | `idempoIdChecker` returns `findByPk(id)` — fine. Updates use `where: { key }` — fine, and fast because `key` is unique-indexed. | — |

**`booking.repository.ts`**

| # | Sev | Problem | Fix |
|---|-----|---------|-----|
| 7.3 | 🟠 | `bookingRepoIdFinder` throws a **generic** `Error('Booking Not found')` → 500 instead of 404. With the error handler (§2.1) this becomes one line: `throw new AppError(404, 'Booking not found')`. | — |
| 7.4 | 🟢 | `bookingRepo` — fine. Note (your comment says it too): duplicate-safety is delegated to the idempotency layer; there's deliberately no unique constraint on `(hotelId)`. That's a valid design; just be ready to say *why* in an interview. | — |

### Stage 8 — Models

**`booking.model.ts`**

| # | Sev | Problem | Fix |
|---|-----|---------|-----|
| 8.1 | 🟡 | `bookingAmount: DataTypes.INTEGER`. If prices ever carry paise/cents (they will — `249.99 × 3`), integers silently truncate. Currency columns should be `DataTypes.DECIMAL(10, 2)`. | DECIMAL now or in the next migration. Classic interview point — know it. |
| 8.2 | 🟢 | PK `bookingId` declared `allowNull: true`. PKs shouldn't be nullable. | `allowNull: false`. |
| 8.3 | 🟢 | `DataTypes.ENUM(...Object.values(BookingStatusEnum))` — good pattern, DRY via the enum. | — |

**`idempotencyKey.model.ts`**

| # | Sev | Problem | Fix |
|---|-----|---------|-----|
| 8.4 | 🟢 | `import { v4 as uuidv4 } from 'uuid'` — imported, never used (MySQL generates nothing here; the *client* sends the key). Either remove the import (and the dep) or actually use it. | — |
| 8.5 | 🟢 | `response: DataTypes.JSON` with your comment explaining why a TS type can't be a column type — that comment is genuinely good, keep it. `key` UUID + `unique: true` — correct. | — |

### Stage 9 — Migrations

| # | Sev | Problem | Fix |
|---|-----|---------|-----|
| 9.1 | 🔴 | `20260827…-create-idempotencyKey.ts`: **both** `id` and `key` are marked `primaryKey: true` → the table's primary key is a **composite `(id, key)`**, which doesn't match the model (where only `id` is PK). It works today by luck (all ORM queries go through `id` or the unique index on `key`), but it's a schema/model mismatch you don't want an interviewer — or a future DBA — finding. Also `defaultValue: DataTypes.UUIDV4` on `key` is meaningless (the app always supplies the key). | Remove `primaryKey: true` (and the default) from `key`; keep `unique: true`. Then `npx sequelize-cli db:migrate:undo` + `db:migrate` (or drop the table and re-run) so the live schema matches. |
| 9.2 | 🟠 | Both migrations **import from `../models/…`** for the enums. Importing a model file executes `Model.init(sequelize)` against the *other* Sequelize instance (`config/db.ts`), i.e. a side effect at migration time — and if `.env` is missing, the migration crashes on import for a reason that looks unrelated. Migrations should be self-contained history. | Inline the enum values as plain string arrays in the migration (duplicating three strings is the *correct* amount of duplication — a migration is a historical document, not living code). |
| 9.3 | 🟢 | `status` in the idempotency migration: `allowNull: false` but no `defaultValue` (the model has one). ORM inserts always pass it, so it's harmless — add `defaultValue: 'PROCESSING'` anyway for consistency. | — |

### Stage 10 — Dead code & packaging

| # | Sev | Problem | Fix |
|---|-----|---------|-----|
| 10.1 | 🟠 | `src/db/models/index.js` — the stock sequelize-cli scaffold. It `require`s `../config/config.json` **which doesn't exist** (you have `config.js`), it only loads `.js` models (yours are `.ts`), and nothing in the app imports it. It would crash if touched and confuses anyone reading the repo. | **Delete it.** Your models are registered by being imported, via `config/db.ts`. |
| 10.2 | 🟠 | `src/utils/waiting.idempoProcessing.ts` — half-finished scratch: `sleeper` calls `waiter` which calls `sleeper` again **without ever sleeping** (the real sleep logic is commented out); the actual polling lives in `idempotency.service.ts`. | **Delete it** (or finish it as a reusable `pollUntil(fn, {interval, maxAttempts})` helper — which is a genuinely nice little utility if you want it). |
| 10.3 | 🟢 | Leftover commented lines in `booking.router.ts`; `main`/scripts per §2.4. | Sweep. |

---

## 3. FIX PLAN — do it in this order

You said you want to start from the very beginning and fix as things come up. This is that sequence — each step is small, each one is verifiable with a `curl` before you move on.

**Phase 1 — Make both endpoints actually work (wiring)**
1. `booking.router.ts` — GET → `getBooking` (§3.1)
2. `booking.controller.ts` — rewrite `getBooking`: `await` + `res.status(200).json(...)` (§5.1)
3. `booking.validator.ts` — `bookingIdValidator`: `z.coerce.number().int().positive()`, drop `min(5).max(20)`, return 400 JSON with `result.error.issues` (§4.1, 4.2, 4.5)
4. `booking.validator.ts` — `bookingValidator`: add `.int()` to both numbers, `z.string().uuid()`, return 400 JSON on failure instead of throw (§4.2, 4.3, 4.4)
   ✅ *checkpoint: `curl -X GET localhost:3006/booking?bookingId=1` → 404 JSON; bad input → 400 with field errors.*

**Phase 2 — The error-handling layer (makes everything below trustworthy)**
5. `src/middleware/errorHandler.ts` — `AppError` + 404 handler + global error middleware (ZodError→400, UniqueConstraintError→409, AppError→its code, else 500); mount last in `server.ts` (§2.1)
6. `booking.repository.ts` — not-found → `AppError(404)` (§7.3)
   ✅ *checkpoint: kill your DB, restart server → clean error log + exit(1), not a silent death.*

**Phase 3 — Make idempotency real (the part interviewers will poke at)**
7. `idempotency.repository.ts` — catch `UniqueConstraintError` on create → re-read → treat as existing (§6.1/§7.1)
8. `idempotency.service.ts` — cap the poll at ~10 × 1s → 409 "still processing" (§6.2)
9. `booking.controller.ts` — replay with stored status: `res.status(saved.statusCode).json(saved)` (§5.2)
10. Migration — remove `primaryKey` from `key`; re-migrate the table (§9.1)
   ✅ *checkpoint: fire the same POST twice with the same key, even simultaneously (two terminals) → one creates, the other gets the identical stored response. No 500s.*

**Phase 4 — External services stop being landmines**
11. `hotel.service.ts` — env-config URL + `AbortSignal.timeout(3000)` + try/catch → `AppError(502, 'Hotel service unavailable')` (§6.5, 6.6)
12. `payment.booking.service.ts` — implement: mock-success (demoable happy path) or real fetch like hotel's; `402` for declined, keep stored & sent status codes identical (§6.10, 5.3)
   ✅ *checkpoint: full happy path → booking SUCCESS, key CONFIRMED, `GET /booking?bookingId=X` returns it. Hotel service killed → clean 502.*

**Phase 5 — Hygiene pass (15 minutes, big polish)**
13. Delete: `db/models/index.js`, `utils/waiting.idempoProcessing.ts`; remove unused imports (`success` from zod ×2, `HostNotFoundError`, `uuid` v4); remove `console.log(dbConfig.USERNAME)`, `console.log(result)`, stray commented lines
14. Add `.gitignore` (`.env`, `node_modules/`, `dist/`); `package.json`: `main`→`dist/server.js`, move `nodemon` to devDeps, drop `mysql`, add `build`/`start` scripts; fix `sequelize.config.js` to CJS (§1.1)
15. Migrations: inline enum strings instead of importing models (§9.2)

**Stretch (when you're done with all of the above)**
- `bookingAmount` → `DECIMAL(10,2)` (§8.1)
- A `pollUntil(fn, {intervalMs, maxAttempts})` helper replacing the inline poller (§10.2)
- Discriminated-union return type from `idempoService` (§6.3)
- A smoke test (supertest + a throwaway MySQL, or `sequelize.sync()` on a test DB): create → duplicate → replay
- `docker-compose.yml` with MySQL so the whole thing runs in one command

---

## 4. BONUS — if anyone asks about this project (interview ammo)

You don't need all of this, but these four lines are cheap to know and land well:

- **"Why the PROCESSING state?"** — to make the *first* request and any *concurrent duplicates* serialize on a single row: duplicates can't start a second booking while the first is in flight; they either wait (poll) and replay, or get a 409.
- **"How do you stop the duplicate-creation race?"** — unique index on `key` + catch `UniqueConstraintError` on insert and fall back to read. The constraint, not the check, is the source of truth.
- **"What if the process dies mid-booking?"** — honest answer: today the key sits PROCESSING; production needs a max-wait on pollers + a reaper job that expires stale PROCESSING/PENDING rows. Saying "here's the gap and here's the fix" is worth more than pretending there isn't one.
- **"Why store the whole response in the idempotency table?"** — replay must be byte-identical and must survive the original row changing; the idempotency table becomes the system of record for "what did we answer for this key".

Solid first project — the design head was in the right place; this list is just tightening the hands. Work through Phase 1→2 first and the whole thing feels different.
