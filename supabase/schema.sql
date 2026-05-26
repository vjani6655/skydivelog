-- ============================================================
-- Jump Logs — Full Database Schema
-- Run in Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- ENUMS
-- ────────────────────────────────────────────────────────────

create type public.jump_type_enum as enum (
  'Belly', 'Tracking', 'Wingsuit', 'Freefly',
  'CRW', 'AFF', 'Tandem', 'Coach', 'Demo', 'Night'
);

create type public.gear_type_enum as enum ('rig', 'canopy', 'aad');

create type public.gear_service_action_enum as enum ('Repack', 'Inspection');

create type public.certificate_category_enum as enum ('licence', 'rating', 'medical', 'other');

create type public.altitude_unit_enum as enum ('ft', 'm');

create type public.jump_list_layout_enum as enum ('Compact', 'Cards', 'Timeline');

create type public.jump_detail_layout_enum as enum ('Standard', 'Cockpit', 'Photo-led');

create type public.stats_layout_enum as enum ('Cards', 'Cockpit', 'Photo story');

create type public.subscription_status_enum as enum ('active', 'trial', 'overdue', 'cancelled');

create type public.announcement_schedule_enum as enum ('now', 'schedule', 'draft');

create type public.announcement_status_enum as enum ('draft', 'scheduled', 'sent');

create type public.flagged_entry_source_enum as enum ('algorithm', 'manual');

create type public.flagged_entry_severity_enum as enum ('high', 'mid', 'low');

create type public.flagged_entry_status_enum as enum ('open', 'resolved', 'dismissed');

create type public.support_ticket_category_enum as enum ('billing', 'bug', 'support', 'feature', 'flag');

create type public.support_ticket_status_enum as enum ('open', 'waiting', 'closed');

create type public.admin_role_enum as enum ('super-admin', 'admin', 'finance', 'support', 'read-only');

-- ────────────────────────────────────────────────────────────
-- DROPZONES
-- ────────────────────────────────────────────────────────────

create table public.dropzones (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  region      text,
  latitude    double precision,
  longitude   double precision
);

alter table public.dropzones enable row level security;

create policy "Dropzones are publicly readable"
  on public.dropzones for select
  using (true);

-- ────────────────────────────────────────────────────────────
-- AIRCRAFT
-- ────────────────────────────────────────────────────────────

create table public.aircraft (
  id       uuid primary key default gen_random_uuid(),
  type     text not null,
  category text not null
);

alter table public.aircraft enable row level security;

create policy "Aircraft are publicly readable"
  on public.aircraft for select
  using (true);

-- ────────────────────────────────────────────────────────────
-- ADMINS
-- ────────────────────────────────────────────────────────────

create table public.admins (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  email            text not null unique,
  role             public.admin_role_enum not null,
  last_sign_in_at  timestamptz,
  active           boolean not null default true
);

alter table public.admins enable row level security;

-- Only admins themselves can read admin rows
create policy "Admins can read admin table"
  on public.admins for select
  using (
    email = (select email from auth.users where id = auth.uid())
  );

-- Helper: SECURITY DEFINER so it bypasses RLS on public.admins (no recursion)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.admins a
    where a.email = (select email from auth.users where id = auth.uid())
      and a.active = true
  );
$$;
grant execute on function public.is_admin() to authenticated;

-- ────────────────────────────────────────────────────────────
-- USERS (extends auth.users)
-- ────────────────────────────────────────────────────────────

create table public.users (
  id                                uuid primary key references auth.users (id) on delete cascade,
  email                             text not null,
  full_name                         text not null default '',
  avatar_url                        text,
  licence_number                    text,
  licence_rating                    text,
  date_of_birth                     date,
  phone                             text,
  home_dropzone_id                  uuid references public.dropzones (id) on delete set null,
  country                           text,
  emergency_contact_name            text,
  emergency_contact_relationship    text,
  emergency_contact_phone           text,
  two_factor_enabled                boolean not null default false,
  preferred_altitude_unit           public.altitude_unit_enum not null default 'ft',
  date_format                       text not null default 'DD MMM YYYY',
  theme                             text not null default 'dark',
  offline_mode_enabled              boolean not null default true,
  display_layout_jump_list          public.jump_list_layout_enum not null default 'Cards',
  display_layout_jump_detail        public.jump_detail_layout_enum not null default 'Standard',
  display_layout_stats_overview     public.stats_layout_enum not null default 'Cards',
  created_at                        timestamptz not null default now(),
  last_sign_in_at                   timestamptz,
  last_sign_in_platform             text,
  last_ip                           text,
  currency_alert_months             integer not null default 1,
  repack_reminder_days              integer not null default 30,
  cert_expiry_warning_days          integer not null default 30,
  marketing_emails_opt_in           boolean not null default true
);

