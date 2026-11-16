export const name = "0002_security";

/**
 * Row Level Security.
 *
 * The application talks to Postgres only from the server (Next.js server
 * components, server actions and route handlers) using DATABASE_URL. Nothing
 * in the browser ever receives database credentials.
 *
 * On Supabase the public schema is also exposed through the auto-generated
 * REST API (PostgREST) to the "anon" and "authenticated" roles. We enable RLS
 * on every table and add NO policies for those roles, so that API can never
 * read or write salon data — deny by default. The only exception is the public
 * treatment menu, which is safe to expose read-only.
 */
export const sql = /* sql */ `
alter table admin_users enable row level security;
alter table settings enable row level security;
alter table treatments enable row level security;
alter table customers enable row level security;
alter table opening_hours enable row level security;
alter table time_blocks enable row level security;
alter table bookings enable row level security;
alter table payments enable row level security;
alter table booking_events enable row level security;
alter table notifications enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on admin_users, settings, customers, time_blocks, bookings, payments, booking_events, notifications from anon, authenticated';
    execute 'create policy "Public can read active treatments" on treatments for select to anon, authenticated using (active)';
  end if;
end
$$;
`;
