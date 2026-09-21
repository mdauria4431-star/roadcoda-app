-- =====================================================================
-- RESET: removes everything 01_schema.sql creates, so it can be run
-- again from a clean start. Deletes all RoadCoda tables AND their data.
-- Only for testing, before any real carrier data exists.
-- =====================================================================

drop view if exists public.load_profit;
-- 25: customer notification log (was left behind by earlier resets)
drop table if exists public.notification_queue cascade;
-- 61: trip types
drop table if exists public.trip_type_rates, public.trip_types cascade;
-- 60: payroll rules
drop table if exists public.yard_shifts, public.driver_time_off cascade;
-- 59: toll factor per vehicle, monthly toll reconciliation
drop table if exists public.toll_reconciliations, public.toll_vehicle_types cascade;
-- 58: onboarding & retention
drop table if exists public.retention_checkins, public.retention_questions, public.driver_checks, public.carrier_setup_ticks, public.onboarding_items cascade;
-- 57: delivery ratings
drop view if exists public.delivery_rating_list;
drop table if exists public.delivery_ratings cascade;
-- 56: customer portal
drop policy if exists scan_photos_portal_read on storage.objects;
drop policy if exists brand_logos_portal_read on storage.objects;
drop table if exists public.portal_users cascade;
-- 55: incidents
drop policy if exists incident_photos_read on storage.objects;
drop policy if exists incident_photos_write on storage.objects;
drop view if exists public.incident_list;
drop table if exists public.incident_photos, public.incident_witnesses, public.incidents cascade;
-- 54: messages
drop view if exists public.message_threads;
drop table if exists public.messages cascade;
-- 51: toll classes
drop view if exists public.toll_class_checks;
drop table if exists public.toll_class_factors, public.toll_agency_systems cascade;
-- 49-50: activity file sending
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $q$select cron.unschedule(jobname) from cron.job where jobname = 'roadcoda-activity-files'$q$;
  end if;
end $$;
delete from vault.secrets where name like 'roadcoda_sftp_%';
drop table if exists public.activity_deliveries, public.activity_send_settings cascade;
-- 48: activity file
drop table if exists public.csv_layouts, public.csv_field_catalog cascade;
-- 47: billing locks history
drop table if exists public.lock_log cascade;
-- 46: hours of service
drop view if exists public.driver_hos_now;
drop table if exists public.driver_hos, public.eld_drivers cascade;
-- 44: payroll
drop table if exists public.pay_statement_lines, public.pay_periods, public.load_activities cascade;
-- 43: load templates
drop table if exists public.load_template_dates, public.load_template_items, public.load_template_stops,
                     public.load_templates cascade;
-- 39-42: mileage history, delays, close-out, board and trip screen
drop view  if exists public.live_stop_dwell, public.load_check_flags, public.load_checks,
                     public.load_open_delays, public.load_eld_miles, public.truck_daily_miles cascade;
drop table if exists public.trip_changes, public.load_closeout_log, public.load_closeout, public.trip_check_codes,
                     public.stop_delay_log, public.stop_delays, public.customer_delay_codes, public.delay_codes,
                     public.truck_odometer_readings cascade;
-- 30/31 integrations (keys are deleted from Vault first)
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $q$select cron.unschedule(jobname) from cron.job where jobname = 'roadcoda-eld-sync'$q$;
  end if;
  if exists (select 1 from pg_namespace where nspname = 'vault') then
    execute $q$delete from vault.secrets where name like 'roadcoda\_%'$q$;
  end if;