alter table public.users enable row level security;

create policy "Users can view own user row"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own user row"
  on public.users for update
  using (auth.uid() = id);

create policy "Admins can view all users"
  on public.users for select using (is_admin());

-- Auto-create a users row when a new auth user is created
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- JUMPS
-- ────────────────────────────────────────────────────────────

create table public.jumps (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users (id) on delete cascade,
  jump_number         integer not null,
  date                timestamptz not null,
  dropzone_id         uuid references public.dropzones (id) on delete set null,
  aircraft_type       text,
  aircraft_rego       text,
  exit_altitude_ft    integer,
  pull_altitude_ft    integer,
  deploy_altitude_ft  integer,
  freefall_seconds    integer,
  canopy_seconds      integer,
  jump_type           public.jump_type_enum,
  jumper_type         text,
  is_favourite        boolean not null default false,
  notes               text,
  photo_url           text,
  coordinates_lat     double precision,
  coordinates_lng     double precision,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,
  is_draft            boolean not null default false,
  landing_accuracy_value text,
  landing_accuracy_unit  text,
  jump_stage          text,
  canopy_type         text,
  canopy_gear_id      uuid references public.gear (id) on delete set null
);

alter table public.jumps enable row level security;

create policy "Users can view own jumps"
  on public.jumps for select
  using (auth.uid() = user_id and deleted_at is null);

create policy "Users can insert own jumps"
  on public.jumps for insert
  with check (auth.uid() = user_id);

create policy "Users can update own jumps"
  on public.jumps for update
  using (auth.uid() = user_id);

create policy "Admins can view all jumps"
  on public.jumps for select using (is_admin());

-- Auto-update updated_at on jumps (skip for is_favourite-only changes)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  -- Don't bump updated_at when only is_favourite changed
  if (new.is_favourite is distinct from old.is_favourite) and
     (new.date                is not distinct from old.date) and
     (new.dropzone_id         is not distinct from old.dropzone_id) and
     (new.aircraft_type       is not distinct from old.aircraft_type) and
     (new.aircraft_rego       is not distinct from old.aircraft_rego) and
     (new.exit_altitude_ft    is not distinct from old.exit_altitude_ft) and
     (new.pull_altitude_ft    is not distinct from old.pull_altitude_ft) and
     (new.deploy_altitude_ft  is not distinct from old.deploy_altitude_ft) and
     (new.freefall_seconds    is not distinct from old.freefall_seconds) and
     (new.canopy_seconds      is not distinct from old.canopy_seconds) and
     (new.jump_type           is not distinct from old.jump_type) and
     (new.jumper_type         is not distinct from old.jumper_type) and
     (new.notes               is not distinct from old.notes) and
     (new.photo_url           is not distinct from old.photo_url) and
     (new.landing_accuracy_value is not distinct from old.landing_accuracy_value) and
     (new.landing_accuracy_unit  is not distinct from old.landing_accuracy_unit) and
     (new.jump_stage          is not distinct from old.jump_stage) and
     (new.canopy_type         is not distinct from old.canopy_type) and
     (new.canopy_gear_id      is not distinct from old.canopy_gear_id)
  then
    new.updated_at = old.updated_at;
    return new;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger jumps_set_updated_at
  before update on public.jumps
  for each row execute procedure public.set_updated_at();

-- ────────────────────────────────────────────────────────────
-- SIGNATURES
-- ────────────────────────────────────────────────────────────

create table public.signatures (
  id                      uuid primary key default gen_random_uuid(),
  jump_id                 uuid not null references public.jumps (id) on delete cascade,
  signature_data          text not null,
  signer_name             text not null,
  signer_licence_number   text not null,
  signer_licence_rating   text,
  signer_user_id          uuid references public.users (id) on delete set null,
  outcome                 text,
  notes                   text,
  signed_at               timestamptz not null default now()
);

