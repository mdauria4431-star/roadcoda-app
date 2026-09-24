-- =====================================================================
-- RESET: removes everything 01_schema.sql creates, so it can be run
-- again from a clean start. Deletes all RoadCoda tables AND their data.
-- Only for testing, before any real carrier data exists.
-- =====================================================================

drop view if exists public.load_profit;
-- 25: customer notification log (was left behind by earlier resets)
drop table if exists public.notification_queue cascade;
-- 100: website tour
alter role authenticator reset pgrst.db_pre_request;
select pg_notify('pgrst', 'reload config');
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobname) from cron.job where jobname = 'roadcoda-tour';
  end if;
  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists tour_no_upload on storage.objects';
    execute 'drop policy if exists tour_no_change on storage.objects';
    execute 'drop policy if exists tour_no_delete on storage.objects';
  end if;
end $$;
drop function if exists public.tour_status(), public.tour_nightly(), public.tour_cleanup(), public.tour_roll_dates(int),
  public.tour_start(), public.rc_pre_request(), public.app_is_guest() cascade;
do $$ begin
  if to_regprocedure('public.my_access_before_tour()') is not null then
    drop function if exists public.my_access();
    alter function public.my_access_before_tour() rename to my_access;
    grant execute on function public.my_access() to authenticated;
  end if;
end $$;
drop table if exists public.tour_settings cascade;
-- 99: price cap
drop view if exists public.roadcoda_price_check;
drop function if exists public.roadcoda_price_for(int) cascade;
-- 98: export
drop function if exists public.export_parts(), public.export_part(text, int, int), public.export_summary() cascade;
-- 97: billing usage
drop view if exists public.roadcoda_billing;
drop function if exists public.carrier_truck_days(uuid, date, date), public.carrier_billing(uuid, date),
  public.roadcoda_billing_month(date), public.carrier_usage(text, int) cascade;
drop table if exists public.roadcoda_price_bands, public.roadcoda_price_settings cascade;
-- 96: EDI
drop table if exists public.edi_messages, public.edi_status_map, public.edi_charge_map, public.edi_ref_map, public.edi_connections cascade;
drop sequence if exists public.edi_control_seq;
drop function if exists public.edi_queue(uuid, text, jsonb, uuid, uuid, uuid, text), public.edi_status_payload(uuid, uuid, text),
  public.edi_stop_event(), public.edi_invoice_event(), public.edi_inbound(jsonb), public.edi_respond(uuid, boolean, text),
  public.edi_claim(int), public.edi_mark(uuid, boolean, text, text), public.edi_home(int),
  public.set_edi_connection(jsonb), public.edi_test_tender(uuid, int) cascade;
