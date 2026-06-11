-- Apple Review User Setup
-- FIRST: create the user manually in Supabase Dashboard → Authentication → Users → Add user
--   Email:    appreviewer@skydivelog.com
--   Password: (set manually in Supabase Auth dashboard)
--   Check "Auto Confirm User"
-- THEN run this script.

do $$
declare
  v_src_id   uuid;
  v_dst_id   uuid;
  v_old_gear_id uuid;
  v_new_gear_id uuid;
  v_old_tag_id  uuid;
  v_new_tag_id  uuid;
  v_old_jump_id uuid;
  v_new_jump_id uuid;
  v_mapped_canopy_gear_id uuid;
begin
  -- ── Resolve user IDs ──────────────────────────────────────────────────────
  select id into v_src_id from auth.users where email = 'varunjani94@gmail.com';
  select id into v_dst_id from auth.users where email = 'appreviewer@skydivelog.com';

  if v_src_id is null then raise exception 'Source user varunjani94@gmail.com not found.'; end if;
  if v_dst_id is null then raise exception 'Dest user appreviewer@skydivelog.com not found — create in Auth dashboard first.'; end if;

  -- Temp tables for ID mappings (no hstore needed)
  create temp table _gear_map (old_id uuid primary key, new_id uuid) on commit drop;
  create temp table _tag_map  (old_id uuid primary key, new_id uuid) on commit drop;
  create temp table _jump_map (old_id uuid primary key, new_id uuid) on commit drop;

  -- ── public.users profile ──────────────────────────────────────────────────
  insert into public.users (id, email, full_name)
  values (v_dst_id, 'appreviewer@skydivelog.com', 'Apple Reviewer')
  on conflict (id) do update set full_name = 'Apple Reviewer';

  -- ── Active Pro subscription (never expires) ───────────────────────────────
  insert into public.subscriptions (
    user_id, stripe_subscription_id, stripe_customer_id, status, plan,
    price_at_signup, started_at, renews_at,
    payment_method_brand, payment_method_last4, payment_method_expiry
  ) values (
    v_dst_id, 'sub_apple_review_test', 'cus_apple_review_test', 'active', 'pro_annual',
    0.00, now(), '2099-01-01 00:00:00+00', 'visa', '0000', '01/99'
  )
  on conflict (stripe_subscription_id) do update
    set status = 'active', renews_at = '2099-01-01 00:00:00+00';

  -- ── notification_preferences ──────────────────────────────────────────────
  insert into public.notification_preferences (user_id)
  values (v_dst_id)
  on conflict (user_id) do nothing;

  -- ── GEAR ─────────────────────────────────────────────────────────────────
  for v_old_gear_id in
    select id from public.gear where user_id = v_src_id
  loop
    insert into public.gear (
      user_id, type, make_model, serial_number, manufactured_date,
      wing_loading, jumps_on, hours, last_repack_date,
      repack_reminder_enabled, created_at, canopy_sub_type
    )
    select
      v_dst_id, type, make_model, serial_number, manufactured_date,
      wing_loading, jumps_on, hours, last_repack_date,
      repack_reminder_enabled, created_at, canopy_sub_type
    from public.gear where id = v_old_gear_id
    returning id into v_new_gear_id;

    insert into _gear_map values (v_old_gear_id, v_new_gear_id);

    insert into public.gear_service_log (gear_id, action, performed_by, performed_at)
    select v_new_gear_id, action, performed_by, performed_at
    from public.gear_service_log where gear_id = v_old_gear_id;
  end loop;

  -- ── TAGS ──────────────────────────────────────────────────────────────────
  for v_old_tag_id in
    select id from public.tags where user_id = v_src_id
  loop
    insert into public.tags (user_id, name, color, created_at)
    select v_dst_id, name, color, created_at
    from public.tags where id = v_old_tag_id
    returning id into v_new_tag_id;

    insert into _tag_map values (v_old_tag_id, v_new_tag_id);
  end loop;

  -- ── JUMPS ─────────────────────────────────────────────────────────────────
  for v_old_jump_id in
    select id from public.jumps
    where user_id = v_src_id and deleted_at is null
    order by jump_number
  loop
    select coalesce(gm.new_id, null)
    into v_mapped_canopy_gear_id
    from public.jumps j
    left join _gear_map gm on gm.old_id = j.canopy_gear_id
    where j.id = v_old_jump_id;

    insert into public.jumps (
      user_id, jump_number, date, dropzone_id, aircraft_type, aircraft_rego,
      exit_altitude_ft, pull_altitude_ft, deploy_altitude_ft,
      freefall_seconds, canopy_seconds, jump_type, jumper_type,
      is_favourite, notes, photo_url, coordinates_lat, coordinates_lng,
      created_at, updated_at, is_draft,
      landing_accuracy_value, landing_accuracy_unit,
      jump_stage, canopy_type, canopy_gear_id
    )
    select
      v_dst_id, jump_number, date, dropzone_id, aircraft_type, aircraft_rego,
      exit_altitude_ft, pull_altitude_ft, deploy_altitude_ft,
      freefall_seconds, canopy_seconds, jump_type, jumper_type,
      is_favourite, notes, photo_url, coordinates_lat, coordinates_lng,
      created_at, updated_at, is_draft,
      landing_accuracy_value, landing_accuracy_unit,
      jump_stage, canopy_type, v_mapped_canopy_gear_id
    from public.jumps where id = v_old_jump_id
    returning id into v_new_jump_id;

    insert into _jump_map values (v_old_jump_id, v_new_jump_id);

    -- signatures
    insert into public.signatures (
      jump_id, signature_data, signer_name, signer_licence_number,
      signer_licence_rating, signer_user_id, outcome, notes, signed_at
    )
    select
      v_new_jump_id, signature_data, signer_name, signer_licence_number,
      signer_licence_rating, signer_user_id, outcome, notes, signed_at
    from public.signatures where jump_id = v_old_jump_id;

    -- jump_edits
    insert into public.jump_edits (jump_id, user_id, edited_at, changes)
    select v_new_jump_id, v_dst_id, edited_at, changes
    from public.jump_edits where jump_id = v_old_jump_id;

    -- jump_tags
    insert into public.jump_tags (jump_id, tag_id)
    select v_new_jump_id, tm.new_id
    from public.jump_tags jt
    join _tag_map tm on tm.old_id = jt.tag_id
    where jt.jump_id = v_old_jump_id;
  end loop;

  -- ── CERTIFICATES ──────────────────────────────────────────────────────────
  insert into public.certificates (
    user_id, category, title, issuing_body, issued_date,
    expires_date, reference_number, document_file_url, created_at
  )
  select
    v_dst_id, category, title, issuing_body, issued_date,
    expires_date, reference_number, document_file_url, created_at
  from public.certificates where user_id = v_src_id;

  raise notice 'Done. Copied all data to Apple review user (%).', v_dst_id;
end $$;
