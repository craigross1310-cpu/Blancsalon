# BLANC Salon — website & booking system

A premium website and booking-management system for **BLANC Salon** (Skin · Aesthetics · Wellbeing — Instagram [@blanc_salon_21](https://www.instagram.com/blanc_salon_21/)).

Clients browse the menu, see live availability, request an appointment and immediately get the deposit amount, bank-transfer details and a unique payment reference. The owner checks her own bank, taps **“Deposit received — confirm booking”**, and the client is emailed automatically. No more arranging every appointment over Instagram DMs.

> **Status: client demo.** Prices come from BLANC's Instagram price lists; anything not published there (policies, bank details, hours, address, durations, deposit amounts, some full treatment names) is a clearly-marked placeholder. See [`docs/HANDOVER.md`](docs/HANDOVER.md) for the list of what BLANC needs to supply.

![Home](docs/screenshots/00-mobile-home.jpg)

## What works

| Area | Highlights |
| --- | --- |
| **Website** | Home, Treatments & prices, About, Contact, Policies, Privacy. Mobile-first, black / chrome / champagne-gold branding taken from BLANC's logo and price-list posts. |
| **Booking engine** | 4-step booking flow → treatment, live calendar & times, details, review + policy agreement. Respects working hours per day, breaks, owner-blocked time, treatment duration, a buffer between clients, minimum notice and how far ahead clients can book. |
| **Deposits** | Per treatment: **fixed £** or **percentage %**, or 0 for none. Live preview of deposit + balance while editing. Integer-pence maths with half-up rounding. The price and deposit rule are **snapshotted on every booking**, so later changes never alter existing bookings. |
| **Double-booking protection** | Availability check + serialised booking writes + a **Postgres exclusion constraint** (`bookings_no_overlap`) that makes overlapping bookings impossible at database level, including pending requests. |
| **Pending → confirmed** | Requests are `PENDING PAYMENT` and hold the slot until the configurable deadline. Unpaid requests **expire automatically** (on every availability check, every dashboard load, and a daily cron) and the client is emailed. |
| **Manual payment confirmation** | Owner records date, amount, method and notes. Statuses: deposit pending → deposit received → paid in full / refunded. Everything is labelled *“recorded manually”* — the software never claims to verify payments. |
| **Owner dashboard** | Overview (today, upcoming, requests, pending deposits, confirmed, cancelled, recorded deposits, outstanding balances), calendar (day / week / month, colour-coded), bookings with search and filters, booking detail (confirm, decline, cancel, move, attendance, payments, refunds, notes, contact by email / call / SMS / WhatsApp, activity log), payments with **CSV export** for bookkeeping, treatments, availability, clients, email log and settings. |
| **Notifications** | Branded emails: request received + deposit instructions, confirmed, declined, cancelled, expired, reminder, rescheduled; owner: new request / pending deposit, confirmation, cancellation request. Sent through Resend when configured; otherwise captured in **Dashboard → Emails** so they can be shown in the demo. Channels are pluggable (SMS / WhatsApp ready). |
| **Customer self-service** | Private booking page (unguessable link) with live status, copyable bank details, deadline, “add to calendar” (.ics) and a cancellation-request form. |
| **Security & GDPR** | Signed, HTTP-only session cookies, scrypt password hashing, login rate limiting, owner / staff roles, server-side validation on every action, Row Level Security enabled on every table (deny-by-default to Supabase's public API), formula-injection-safe CSV, security headers, `noindex` admin, automatic anonymisation of inactive clients after a configurable retention period, privacy notice draft. |

## Run the demo locally (no setup)

```bash
npm install
npm run dev
# http://localhost:3000            website
# http://localhost:3000/admin      dashboard — owner@blanc.demo / blanc-demo
```

With no `DATABASE_URL` the app runs in **demo mode** on an embedded Postgres (PGlite) stored in `.data/`, pre-loaded with BLANC's menu, placeholder settings and fictional sample bookings. Delete `.data/` to reset.

## Host the client demo on Vercel

**Zero configuration:** import the GitHub repo into Vercel ([vercel.com/new](https://vercel.com/new) → *Import* `Blancsalon` → *Deploy*). No environment variables are needed — the site runs in demo mode with the embedded database, BLANC's menu and sample bookings. Every later `git push` redeploys automatically.

* Dashboard: `/admin` → `owner@blanc.demo` / `blanc-demo` (set `DEMO_ADMIN_PASSWORD` in Vercel to change it).
* Demo data lives in the server's temporary storage, so it **resets to fresh sample data** when Vercel recycles the server (e.g. after a quiet spell). Perfect for showing the client; not for real bookings.

**Persistent demo (optional):** to keep test bookings between visits, connect a free Supabase Postgres:

1. Create a Supabase project and copy **Project Settings → Database → Connection string → Transaction pooler** (port 6543).
2. Load the schema + demo data: `DATABASE_URL="postgres://…" npm run db:migrate -- --demo`
3. In Vercel set `DATABASE_URL`, `SESSION_SECRET` (≥ 32 random chars), `SITE_URL`, `CRON_SECRET` and `SHOW_DEMO_BANNER=true`, then redeploy.

## Going live

1. Create a fresh database: `DATABASE_URL=… npm run db:migrate -- --seed-menu` (menu only, no sample data).
2. Create the owner login: `DATABASE_URL=… npm run db:seed-owner -- owner@blancsalon.co.uk "Owner name"`.
3. Email: create a [Resend](https://resend.com) account, verify the salon's domain, set `RESEND_API_KEY` and `EMAIL_FROM`.
4. Optional images bucket: create a public Supabase Storage bucket `treatment-images` and set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
5. In the dashboard: complete **Settings** (business details, bank details, policies, owner email), **Availability** (real hours) and every treatment flagged **“To confirm”**; then switch off **“Show to-confirm notices”**.
6. Backups: Supabase takes daily backups automatically (Pro plan adds point-in-time recovery). The Payments page also exports CSVs for the accountant.
7. Cron: `vercel.json` runs `/api/cron` daily (Vercel Hobby limit). On Vercel Pro change it to hourly for more timely reminders; expiry already happens instantly whenever availability is checked.

## Architecture

```
src/
  app/(site)/          public website, booking flow, private booking page
  app/admin/           login, dashboard pages, server actions (all guarded by requireAdmin)
  app/api/             availability, booking requests, .ics, cron, CSV export
  lib/core/            pure logic: deposits, money, UK time zone, slot generation
  lib/booking/         availability + booking lifecycle service
  lib/notify/          email templates, delivery channels, outbox
  lib/db/              driver abstraction (PGlite | postgres.js), migrations, seed, BLANC catalogue
  lib/auth/            password hashing, signed sessions
tests/                 unit tests + full booking-engine integration tests
scripts/               migrate, create-owner, end-to-end browser test
```

* **Next.js 15 (App Router) + TypeScript + Tailwind CSS 4.** Server components and server actions — no database credentials ever reach the browser.
* **Postgres** via `DATABASE_URL` (Supabase recommended) or embedded PGlite in demo mode — the same SQL and constraints run in both.
* Money is stored as integer pence; times as UTC and shown in `Europe/London` (GMT/BST handled).
* **Data model:** `treatments`, `customers`, `bookings` (with price/deposit snapshot), `payments`, `opening_hours`, `time_blocks`, `settings`, `admin_users`, `booking_events` (audit trail), `notifications` (outbox).

### A note on authentication

The brief suggested Supabase Auth. The dashboard currently uses its own small, audited auth layer (scrypt + HMAC-signed cookies + roles), so the same build works with any Postgres, in demo mode, and in tests. Because all data access is server-side, Supabase's public API is locked down with RLS and no policies. Swapping in Supabase Auth later only touches `src/lib/auth/session.ts`.

## Tests

```bash
npm test                                               # unit + integration tests on embedded Postgres
TEST_DATABASE_URL=postgres://… npm test                 # …and against a real PostgreSQL server too
npm run build && npm start & BASE_URL=http://localhost:3000 npm run e2e   # full browser journey (needs Playwright)
```

Covered: fixed and percentage deposits, rounding, deposit + balance = price, booking snapshot surviving a price/deposit change, overlap prevention (service + database constraint), concurrent requests for the same slot, breaks / blocks / closed days / notice / booking window / BST, expiry freeing the slot (and refusing to reinstate on top of a new booking), deposit-before-confirm rule, balance → paid in full, reschedule, cancel, cancellation requests by token, reminders sent once, anonymisation keeping financial records. The end-to-end script books on a phone, checks the slot disappears for others, confirms the deposit as the owner and checks the client sees the confirmation.

## Built to grow

Notification channels (SMS / WhatsApp), customer records, an audit log and a payments ledger are already separate, so customer accounts, gift vouchers, loyalty, marketing, card payments, multiple therapists (add `staff_id` to the overlap constraint) and analytics can be added without restructuring.