-- 95: two-factor (my_access is dropped with 68's entry; carriers.require_mfa goes with the table)
drop function if exists public.set_require_mfa(boolean) cascade;
-- 94: report a problem
drop view if exists public.roadcoda_problems, public.roadcoda_problems_all;
drop table if exists public.problem_reports cascade;
drop function if exists public.report_problem(text, text, jsonb, text), public.roadcoda_problem_answer(text, text) cascade;
-- 93: getting-started links (getting_started() is dropped with 58's entry below)
-- 92: starting a new carrier
drop view if exists public.roadcoda_carriers;
drop function if exists public.roadcoda_new_carrier(text, text, text, text, text) cascade;
-- 91: ask RoadCoda (add-on requests and contact details)
drop view if exists public.addon_requests_open;
drop table if exists public.addon_requests cascade;
drop function if exists public.ask_roadcoda(text, text), public.roadcoda_contact(), public.roadcoda_contact_set(text, text, text), public.roadcoda_answered(text, text) cascade;
-- 89: text messages
drop table if exists public.sms_messages, public.sms_optouts, public.roadcoda_settings cascade;
drop function if exists public.sms_e164(text), public.delivery_locations_sms(), public.sms_shared_number(), public.roadcoda_sms(text, int, text, boolean),
  public.sms_month_count(uuid), public.sms_driver_ok(uuid, text), public.loads_sms_driver(), public.trip_changes_sms_driver(), public.messages_sms_driver(),
  public.driver_sms_settings(boolean, boolean, boolean, boolean), public.driver_sms_get(), public.office_driver_sms(uuid, boolean),
  public.sms_store_body(uuid, text), public.sms_driver_body(public.sms_messages), public.sms_claim(int), public.sms_mark(uuid, boolean, text, text),
  public.sms_status(text, text, text), public.sms_inbound(text, text, text, text), public.texts_home(int) cascade;
select cron.unschedule('roadcoda-texts') where exists (select 1 from cron.job where jobname = 'roadcoda-texts');
-- 88: dock & load-out scanning
drop table if exists public.dock_returns, public.loadout_scans, public.load_loadouts, public.dock_workers cascade;
drop function if exists public.dock_carrier(boolean), public.dock_worker_ok(uuid, uuid), public.set_dock_pin(uuid, text),
  public.dock_supervisor_check(uuid, uuid, text), public.dock_home(date), public.dock_load(uuid), public.loadout_scan(uuid, text, uuid),
  public.loadout_remove(uuid, text, uuid), public.loadout_release(uuid, uuid, uuid, text, text), public.loadout_reopen(uuid, uuid),
  public.loads_loadout_gate(), public.driver_loadout(uuid), public.driver_loadout_ack(uuid), public.follow_list(), public.follow_send(uuid[], uuid),
  public.follow_cancel(uuid[], text), public.dock_return_scan(text, uuid, text, text), public.dock_returns_day(date),
  public.set_dock_settings(boolean), public.set_short_rule(uuid, text, int, numeric), public.dock_summary(date, date) cascade;
-- 87: live tracking
drop table if exists public.track_links cascade;
drop function if exists public.roadcoda_addon(text, text, boolean), public.make_track_link(uuid, text), public.create_track_link(uuid),
  public.office_track_link(uuid), public.portal_tracking_on(), public.portal_track_link(uuid), public.track_lookup(text), public.live_map(),
  public.driver_ping(double precision, double precision, numeric, numeric, numeric) cascade;
-- 86: safety dashboard + OSHA logs
drop table if exists public.incident_injuries, public.osha_years cascade;
drop function if exists public.safety_data(date, date), public.osha_log(int, uuid), public.osha_summary(int, uuid), public.incidents_find_location(), public.incident_injuries_before() cascade;
-- 84: route planning
drop table if exists public.unit_profiles cascade;
drop function if exists public.save_geocode(uuid, uuid, double precision, double precision), public.plan_apply(jsonb), public.set_plan_settings(numeric, numeric, int, numeric, numeric, time, boolean);
-- 83: dock scanning add-on (a catalog row; the table is dropped with 82 below)
-- 82: feature modules (my_access and the guarded functions are recreated by 68, 73, 74, 77, 79, 81)
drop table if exists public.carrier_features, public.feature_catalog cascade;
drop function if exists public.set_feature(text, boolean), public.apply_feature_preset(text), public.my_features(), public.driver_features(),
  public.feature_can_change(), public.app_feature(text), public.carrier_feature(uuid, text), public.my_addons() cascade;   -- my_addons: 90
-- 81: manifests
drop view if exists public.stop_label_status;
drop table if exists public.stop_expected_labels, public.manifest_batches cascade;
drop function if exists public.manifest_import(date, text, jsonb), public.driver_expected_labels(uuid), public.label_key(text) cascade;
-- 79: load documents (portal_photo_ok is recreated by 56; load_documents by 67)
drop function if exists public.driver_add_document(uuid, uuid, text, text, text), public.driver_documents(uuid), public.portal_documents(uuid);
-- 78: per-customer tolerances (the close-out views are rebuilt by 41 / 67 / 73)
drop function if exists public.set_close_defaults(numeric, int, numeric, numeric, int), public.load_tolerances(uuid);
-- 77: guest load links (the six copied functions / view are recreated by 58, 60, 66, 70)
do $$ begin perform cron.unschedule('roadcoda-guest-drivers') where exists (select 1 from cron.job where jobname = 'roadcoda-guest-drivers'); exception when others then null; end $$;
drop trigger if exists loads_guest_reassigned on public.loads;
drop trigger if exists loads_guest_one_load on public.loads;
drop function if exists public.guest_driver_create(uuid, text, text, text, text), public.guest_driver_end(uuid), public.guest_drivers_sweep(),
  public.loads_guest_reassigned(), public.loads_guest_one_load(), public.driver_is_guest() cascade;
-- 76: portal signed POD
drop function if exists public.portal_signatures(uuid);
-- 75: receiver exceptions
drop trigger if exists auto_invoice_receiver_notes on public.loads;
drop function if exists public.auto_invoice_receiver_notes() cascade;
-- 74: delivery signatures and invoice drafts
do $$ begin perform cron.unschedule('roadcoda-auto-invoice') where exists (select 1 from cron.job where jobname = 'roadcoda-auto-invoice'); exception when others then null; end $$;
drop trigger if exists auto_invoice_after_stop on public.stops;
drop table if exists public.stop_signatures cascade;
drop function if exists public.customer_delivery_rules(uuid), public.driver_signature_rule(uuid), public.driver_sign_stop(uuid, text, text, text, boolean, text, double precision, double precision), public.driver_sign_stop(uuid, text, text, text, boolean, text, double precision, double precision, text, text[]),
  public.office_edit_signature(uuid, text, text), public.auto_invoice_missing(uuid), public.auto_invoice_make(uuid, boolean), public.create_auto_load_invoice(uuid, boolean),
  public.auto_invoice_sweep(uuid), public.auto_invoice_kick(), public.auto_invoice_queue() cascade;
-- 73: GPS stop times (the close-out views are rebuilt by 41 / 67)
do $$ begin perform cron.unschedule('roadcoda-learn-locations') where exists (select 1 from cron.job where jobname = 'roadcoda-learn-locations'); exception when others then null; end $$;
drop trigger if exists truck_positions_geofence on public.truck_positions;
drop table if exists public.stop_geofence_events, public.stop_gps cascade;
drop function if exists public.truck_positions_geofence(), public.learn_location_coords(uuid), public.learn_location_coords_all(), public.learn_location_coords_one(uuid),
  public.set_location_coords(uuid, double precision, double precision, int), public.geo_meters(double precision, double precision, double precision, double precision);
delete from public.trip_check_codes where code = 'GT';
-- 72: portal tabs (the seven portal functions are recreated by 56, 59, 62, 63)
drop function if exists public.portal_team(), public.portal_set_hidden(uuid, text[]), public.portal_set_admin(uuid, boolean), public.set_portal_default_tabs(text[]),
  public.portal_tab_need(text), public.portal_tab_ok(text), public.portal_tabs_for(uuid), public.portal_allowed_tabs(uuid, uuid) cascade;
-- 71: claims
drop table if exists public.claim_layouts, public.claim_subrogation, public.claim_transactions, public.claim_valuations, public.claim_batches, public.claims cascade;
drop function if exists public.claims_import(date, text, text, jsonb), public.claims_as_of(date), public.claims_by_year(date, text), public.claims_triangle(text, text), public.claim_coverage(text), public.claim_manual_value(uuid, date);
-- 70: compliance & safety
drop policy if exists compliance_docs_read on storage.objects;
drop policy if exists compliance_docs_write on storage.objects;
drop view if exists public.compliance_status;
drop table if exists public.compliance_files, public.compliance_records, public.compliance_items cascade;
drop function if exists public.safety_summary(), public.compliance_doc_ok(text, boolean), public.seed_compliance_items(uuid);
-- 69: QuickBooks export
drop table if exists public.qb_item_map, public.qb_settings cascade;
drop function if exists public.qb_invoice_lines(date, date, boolean), public.qb_payments(date, date, boolean), public.qb_payroll(date, date, boolean), public.qb_mark_exported(text, uuid[]), public.invoice_payment_ref(uuid, text), public.qb_line_key(text, text);
-- 68: IFTA
drop view if exists public.ifta_fuel_all;
drop table if exists public.ifta_rates, public.ifta_layouts, public.ifta_fuel, public.ifta_miles, public.ifta_batches, public.ifta_jurisdictions cascade;
drop function if exists public.ifta_report(date, date), public.ifta_trucks(date, date), public.ifta_import(text, text, jsonb), public.ifta_match_unit(text, uuid), public.ifta_truck_for(uuid, text), public.ifta_jur(text), public.ifta_counts(text);
-- 67: trip sheets (the close-out views are rebuilt by 41)
drop table if exists public.load_documents, public.load_fuel cascade;
drop function if exists public.load_is_paper(uuid);
-- 66: handbooks
drop table if exists public.handbook_acks, public.handbook_versions, public.handbook_setup cascade;
drop function if exists public.handbook_publish(text, text, text), public.handbook_mark_paper(uuid, uuid, uuid, text), public.handbook_unmark_paper(uuid),
  public.handbook_status(text), public.driver_handbook_pending(), public.driver_handbook_sign(uuid, text, text), public.my_handbook_pending(), public.my_handbook_sign(uuid, text, text);
-- 65: office staff payroll
drop table if exists public.office_pay_lines, public.office_pay_periods, public.office_pay_adjustments, public.office_time, public.office_pay_codes, public.office_staff cascade;
drop function if exists public.office_pay_lines(date, date), public.office_pay_lines_core(uuid, date, date), public.office_period(date), public.office_period_of(date, text, date),
  public.approve_office_period(date), public.reopen_office_period(uuid, text), public.office_period_exported(uuid, text), public.my_office_clock(), public.office_clock(boolean),
  public.office_staff_link(uuid, text), public.office_staff_logins(), public.set_office_pay_schedule(text, date), public.seed_office_pay_codes(uuid);
-- 64: payroll company files
drop table if exists public.payroll_export_settings cascade;
drop function if exists public.pay_week_exported(uuid, text);
-- 63: returnable containers
drop view if exists public.container_balance, public.container_inventory, public.container_list;
drop table if exists public.container_moves, public.containers, public.container_types cascade;
drop function if exists public.portal_containers();
-- 62: route # and sort code (portal_list gained a column, so a reinstall of 56 needs it gone)
drop function if exists public.portal_list(date, date);
drop function if exists public.load_route(uuid);
-- 61: trip types
drop table if exists public.trip_type_rates, public.trip_types cascade;
-- 60: payroll rules
drop table if exists public.yard_shifts, public.driver_time_off cascade;
-- 59: toll factor per vehicle, monthly toll reconciliation
drop table if exists public.toll_reconciliations, public.toll_vehicle_types cascade;
-- 58: onboarding & retention
drop function if exists public.getting_started() cascade;   -- 93 redefines it; it lives with 58
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