alter table public.signatures enable row level security;

create policy "Users can view signatures on own jumps"
  on public.signatures for select
  using (
    exists (select 1 from public.jumps j where j.id = jump_id and j.user_id = auth.uid())
  );

create policy "Users can insert signatures on own jumps"
  on public.signatures for insert
  with check (
    exists (select 1 from public.jumps j where j.id = jump_id and j.user_id = auth.uid())
  );

create policy "Admins can view all signatures"
  on public.signatures for select using (is_admin());

-- ────────────────────────────────────────────────────────────
-- TAGS
-- ────────────────────────────────────────────────────────────

create table public.tags (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  name        text not null,
  color       text not null,
  created_at  timestamptz not null default now()
);

alter table public.tags enable row level security;

create policy "Users can manage own tags"
  on public.tags for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- JUMP_TAGS
-- ────────────────────────────────────────────────────────────

create table public.jump_tags (
  jump_id  uuid not null references public.jumps (id) on delete cascade,
  tag_id   uuid not null references public.tags (id) on delete cascade,
  primary key (jump_id, tag_id)
);

alter table public.jump_tags enable row level security;

create policy "Users can manage own jump_tags"
  on public.jump_tags for all
  using (
    exists (select 1 from public.jumps j where j.id = jump_id and j.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.jumps j where j.id = jump_id and j.user_id = auth.uid())
  );

-- ────────────────────────────────────────────────────────────
-- GEAR
-- ────────────────────────────────────────────────────────────

create table public.gear (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references public.users (id) on delete cascade,
  type                     public.gear_type_enum not null,
  make_model               text not null,
  serial_number            text not null,
  manufactured_date        date,
  wing_loading             double precision,
  jumps_on                 integer,
  hours                    double precision,
  last_repack_date         date,
  repack_reminder_enabled  boolean not null default false,
  created_at               timestamptz not null default now(),
  canopy_sub_type          text
);

alter table public.gear enable row level security;

create policy "Users can manage own gear"
  on public.gear for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins can view all gear"
  on public.gear for select using (is_admin());

-- ────────────────────────────────────────────────────────────
-- GEAR_SERVICE_LOG
-- ────────────────────────────────────────────────────────────

create table public.gear_service_log (
  id            uuid primary key default gen_random_uuid(),
  gear_id       uuid not null references public.gear (id) on delete cascade,
  action        public.gear_service_action_enum not null,
  performed_by  text not null,
  performed_at  date not null
);

alter table public.gear_service_log enable row level security;

create policy "Users can manage own gear service log"
  on public.gear_service_log for all
  using (
    exists (select 1 from public.gear g where g.id = gear_id and g.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.gear g where g.id = gear_id and g.user_id = auth.uid())
  );

-- ────────────────────────────────────────────────────────────
-- CERTIFICATES
-- ────────────────────────────────────────────────────────────

create table public.certificates (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users (id) on delete cascade,
  category            public.certificate_category_enum not null,
  title               text not null,
  issuing_body        text not null,
  issued_date         date not null,
  expires_date        date,
  reference_number    text,
  document_file_url   text,
  created_at          timestamptz not null default now()
);

alter table public.certificates enable row level security;

create policy "Users can manage own certificates"
  on public.certificates for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins can view all certificates"
  on public.certificates for select using (is_admin());

-- ────────────────────────────────────────────────────────────
-- SUBSCRIPTIONS
-- ────────────────────────────────────────────────────────────

create table public.subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references public.users (id) on delete cascade,
  stripe_subscription_id   text not null unique,
  stripe_customer_id       text not null,
  status                   public.subscription_status_enum not null,
  plan                     text not null,
  price_at_signup          numeric(10, 2) not null,
  started_at               timestamptz not null,
  renews_at                timestamptz not null,
  payment_method_brand     text not null,
  payment_method_last4     text not null,
  payment_method_expiry    text not null
);

alter table public.subscriptions enable row level security;

create policy "Users can view own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "Admins can view all subscriptions"
  on public.subscriptions for select using (is_admin());

-- ────────────────────────────────────────────────────────────
-- SEGMENTS
-- ────────────────────────────────────────────────────────────

create table public.segments (
  id       uuid primary key default gen_random_uuid(),
  name     text not null,
  filters  jsonb not null default '{}'
);