end $$;
-- functions a later file redefines with a different shape (60, 61): drop them so a reinstall starts clean
drop function if exists public.pay_trips(date, date, boolean);
drop function if exists public.activity_rows(uuid, text, text, boolean);
drop function if exists public.profit_units(date, date);
drop function if exists public.profit_rows(date, date);
drop function if exists public.price_load(uuid, date, numeric, int, jsonb, uuid);
drop function if exists public.set_driver_pay_rate(uuid, uuid, uuid, numeric, date, text, text);
drop function if exists public.integration_save(uuid, text, text, text, jsonb, uuid, int);
drop function if exists public.integration_secret(uuid, text);
drop function if exists public.integration_mark(uuid, text, boolean, text, int, boolean);
drop function if exists public.eld_auto_match(uuid, text);
drop function if exists public.integration_disconnect(text);
drop function if exists public.integration_set_settings(text, jsonb);
drop function if exists public.set_eld_vehicle_match(uuid, uuid);
drop function if exists public.save_pcmiler_result(uuid, jsonb, text);
drop table if exists public.truck_positions cascade;
drop table if exists public.eld_vehicles cascade;
drop table if exists public.carrier_integrations cascade;
drop function if exists public.office_add_stop(uuid, int, text, text, text, text, timestamptz, timestamptz, text, int, text);
drop function if exists public.office_remove_stop(uuid);
drop function if exists public.office_move_stop(uuid, int);
drop function if exists public.office_review_stop(uuid);
drop function if exists public.driver_add_stop(uuid, text, text, text, text, int, text);
drop function if exists public.driver_stop_access(uuid);
drop function if exists public.delete_toll_batch(uuid);
drop function if exists public.toll_reconcile(date);
drop function if exists public.bill_late_tolls(uuid, uuid, date);
drop function if exists public.assign_toll(uuid, uuid, text, text);
drop function if exists public.import_tolls(text, date, text, jsonb, text);
drop function if exists public.match_tolls(text);
drop function if exists public.sync_load_tolls(uuid);
drop table if exists public.toll_transactions cascade;
drop table if exists public.toll_batches cascade;
drop function if exists public.stops_make_room(uuid, int);
drop function if exists public.stops_renumber(uuid);
drop function if exists public.load_status_after_edit(uuid);
drop function if exists public.stops_location_kind() cascade;
drop function if exists public.upsert_delivery_locations(uuid, jsonb);
drop function if exists public.driver_stop_odometer(uuid, numeric);
drop function if exists public.stops_require_odometer() cascade;
drop function if exists public.loads_check_hub_end() cascade;
drop function if exists public.create_loads_from_import(uuid, date, jsonb, text);
drop function if exists public.find_or_add_location(uuid, text, text, text, time, time);
drop function if exists public.driver_hub_reading(uuid, text, numeric);
drop function if exists public.adjust_load_miles(uuid, numeric, text);
drop function if exists public.loads_set_hub_required() cascade;
drop function if exists public.customers_miles_basis_sync() cascade;
drop function if exists public.carriers_odometer_sync() cascade;
drop function if exists public.create_weekly_invoice(uuid, date);
drop function if exists public.create_load_invoices(uuid, date);
drop function if exists public.next_invoice_number(uuid, date, text);
drop function if exists public.invoice_breakdown(uuid[]);
drop function if exists public.apply_cpi(uuid, numeric, date, text);
drop function if exists public.invoice_lines_calc() cascade;
drop function if exists public.invoice_total_sync() cascade;
drop table if exists public.contract_lines, public.contract_versions, public.customer_pos, public.customer_extras, public.delivery_locations cascade;
drop function if exists public.create_invoice(uuid, date, date, uuid[]);
drop function if exists public.invoice_delete_guard() cascade;
drop function if exists public.price_load(uuid, date, numeric, int, jsonb);
drop function if exists public.driver_stop_event(uuid, text, jsonb, text);
drop function if exists public.driver_stop_event(uuid, text, jsonb, text, text);
drop table if exists public.fuel_prices, public.fsc_rules, public.customer_rates cascade;

drop table if exists
  public.invoice_lines, public.invoices, public.cost_rates,
  public.load_costs, public.load_charges, public.scans,
  public.stop_items, public.stops, public.load_billing, public.loads,
  public.equipment, public.drivers, public.customers,
  public.profiles, public.carriers
cascade;

drop function if exists public.app_carrier_id() cascade;
drop function if exists public.app_role() cascade;
drop function if exists public.app_is_office() cascade;
drop function if exists public.app_driver_id() cascade;
drop table if exists public.driver_handoff_codes, public.truck_devices, public.user_screen_access, public.table_screens, public.user_access_log cascade;
drop function if exists public.app_is_owner(), public.app_can(text, text), public.app_table_ok(text, boolean), public.my_access(), public.role_preset(text), public.app_can_manage_users(), public.set_user_access(uuid, text, boolean, jsonb), public.auto_price_load(uuid) cascade;
drop function if exists public.equipment_touch() cascade;
drop table if exists public.driver_reset_cards, public.driver_reset_pins, public.driver_access_events cascade;
drop function if exists public.driver_access_mark_contacted(uuid);
drop table if exists public.driver_pay_rates, public.customer_activity_rates, public.activity_types, public.terminals cascade;
drop function if exists public.set_driver_pay_rate(uuid, uuid, uuid, numeric, date, text);
drop function if exists public.driver_rate_on(uuid, uuid, uuid, date);
drop function if exists public.bill_price_on(uuid, uuid, date);
drop function if exists public.customer_chain(uuid);
drop function if exists public.customers_parent_check() cascade;
drop function if exists public.set_customer_activity(uuid, uuid, boolean, numeric, numeric, date, text);
drop function if exists public.carriers_seed_activity_types() cascade;
drop function if exists public.seed_activity_types(uuid);
drop function if exists public.drivers_touch() cascade;

drop policy if exists scan_photos_read  on storage.objects;
drop policy if exists scan_photos_write on storage.objects;
drop policy if exists scan_photos_delete_own on storage.objects;
-- (The scan-photos bucket is kept; 01_schema.sql skips it if it exists.)
