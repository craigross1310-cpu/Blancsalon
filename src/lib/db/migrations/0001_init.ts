export const name = "0001_init";

export const sql = /* sql */ `
-- ───────────────────────────────────────────────────────────────
-- BLANC Salon — core schema
-- All money is stored as integer pence. All timestamps are UTC.
-- ───────────────────────────────────────────────────────────────

create table admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text not null default '',
  role text not null default 'owner' check (role in ('owner', 'staff')),
  password_hash text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);
create unique index admin_users_email_key on admin_users (lower(email));

create table settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table treatments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category text not null default '',
  name text not null,
  summary text not null default '',
  description text not null default '',
  price_pence integer not null default 0 check (price_pence >= 0),
  price_note text not null default '',
  duration_min integer not null check (duration_min between 5 and 600),
  deposit_type text not null default 'fixed' check (deposit_type in ('fixed', 'percentage')),
  deposit_fixed_pence integer not null default 0 check (deposit_fixed_pence >= 0),
  deposit_percent numeric(5,2) not null default 0 check (deposit_percent between 0 and 100),
  preparation_info text not null default '',
  aftercare_info text not null default '',
  image_url text,
  active boolean not null default true,
  online_booking boolean not null default true,
  featured boolean not null default false,
  sort_order integer not null default 0,
  review_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index treatments_active_idx on treatments (active, sort_order);

create table customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null default '',
  notes text not null default '',
  anonymised_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index customers_email_key on customers (lower(email)) where anonymised_at is null;

-- Weekly working pattern. weekday: 0 = Sunday … 6 = Saturday (UK local time).
create table opening_hours (
  weekday smallint primary key check (weekday between 0 and 6),
  is_open boolean not null default false,
  open_time time not null default '09:00',
  close_time time not null default '17:00',
  breaks jsonb not null default '[]'::jsonb,
  check (close_time > open_time)
);

-- Owner blocked-out periods: holidays, training days, personal appointments.
create table time_blocks (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null default '',
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index time_blocks_range_idx on time_blocks (starts_at, ends_at);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  access_token text not null,
  customer_id uuid not null references customers(id) on delete restrict,
  treatment_id uuid references treatments(id) on delete set null,

  -- Snapshot of the treatment + deposit rules at the time of booking.
  -- Later price/deposit changes never alter an existing booking.
  treatment_name text not null,
  treatment_price_pence integer not null check (treatment_price_pence >= 0),
  duration_min integer not null check (duration_min > 0),
  deposit_type text not null check (deposit_type in ('fixed', 'percentage')),
  deposit_fixed_pence integer not null default 0,
  deposit_percent numeric(5,2) not null default 0,
  deposit_due_pence integer not null check (deposit_due_pence >= 0),
  balance_due_pence integer not null check (balance_due_pence >= 0),

  starts_at timestamptz not null,
  ends_at timestamptz not null,

  status text not null check (status in (
    'pending_payment', 'pending_approval', 'confirmed', 'completed',
    'cancelled', 'declined', 'expired', 'no_show')),
  payment_status text not null check (payment_status in (
    'awaiting_deposit', 'not_required', 'deposit_received', 'paid_in_full', 'refunded')),
  payment_due_at timestamptz,

  source text not null default 'online' check (source in ('online', 'admin')),
  customer_notes text not null default '',
  internal_notes text not null default '',
  policy_agreed_at timestamptz,
  policy_version text,
  cancellation_requested_at timestamptz,
  cancellation_reason text not null default '',
  reminder_sent_at timestamptz,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (ends_at > starts_at),
  check (deposit_due_pence <= treatment_price_pence),
  check (deposit_due_pence + balance_due_pence = treatment_price_pence),

  -- Database-level guarantee against double booking: no two bookings that hold
  -- the diary (pending, confirmed or attended) may overlap in time.
  constraint bookings_no_overlap exclude using gist (
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('pending_payment', 'pending_approval', 'confirmed', 'completed', 'no_show'))
);
create index bookings_starts_idx on bookings (starts_at);
create index bookings_status_idx on bookings (status);
create index bookings_customer_idx on bookings (customer_id);
create index bookings_due_idx on bookings (payment_due_at) where status = 'pending_payment';

-- Payments are recorded manually by the owner after checking her own bank / till.
-- The software never verifies payments itself.
create table payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  kind text not null check (kind in ('deposit', 'balance', 'refund', 'other')),
  amount_pence integer not null check (amount_pence > 0),
  method text not null check (method in ('bank_transfer', 'cash', 'card', 'other')),
  received_on date not null,
  notes text not null default '',
  recorded_by uuid references admin_users(id) on delete set null,
  recorded_by_name text not null default '',
  created_at timestamptz not null default now()
);
create index payments_booking_idx on payments (booking_id);
create index payments_received_idx on payments (received_on);

-- Audit trail of everything that happens to a booking.
create table booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  event text not null,
  detail text not null default '',
  actor text not null default 'system',
  created_at timestamptz not null default now()
);
create index booking_events_booking_idx on booking_events (booking_id, created_at);

-- Outbox of every customer/owner message. channel allows SMS / WhatsApp later.
create table notifications (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete set null,
  channel text not null default 'email' check (channel in ('email', 'sms', 'whatsapp')),
  audience text not null check (audience in ('customer', 'owner')),
  template text not null,
  recipient text not null,
  subject text not null default '',
  body_text text not null default '',
  body_html text not null default '',
  status text not null check (status in ('sent', 'failed', 'logged', 'skipped')),
  provider text not null default '',
  provider_message_id text,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index notifications_created_idx on notifications (created_at desc);
create index notifications_booking_idx on notifications (booking_id);

-- Default working pattern (placeholder until BLANC supplies real hours): Tue–Sat.
insert into opening_hours (weekday, is_open, open_time, close_time, breaks) values
  (0, false, '10:00', '16:00', '[]'),
  (1, false, '09:00', '17:00', '[]'),
  (2, true,  '09:30', '17:30', '[{"start":"13:00","end":"13:30"}]'),
  (3, true,  '09:30', '17:30', '[{"start":"13:00","end":"13:30"}]'),
  (4, true,  '11:00', '20:00', '[{"start":"15:00","end":"15:30"}]'),
  (5, true,  '09:30', '17:30', '[{"start":"13:00","end":"13:30"}]'),
  (6, true,  '09:00', '15:00', '[]');
`;