alter table public.segments enable row level security;

create policy "Admins can manage segments"
  on public.segments for all
  using (is_admin())
  with check (is_admin());

-- ────────────────────────────────────────────────────────────
-- ANNOUNCEMENTS
-- ────────────────────────────────────────────────────────────

create table public.announcements (
  id                   uuid primary key default gen_random_uuid(),
  title                text not null,
  body                 text not null,
  channels             text[] not null default '{}',
  deep_link            text,
  segment_id           uuid references public.segments (id) on delete set null,
  schedule_mode        public.announcement_schedule_enum not null,
  scheduled_at         timestamptz,
  sent_at              timestamptz,
  status               public.announcement_status_enum not null default 'draft',
  created_by_admin_id  uuid not null references public.admins (id) on delete restrict,
  created_at           timestamptz not null default now()
);

alter table public.announcements enable row level security;

create policy "Admins can manage announcements"
  on public.announcements for all
  using (is_admin())
  with check (is_admin());

create policy "Users can view sent in-app announcements"
  on public.announcements for select
  using (status = 'sent' and 'in_app_banner' = any(channels));

-- ────────────────────────────────────────────────────────────
-- FLAGGED_ENTRIES
-- ────────────────────────────────────────────────────────────

create table public.flagged_entries (
  id       uuid primary key default gen_random_uuid(),
  jump_id  uuid not null references public.jumps (id) on delete cascade,
  reason   text not null,
  detail   text not null,
  source   public.flagged_entry_source_enum not null,
  severity public.flagged_entry_severity_enum not null,
  status   public.flagged_entry_status_enum not null default 'open'
);

alter table public.flagged_entries enable row level security;

create policy "Admins can manage flagged entries"
  on public.flagged_entries for all
  using (is_admin())
  with check (is_admin());

-- ────────────────────────────────────────────────────────────
-- AUDIT_LOG
-- ────────────────────────────────────────────────────────────

create table public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  action      text not null,
  target      text not null,
  admin_id    uuid not null references public.admins (id) on delete restrict,
  reason      text not null,
  created_at  timestamptz not null default now()
);

alter table public.audit_log enable row level security;

create policy "Admins can manage audit log"
  on public.audit_log for all
  using (is_admin())
  with check (is_admin());

-- ────────────────────────────────────────────────────────────
-- SUPPORT_TICKETS
-- ────────────────────────────────────────────────────────────

create table public.support_tickets (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.users (id) on delete cascade,
  subject               text not null,
  category              public.support_ticket_category_enum not null,
  status                public.support_ticket_status_enum not null default 'open',
  severity              text not null,
  created_at            timestamptz not null default now(),
  assigned_to_admin_id  uuid references public.admins (id) on delete set null
);

alter table public.support_tickets enable row level security;

create policy "Users can view own support tickets"
  on public.support_tickets for select
  using (auth.uid() = user_id);

create policy "Users can create own support tickets"
  on public.support_tickets for insert
  with check (auth.uid() = user_id);

create policy "Admins can manage all support tickets"
  on public.support_tickets for all
  using (is_admin())
  with check (is_admin());

-- ────────────────────────────────────────────────────────────
-- TICKET_MESSAGES
-- ────────────────────────────────────────────────────────────

create table public.ticket_messages (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references public.support_tickets (id) on delete cascade,
  sender_id  uuid not null,
  message    text not null,
  created_at timestamptz not null default now()
);

alter table public.ticket_messages enable row level security;

create policy "Ticket participants can view messages"
  on public.ticket_messages for select
  using (
    exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
    or is_admin()
  );

create policy "Ticket participants can insert messages"
  on public.ticket_messages for insert
  with check (
    exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
    or is_admin()
  );

-- ────────────────────────────────────────────────────────────
-- COUPONS
-- ────────────────────────────────────────────────────────────

create table public.coupons (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  discount_type text not null check (discount_type in ('percent', 'flat', 'free', 'lifetime')),
  amount        numeric(10, 2) not null default 0,
  duration      text not null,
  usage_cap     integer,
  usage_count   integer not null default 0,
  expires_at    timestamptz,
  use_case      text not null default '',
  eligibility   text[] not null default '{}',
  status        text not null default 'active' check (status in ('active', 'paused', 'expired')),
  created_at    timestamptz not null default now()
);

