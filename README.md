# Talentbank Career Fair — Event Calendar

A career fair event calendar with a public event listing/registration page and an
admin dashboard for managing events, candidates, and employer registrations.

## Tech Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL (hosted on [Neon](https://neon.tech), connected via Prisma)
- **ORM:** Prisma
- **Icons:** lucide-react

## Project Structure

```
app/
  page.tsx                  Public event calendar (browse + register)
  admin/                    Admin dashboard (login-gated)
    login/                  Admin login page
    dashboard/              Event list, create/edit modals, stats
    events/[id]/            Single event detail + registrations
  api/
    events/                 Event CRUD
    candidates/register/    Candidate registration endpoint
    employers/register/     Employer registration endpoint
lib/
  event-api.ts               Shared validation + status logic
  prisma.ts                  Prisma client singleton
  constants.ts                Shared enums (event status, registration type)
prisma/
  schema.prisma               Database schema
```

## Getting Started (local development)

1. **Install dependencies**
   ```bash
   npm install
   ```
   This also runs `prisma generate` automatically via a `postinstall` hook.

2. **Set up the database**

   Create a free Postgres database (e.g. via [Neon](https://neon.tech) or Vercel's
   Storage tab), then create a `.env` file in the project root:
   ```
   DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
   ```

3. **Sync the schema**
   ```bash
   npm run prisma:push
   ```
   This project uses `prisma db push` instead of migration files, so no migration
   history needs to be generated or committed — it syncs `prisma/schema.prisma`
   directly to whatever database `DATABASE_URL` points to.

4. **Run the dev server**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000`.

## Environment Variables

| Variable       | Description                                    |
|----------------|-------------------------------------------------|
| `DATABASE_URL` | PostgreSQL connection string used by Prisma.    |

## Deployment (Vercel)

1. Import the repo into Vercel.
2. In the project's **Storage** tab, create a Postgres database (Neon) and connect
   it to the project — this automatically sets `DATABASE_URL` for Production and
   Preview environments.
3. Deploy. The build command (`npm run build`) runs `prisma db push` before
   `next build`, so the database schema is created/synced on every deploy
   automatically — no manual migration step required.

## Admin Access

The admin dashboard at `/admin` is protected by a simple hardcoded login check
(client-side only, stored in `localStorage` — this is a demo-grade auth setup,
not intended for real production credential handling):

- **URL:** `/admin/login`
- **Username:** `admin`
- **Password:** `talentbank123`

## Core Features

- Public calendar of upcoming career fair events grouped by month, with
  countdown badges for urgency.
- Candidate and employer registration forms per event.
- Employer registration automatically closes once an event reaches its
  configured `employerCapacity`; candidate registration stays open regardless.
- Admin dashboard: create/edit events, view registration counts, per-event
  detail page listing all registered candidates and employers.
- Event status (`SCHEDULED`, `FULL`, `COMPLETED`, `CANCELLED`) is derived
  server-side from real registration counts and event end time, rather than a
  potentially stale stored value.