alter table public.coupons enable row level security;

create policy "Admins can manage coupons"
  on public.coupons for all
  using (is_admin())
  with check (is_admin());

-- ────────────────────────────────────────────────────────────
-- JUMP_EDITS
-- ────────────────────────────────────────────────────────────

create table public.jump_edits (
  id         uuid primary key default gen_random_uuid(),
  jump_id    uuid not null references public.jumps (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  edited_at  timestamptz not null default now(),
  changes    jsonb not null
);

alter table public.jump_edits enable row level security;

create policy "Users can view own jump edits"
  on public.jump_edits for select
  using (auth.uid() = user_id);

create policy "Users can insert own jump edits"
  on public.jump_edits for insert
  with check (auth.uid() = user_id);

create policy "Admins can view all jump edits"
  on public.jump_edits for select using (is_admin());

-- ────────────────────────────────────────────────────────────
-- PDF_EXPORTS
-- ────────────────────────────────────────────────────────────

create table public.pdf_exports (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  user_id    uuid not null references auth.users (id) on delete cascade,
  jump_ids   uuid[] not null,
  layout     text not null,
  created_at timestamptz not null default now()
);

alter table public.pdf_exports enable row level security;

create policy "Public can read pdf exports for verification"
  on public.pdf_exports for select
  using (true);

create policy "Users can create own pdf exports"
  on public.pdf_exports for insert
  with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- NOTIFICATION_PREFERENCES
-- ────────────────────────────────────────────────────────────

create table public.notification_preferences (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references public.users (id) on delete cascade,
  currency_alerts   boolean not null default true,
  repack_reminders  boolean not null default true,
  expiry_warnings   boolean not null default true,
  alert_days_before integer not null default 30,
  push_token        text,
  jump_logged       boolean not null default true,
  weekly_recap      boolean not null default true,
  announcements     boolean not null default false
);

alter table public.notification_preferences enable row level security;

create policy "Users can manage own notification preferences"
  on public.notification_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-create notification_preferences when a new user is created
create or replace function public.handle_new_user_notifications()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id);
  return new;
end;
$$;

create or replace trigger on_user_created_notifications
  after insert on public.users
  for each row execute procedure public.handle_new_user_notifications();

-- ────────────────────────────────────────────────────────────
-- APP_SETTINGS
-- ────────────────────────────────────────────────────────────

create table public.app_settings (
  id                  uuid primary key default gen_random_uuid(),
  price_per_year      numeric(10, 2) not null default 5,
  trial_length_days   integer not null default 14,
  grace_window_days   integer not null default 7,
  updated_at          timestamptz not null default now()
);

alter table public.app_settings enable row level security;

create policy "Admins can manage app settings"
  on public.app_settings for all
  using (is_admin())
  with check (is_admin());

-- Seed one row so there is always a settings record
insert into public.app_settings (price_per_year, trial_length_days, grace_window_days)
values (5, 30, 7);


-- ────────────────────────────────────────────────────────────
-- GRANTS — allow authenticated role to access all tables
-- ────────────────────────────────────────────────────────────

grant select, insert, update, delete on table public.users to authenticated;
grant select, insert, update, delete on table public.jumps to authenticated;
grant select, insert, update, delete on table public.signatures to authenticated;
grant select, insert, update, delete on table public.gear to authenticated;
grant select, insert, update, delete on table public.gear_service_log to authenticated;
grant select, insert, update, delete on table public.certificates to authenticated;
grant select, insert, update, delete on table public.tags to authenticated;
grant select, insert, update, delete on table public.jump_tags to authenticated;
grant select, insert, update, delete on table public.subscriptions to authenticated;
grant select, insert, update, delete on table public.support_tickets to authenticated;
grant select, insert, update, delete on table public.ticket_messages to authenticated;
grant select, insert, update, delete on table public.notification_preferences to authenticated;
grant select, insert, update, delete on table public.jump_edits to authenticated;
grant select, insert           on table public.pdf_exports to authenticated;
grant select                   on table public.pdf_exports to anon;
grant select, insert, update, delete on table public.coupons to authenticated;
grant select on table public.dropzones to authenticated, anon;
grant select on table public.aircraft to authenticated, anon;
grant select on table public.app_settings to authenticated, anon;
