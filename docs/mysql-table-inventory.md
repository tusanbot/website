# Supabase public schema inventory → MySQL target

**Source project:** `yhbaedfifcxgjxutnyjc`  
**Branch:** `migration/blog-mysql-pilot`  
**Status:** read-only catalog inventory; no production schema/data changed.  
**Scope:** 60 tables in `public`; schema metadata only, no row contents or credentials.

> Catalog row figures are estimates, not exact `COUNT(*)` results. Exact counts and data reconciliation remain a migration gate.

## Summary

- Tables: 60
- Tables reporting RLS enabled: 60
- Columns reported: 646
- Unique foreign-key constraints reported: 108

## Table-by-table columns

### `profiles`
- Catalog row estimate: 15; RLS enabled: true
- Primary key: `id`
- Columns (11):
  - `id` — uuid; NOT NULL
  - `full_name` — character varying; NULL
  - `phone` — character varying; NULL
  - `national_code` — character varying; NULL
  - `birth_date` — date; NULL
  - `address` — text; NULL
  - `avatar_url` — text; NULL
  - `role` — character varying; NULL; default `'user'::character varying`; check `role::text = ANY (ARRAY['user'::character varying, 'admin'::character varying]::text[])`
  - `created_at` — timestamp with time zone; NULL; default `now()`
  - `updated_at` — timestamp with time zone; NULL; default `now()`
  - `theme_config` — jsonb; NULL

### `services`
- Catalog row estimate: 329; RLS enabled: true
- Primary key: `id`
- Columns (22):
  - `id` — uuid; NOT NULL; default `extensions.uuid_generate_v4()`
  - `title` — character varying; NOT NULL
  - `category` — character varying; NULL
  - `description` — text; NULL
  - `price` — integer; NULL; default `0`
  - `icon` — character varying; NULL
  - `form_schema` — jsonb; NULL
  - `is_active` — boolean; NULL; default `true`
  - `created_at` — timestamp with time zone; NULL; default `now()`
  - `parent_service_id` — uuid; NULL
  - `service_type` — text; NOT NULL; default `'normal'::text`; check `service_type = ANY (ARRAY['normal'::text, 'parent'::text])`
  - `slug` — text; NULL
  - `parent_form_id` — uuid; NULL
  - `pricing_rules` — jsonb; NOT NULL; default `'[]'::jsonb`; comment: Conditional pricing rules evaluated against submitted service form data.
  - `delivery_mode` — text; NOT NULL; default `'online'::text`; check `delivery_mode = ANY (ARRAY['online'::text, 'hybrid'::text, 'in_person'::text])`
  - `meta_title` — text; NULL
  - `meta_description` — text; NULL
  - `seo_keywords` — ARRAY; NULL
  - `is_popular` — boolean; NOT NULL; default `false`
  - `seo_content` — jsonb; NOT NULL; default `'{}'::jsonb`
  - `local_only` — boolean; NOT NULL; default `false`
  - `identity_verification_required` — boolean; NOT NULL; default `false`

### `registrations`
- Catalog row estimate: 0; RLS enabled: true
- Primary key: `id`
- Columns (11):
  - `id` — uuid; NOT NULL; default `extensions.uuid_generate_v4()`
  - `title` — character varying; NOT NULL
  - `category` — character varying; NULL
  - `description` — text; NULL
  - `start_date` — date; NULL
  - `end_date` — date; NULL
  - `extension_date` — date; NULL
  - `link` — text; NULL
  - `priority` — integer; NULL; default `0`
  - `is_active` — boolean; NULL; default `true`
  - `created_at` — timestamp with time zone; NULL; default `now()`

### `orders`
- Catalog row estimate: 22; RLS enabled: true
- Primary key: `id`
- Columns (29):
  - `id` — uuid; NOT NULL; default `extensions.uuid_generate_v4()`
  - `tracking_code` — character varying; NOT NULL
  - `user_id` — uuid; NULL
  - `service_id` — uuid; NULL
  - `status` — character varying; NULL; default `'registered'::character varying`; check `status::text = ANY (ARRAY['registered'::character varying, 'pending_payment'::character varying, 'checking'::character varying, 'need_documents'::character varying, 'processing'::character varying, 'ready'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'rejected'::character varying]::text[])) NOT VALI`
  - `form_data` — jsonb; NULL
  - `admin_note` — text; NULL
  - `price` — integer; NULL; default `0`
  - `created_at` — timestamp with time zone; NULL; default `now()`
  - `updated_at` — timestamp with time zone; NULL; default `now()`
  - `form_id` — uuid; NULL; comment: Exact custom form selected for this order.
  - `form_schema_snapshot` — jsonb; NULL; comment: Immutable snapshot of the exact form schema used when the order was submitted.
  - `form_version_id` — uuid; NULL
  - `idempotency_key` — text; NULL
  - `assigned_staff_id` — uuid; NULL
  - `assignment_status` — text; NOT NULL; default `'unassigned'::text`; check `assignment_status = ANY (ARRAY['unassigned'::text, 'pending_approval'::text, 'assigned'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])`
  - `assigned_at` — timestamp with time zone; NULL
  - `assigned_by` — uuid; NULL
  - `processing_status` — text; NOT NULL; default `'awaiting_payment'::text`
  - `result_submitted_at` — timestamp with time zone; NULL
  - `completed_at` — timestamp with time zone; NULL
  - `completion_note` — text; NULL
  - `commission_percent` — numeric; NULL
  - `commission_amount` — bigint; NULL
  - `original_price` — bigint; NULL
  - `discount_amount` — bigint; NOT NULL; default `0`
  - `discount_code_id` — uuid; NULL
  - `discount_id` — uuid; NULL
  - `discount_snapshot` — jsonb; NOT NULL; default `'{}'::jsonb`

### `order_files`
- Catalog row estimate: 3; RLS enabled: true
- Primary key: `id`
- Columns (10):
  - `id` — uuid; NOT NULL; default `extensions.uuid_generate_v4()`
  - `order_id` — uuid; NULL
  - `file_name` — character varying; NULL
  - `file_path` — text; NULL
  - `file_type` — character varying; NULL
  - `created_at` — timestamp with time zone; NULL; default `now()`
  - `file_title` — text; NULL
  - `file_size` — bigint; NULL
  - `uploaded_by` — uuid; NULL
  - `deleted_at` — timestamp with time zone; NULL

### `order_history`
- Catalog row estimate: 11; RLS enabled: true
- Primary key: `id`
- Columns (6):
  - `id` — uuid; NOT NULL; default `extensions.uuid_generate_v4()`
  - `order_id` — uuid; NULL
  - `old_status` — character varying; NULL
  - `new_status` — character varying; NULL
  - `description` — text; NULL
  - `created_at` — timestamp with time zone; NULL; default `now()`

### `messages`
- Catalog row estimate: 9; RLS enabled: true
- Primary key: `id`
- Columns (10):
  - `id` — uuid; NOT NULL; default `extensions.uuid_generate_v4()`
  - `order_id` — uuid; NULL
  - `sender_id` — uuid; NULL
  - `message` — text; NULL
  - `is_read` — boolean; NULL; default `false`
  - `created_at` — timestamp with time zone; NULL; default `now()`
  - `sender_name` — text; NULL
  - `sender_role` — text; NULL
  - `read_by_user` — boolean; NULL; default `false`
  - `read_by_admin` — boolean; NULL; default `false`

### `custom_forms`
- Catalog row estimate: 156; RLS enabled: true
- Primary key: `id`
- Columns (13):
  - `id` — uuid; NOT NULL; default `extensions.uuid_generate_v4()`
  - `title` — character varying; NULL
  - `description` — text; NULL
  - `schema` — jsonb; NULL
  - `created_by` — uuid; NULL
  - `is_public` — boolean; NULL; default `false`
  - `created_at` — timestamp with time zone; NULL; default `now()`
  - `form_type` — text; NOT NULL; default `'normal'::text`; check `form_type = ANY (ARRAY['normal'::text, 'parent'::text])`; comment: normal = standalone or child form; parent = container/root form
  - `parent_form_id` — uuid; NULL; comment: Self-reference to the parent form. NULL for parent and standalone forms.
  - `service_id` — uuid; NULL; comment: Service that owns this form hierarchy.
  - `sort_order` — integer; NOT NULL; default `0`; comment: Display order of child forms inside the parent.
  - `price` — numeric; NOT NULL; default `0`; comment: Price for this exact form; child forms may have their own service price.
  - `active_version_id` — uuid; NULL

### `services_announcements`
- Catalog row estimate: 5; RLS enabled: true
- Primary key: `id`
- Columns (16):
  - `id` — uuid; NOT NULL; default `extensions.uuid_generate_v4()`
  - `title` — character varying; NOT NULL
  - `type` — character varying; NOT NULL; default `'registration'::character varying`; check `type::text = ANY (ARRAY['registration'::character varying, 'announcement'::character varying, 'notice'::character varying, 'regulation'::character varying]::text[])`
  - `summary` — text; NULL
  - `content` — text; NULL
  - `start_at` — timestamp with time zone; NULL
  - `end_at` — timestamp with time zone; NULL
  - `documents` — jsonb; NOT NULL; default `'[]'::jsonb`
  - `is_active` — boolean; NOT NULL; default `true`
  - `is_extendable` — boolean; NOT NULL; default `true`
  - `extended_end_at` — timestamp with time zone; NULL
  - `button_label` — character varying; NULL; default `'ثبت‌نام'::character varying`
  - `service_id` — uuid; NULL
  - `priority` — integer; NOT NULL; default `0`
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `updated_at` — timestamp with time zone; NOT NULL; default `now()`

### `site_settings`
- Catalog row estimate: 1; RLS enabled: true
- Primary key: `id`
- Columns (23):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `site_name` — text; NULL; default `'توسن'::text`
  - `site_description` — text; NULL; default `'سامانه خدمات آنلاین کافی‌نت توسن'::text`
  - `theme` — text; NULL; default `'light'::text`
  - `primary_color` — text; NULL; default `'#09967c'::text`
  - `primary_dark` — text; NULL; default `'#087d69'::text`
  - `radius` — text; NULL; default `'28px'::text`
  - `font_family` — text; NULL; default `'Vazirmatn'::text`
  - `updated_at` — timestamp with time zone; NULL; default `now()`
  - `primary_light` — text; NULL
  - `radius_xl` — integer; NULL
  - `radius_lg` — integer; NULL
  - `radius_md` — integer; NULL
  - `blur_panel` — integer; NULL
  - `blur_card` — integer; NULL
  - `shadow_sm` — text; NULL
  - `shadow_md` — text; NULL
  - `shadow_lg` — text; NULL
  - `motion_enabled` — boolean; NULL; default `true`
  - `motion_hover_scale` — numeric; NULL; default `1.02`
  - `motion_hover_lift` — integer; NULL; default `'-3'::integer`
  - `motion_duration` — integer; NULL; default `220`
  - `config` — jsonb; NOT NULL; default `'{}'::jsonb`

### `goals`
- Catalog row estimate: 0; RLS enabled: true
- Primary key: `id`
- Columns (10):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `title` — text; NOT NULL
  - `description` — text; NOT NULL; default `''::text`
  - `budget` — bigint; NOT NULL; default `0`; check `budget >= 0`
  - `spent` — bigint; NOT NULL; default `0`; check `spent >= 0`
  - `progress` — integer; NOT NULL; default `0`; check `progress >= 0 AND progress <= 100`
  - `status` — text; NOT NULL; default `'planning'::text`; check `status = ANY (ARRAY['planning'::text, 'active'::text, 'completed'::text])`
  - `created_by` — uuid; NULL
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `updated_at` — timestamp with time zone; NOT NULL; default `now()`

### `sub_goals`
- Catalog row estimate: 0; RLS enabled: true
- Primary key: `id`
- Columns (10):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `goal_id` — uuid; NOT NULL
  - `title` — text; NOT NULL
  - `description` — text; NOT NULL; default `''::text`
  - `budget` — bigint; NOT NULL; default `0`; check `budget >= 0`
  - `spent` — bigint; NOT NULL; default `0`; check `spent >= 0`
  - `progress` — integer; NOT NULL; default `0`; check `progress >= 0 AND progress <= 100`
  - `completed` — boolean; NOT NULL; default `false`
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `updated_at` — timestamp with time zone; NOT NULL; default `now()`

### `financial_transactions`
- Catalog row estimate: 1; RLS enabled: true
- Primary key: `id`
- Columns (11):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `type` — text; NOT NULL
  - `category` — text; NOT NULL
  - `amount` — bigint; NOT NULL
  - `description` — text; NOT NULL; default `''::text`
  - `donation_id` — uuid; NULL
  - `goal_id` — uuid; NULL
  - `expense_id` — uuid; NULL
  - `date` — date; NOT NULL; default `CURRENT_DATE`
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `created_by` — uuid; NULL

### `payments`
- Catalog row estimate: 12; RLS enabled: true
- Primary key: `id`
- Columns (16):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `order_id` — uuid; NOT NULL
  - `user_id` — uuid; NOT NULL
  - `amount` — bigint; NOT NULL; check `amount > 0`
  - `method` — text; NOT NULL; default `'online'::text`; check `method = ANY (ARRAY['online'::text, 'card_to_card'::text])`; comment: online = gateway payment; card_to_card = manual bank-card transfer.
  - `gateway` — text; NULL; check `gateway IS NULL OR (gateway = ANY (ARRAY['zibal'::text, 'zarinpal'::text, 'manual'::text]))`; comment: Payment provider: zibal, zarinpal, or manual for card-to-card.
  - `status` — text; NOT NULL; default `'pending'::text`; check `status = ANY (ARRAY['pending'::text, 'redirected'::text, 'paid'::text, 'failed'::text, 'cancelled'::text, 'refunded'::text, 'awaiting_manual_verification'::text, 'rejected'::text])`
  - `authority` — text; NULL; comment: Gateway-specific payment authority/token, such as Zibal trackId when applicable.
  - `transaction_id` — text; NULL; comment: Gateway reference/transaction identifier after successful verification.
  - `gateway_response` — jsonb; NULL; comment: Raw normalized/sanitized gateway response for auditing; never store secrets.
  - `card_last4` — text; NULL
  - `receipt_image_url` — text; NULL; comment: Storage URL for a user-uploaded card-to-card receipt.
  - `admin_note` — text; NULL
  - `paid_at` — timestamp with time zone; NULL
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `updated_at` — timestamp with time zone; NOT NULL; default `now()`

### `social_platforms`
- Catalog row estimate: 8; RLS enabled: true
- Primary key: `id`
- Columns (9):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `name` — text; NOT NULL
  - `slug` — text; NOT NULL
  - `icon` — text; NULL
  - `description` — text; NULL
  - `is_active` — boolean; NOT NULL; default `true`
  - `sort_order` — integer; NOT NULL; default `0`
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `updated_at` — timestamp with time zone; NOT NULL; default `now()`

### `social_categories`
- Catalog row estimate: 30; RLS enabled: true
- Primary key: `id`
- Columns (9):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `platform_id` — uuid; NOT NULL
  - `name` — text; NOT NULL
  - `slug` — text; NOT NULL
  - `description` — text; NULL
  - `is_active` — boolean; NOT NULL; default `true`
  - `sort_order` — integer; NOT NULL; default `0`
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `updated_at` — timestamp with time zone; NOT NULL; default `now()`

### `social_services`
- Catalog row estimate: 121; RLS enabled: true
- Primary key: `id`
- Columns (18):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `platform_id` — uuid; NOT NULL
  - `category_id` — uuid; NOT NULL
  - `provider` — text; NOT NULL; default `'fjpanel'::text`
  - `provider_service_id` — text; NULL
  - `name` — text; NOT NULL; comment: Local customer-facing display name; editable by admins.
  - `description` — text; NULL
  - `service_type` — text; NOT NULL; default `'default'::text`
  - `provider_rate` — numeric; NULL
  - `min_quantity` — integer; NOT NULL; default `1`
  - `max_quantity` — integer; NOT NULL; default `1`
  - `profit_type` — text; NOT NULL; default `'percentage'::text`; check `profit_type = ANY (ARRAY['percentage'::text, 'fixed'::text, 'none'::text])`
  - `profit_value` — numeric; NOT NULL; default `0`; check `profit_value >= 0::numeric`
  - `is_active` — boolean; NOT NULL; default `true`
  - `sort_order` — integer; NOT NULL; default `0`
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `updated_at` — timestamp with time zone; NOT NULL; default `now()`
  - `provider_name` — text; NULL; comment: Original service name returned by the external provider (FJPanel).

### `social_orders`
- Catalog row estimate: 4; RLS enabled: true
- Primary key: `id`
- Columns (25):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `tracking_code` — text; NOT NULL
  - `user_id` — uuid; NOT NULL
  - `service_id` — uuid; NOT NULL
  - `provider` — text; NOT NULL; default `'fjpanel'::text`
  - `provider_order_id` — text; NULL
  - `link` — text; NOT NULL
  - `quantity` — integer; NOT NULL; check `quantity > 0`
  - `price` — numeric; NOT NULL; default `0`; check `price >= 0::numeric`
  - `provider_charge` — numeric; NULL
  - `status` — text; NOT NULL; default `'pending'::text`; check `status = ANY (ARRAY['pending'::text, 'awaiting_payment'::text, 'paid'::text, 'processing'::text, 'partial'::text, 'completed'::text, 'cancelled'::text, 'failed'::text])`
  - `provider_status` — text; NULL
  - `admin_note` — text; NULL
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `updated_at` — timestamp with time zone; NOT NULL; default `now()`
  - `payment_provider` — text; NULL
  - `payment_track_id` — text; NULL
  - `payment_reference` — text; NULL
  - `paid_at` — timestamp with time zone; NULL
  - `admin_approved` — boolean; NOT NULL; default `false`
  - `admin_approved_at` — timestamp with time zone; NULL
  - `admin_approved_by` — uuid; NULL
  - `idempotency_key` — text; NULL
  - `provider_start` — integer; NULL
  - `provider_remaining` — integer; NULL

### `social_sync_logs`
- Catalog row estimate: 0; RLS enabled: true
- Primary key: `id`
- Columns (8):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `success` — boolean; NOT NULL; default `false`
  - `received` — integer; NOT NULL; default `0`
  - `synced` — integer; NOT NULL; default `0`
  - `skipped` — integer; NOT NULL; default `0`
  - `error_message` — text; NULL
  - `source` — text; NOT NULL; default `'manual'::text`
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`

### `api_rate_limits`
- Catalog row estimate: 81; RLS enabled: true
- Primary key: `key`
- Columns (4):
  - `key` — text; NOT NULL
  - `window_started_at` — timestamp with time zone; NOT NULL
  - `request_count` — integer; NOT NULL; default `0`
  - `updated_at` — timestamp with time zone; NOT NULL; default `now()`

### `blog_categories`
- Catalog row estimate: 4; RLS enabled: true
- Primary key: `id`
- Columns (5):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `name` — text; NOT NULL
  - `slug` — text; NOT NULL
  - `description` — text; NULL
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`

### `blog_posts`
- Catalog row estimate: 69; RLS enabled: true
- Primary key: `id`
- Columns (16):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `title` — text; NOT NULL
  - `slug` — text; NOT NULL
  - `excerpt` — text; NULL
  - `content` — text; NOT NULL; default `''::text`
  - `featured_image` — text; NULL
  - `category_id` — uuid; NULL
  - `meta_title` — text; NULL
  - `meta_description` — text; NULL
  - `status` — text; NOT NULL; default `'draft'::text`; check `status = ANY (ARRAY['draft'::text, 'published'::text])`
  - `published_at` — timestamp with time zone; NULL
  - `author_id` — uuid; NULL
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `updated_at` — timestamp with time zone; NOT NULL; default `now()`
  - `primary_keyword` — text; NULL
  - `seo_keywords` — ARRAY; NULL

### `blog_post_services`
- Catalog row estimate: 70; RLS enabled: true
- Primary key: `post_id`, `service_id`
- Columns (2):
  - `post_id` — uuid; NOT NULL
  - `service_id` — uuid; NOT NULL

### `ai_profiles`
- Catalog row estimate: 4; RLS enabled: true
- Primary key: `id`
- Columns (16):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `key_hash` — text; NOT NULL
  - `encrypted_api_key` — text; NOT NULL
  - `provider` — text; NOT NULL; default `'gemini'::text`
  - `model` — text; NOT NULL; default `'gemini-2.5-flash'::text`
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `last_used_at` — timestamp with time zone; NULL
  - `user_id` — uuid; NULL
  - `model_config` — jsonb; NOT NULL; default `'{}'::jsonb`
  - `text_encrypted_api_key` — text; NULL
  - `image_encrypted_api_key` — text; NULL
  - `video_encrypted_api_key` — text; NULL
  - `music_encrypted_api_key` — text; NULL
  - `tts_encrypted_api_key` — text; NULL
  - `xai_text_encrypted_api_key` — text; NULL
  - `xai_tts_encrypted_api_key` — text; NULL

### `ai_sessions`
- Catalog row estimate: 6; RLS enabled: true
- Primary key: `id`
- Columns (6):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `ai_profile_id` — uuid; NOT NULL
  - `token_hash` — text; NOT NULL
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `expires_at` — timestamp with time zone; NOT NULL
  - `last_used_at` — timestamp with time zone; NULL

### `form_versions`
- Catalog row estimate: 436; RLS enabled: true
- Primary key: `id`
- Columns (10):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `form_id` — uuid; NOT NULL
  - `version_number` — integer; NOT NULL
  - `schema` — jsonb; NOT NULL; default `'{}'::jsonb`
  - `title` — text; NULL
  - `description` — text; NULL
  - `price` — numeric; NULL
  - `created_by` — uuid; NULL
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `is_active` — boolean; NOT NULL; default `false`

### `traxtor_saved_projects`
- Catalog row estimate: 0; RLS enabled: true
- Primary key: `id`
- Columns (6):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `name` — text; NOT NULL
  - `tool` — text; NOT NULL
  - `project_data` — jsonb; NOT NULL
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `updated_at` — timestamp with time zone; NOT NULL; default `now()`

### `notifications`
- Catalog row estimate: 76; RLS enabled: true
- Primary key: `id`
- Columns (9):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `recipient_id` — uuid; NOT NULL
  - `type` — text; NOT NULL
  - `title` — text; NOT NULL
  - `message` — text; NULL
  - `order_id` — uuid; NULL
  - `metadata` — jsonb; NOT NULL; default `'{}'::jsonb`
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `read_at` — timestamp with time zone; NULL

### `support_conversations`
- Catalog row estimate: 10; RLS enabled: true
- Primary key: `id`
- Columns (10):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `user_id` — uuid; NOT NULL
  - `status` — text; NOT NULL; default `'open'::text`; check `status = ANY (ARRAY['open'::text, 'closed'::text])`
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `updated_at` — timestamp with time zone; NOT NULL; default `now()`
  - `order_id` — uuid; NULL
  - `assignment_mode` — text; NOT NULL; default `'queue'::text`; check `assignment_mode = ANY (ARRAY['order'::text, 'queue'::text])`
  - `assigned_staff_id` — uuid; NULL
  - `assigned_at` — timestamp with time zone; NULL
  - `closed_at` — timestamp with time zone; NULL

### `support_messages`
- Catalog row estimate: 10; RLS enabled: true
- Primary key: `id`
- Columns (7):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `conversation_id` — uuid; NOT NULL
  - `sender_id` — uuid; NOT NULL
  - `sender_role` — text; NOT NULL; check `sender_role = ANY (ARRAY['user'::text, 'admin'::text, 'staff'::text])`
  - `message` — text; NOT NULL; check `char_length(TRIM(BOTH FROM message)) >= 1 AND char_length(TRIM(BOTH FROM message)) <= 4000`
  - `is_read` — boolean; NOT NULL; default `false`
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`

### `blog_comments`
- Catalog row estimate: 3; RLS enabled: true
- Primary key: `id`
- Columns (8):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `post_id` — uuid; NOT NULL
  - `user_id` — uuid; NOT NULL
  - `content` — text; NOT NULL; check `char_length(TRIM(BOTH FROM content)) >= 2 AND char_length(TRIM(BOTH FROM content)) <= 2000`
  - `status` — text; NOT NULL; default `'pending'::text`; check `status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])`
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `updated_at` — timestamp with time zone; NOT NULL; default `now()`
  - `author_name` — text; NULL

### `blog_ratings`
- Catalog row estimate: 4; RLS enabled: true
- Primary key: `id`
- Columns (6):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `post_id` — uuid; NOT NULL
  - `user_id` — uuid; NOT NULL
  - `rating` — smallint; NOT NULL; check `rating >= 1 AND rating <= 5`
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `updated_at` — timestamp with time zone; NOT NULL; default `now()`

### `blog_reactions`
- Catalog row estimate: 4; RLS enabled: true
- Primary key: `id`
- Columns (6):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `post_id` — uuid; NOT NULL
  - `user_id` — uuid; NOT NULL
  - `reaction` — text; NOT NULL; check `reaction = ANY (ARRAY['like'::text, 'dislike'::text])`
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `updated_at` — timestamp with time zone; NOT NULL; default `now()`

### `staff_roles`
- Catalog row estimate: 3; RLS enabled: true
- Primary key: `id`
- Columns (7):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `code` — text; NOT NULL
  - `name` — text; NOT NULL
  - `description` — text; NULL
  - `is_system` — boolean; NOT NULL; default `false`
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `permissions` — jsonb; NOT NULL; default `'{}'::jsonb`

### `staff_role_assignments`
- Catalog row estimate: 5; RLS enabled: true
- Primary key: `id`
- Columns (10):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `user_id` — uuid; NOT NULL
  - `role_id` — uuid; NOT NULL
  - `status` — text; NOT NULL; default `'pending'::text`; check `status = ANY (ARRAY['pending'::text, 'approved'::text, 'suspended'::text, 'rejected'::text, 'revoked'::text])`
  - `commission_percent` — numeric; NOT NULL; default `0`; check `commission_percent >= 0::numeric AND commission_percent <= 100::numeric`
  - `approved_by` — uuid; NULL
  - `approved_at` — timestamp with time zone; NULL
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `updated_at` — timestamp with time zone; NOT NULL; default `now()`
  - `staff_code` — text; NULL

### `staff_service_access`
- Catalog row estimate: 257; RLS enabled: true
- Primary key: `id`
- Columns (9):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `user_id` — uuid; NOT NULL
  - `service_id` — uuid; NOT NULL
  - `status` — text; NOT NULL; default `'pending'::text`; check `status = ANY (ARRAY['pending'::text, 'approved'::text, 'suspended'::text, 'rejected'::text])`
  - `commission_percent` — numeric; NOT NULL; default `0`; check `commission_percent >= 0::numeric AND commission_percent <= 100::numeric`
  - `approved_by` — uuid; NULL
  - `approved_at` — timestamp with time zone; NULL
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `updated_at` — timestamp with time zone; NOT NULL; default `now()`

### `support_conversation_participants`
- Catalog row estimate: 0; RLS enabled: true
- Primary key: `id`
- Columns (6):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `conversation_id` — uuid; NOT NULL
  - `user_id` — uuid; NOT NULL
  - `participant_type` — text; NOT NULL; check `participant_type = ANY (ARRAY['customer'::text, 'staff'::text])`
  - `joined_at` — timestamp with time zone; NOT NULL; default `now()`
  - `left_at` — timestamp with time zone; NULL

### `order_staff_requests`
- Catalog row estimate: 2; RLS enabled: true
- Primary key: `id`
- Columns (10):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `order_id` — uuid; NOT NULL
  - `staff_user_id` — uuid; NOT NULL
  - `requested_by` — uuid; NOT NULL
  - `status` — text; NOT NULL; default `'pending'::text`; check `status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text])`
  - `commission_percent` — numeric; NOT NULL; default `0`; check `commission_percent >= 0::numeric AND commission_percent <= 100::numeric`
  - `approved_by` — uuid; NULL
  - `approved_at` — timestamp with time zone; NULL
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `updated_at` — timestamp with time zone; NOT NULL; default `now()`

### `order_commission_ledger`
- Catalog row estimate: 1; RLS enabled: true
- Primary key: `id`
- Columns (10):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `order_id` — uuid; NOT NULL
  - `staff_user_id` — uuid; NOT NULL
  - `commission_percent` — numeric; NOT NULL; check `commission_percent >= 0::numeric AND commission_percent <= 100::numeric`
  - `order_amount` — bigint; NOT NULL; check `order_amount >= 0`
  - `commission_amount` — bigint; NOT NULL; check `commission_amount >= 0`
  - `status` — text; NOT NULL; default `'pending'::text`; check `status = ANY (ARRAY['pending'::text, 'approved'::text, 'paid'::text, 'void'::text])`
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `approved_at` — timestamp with time zone; NULL
  - `paid_at` — timestamp with time zone; NULL

### `staff_category_access`
- Catalog row estimate: 1; RLS enabled: true
- Primary key: `id`
- Columns (9):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `user_id` — uuid; NOT NULL
  - `category` — text; NOT NULL
  - `status` — text; NOT NULL; default `'approved'::text`; check `status = ANY (ARRAY['approved'::text, 'revoked'::text])`
  - `commission_percent` — numeric; NOT NULL; default `0`; check `commission_percent >= 0::numeric AND commission_percent <= 100::numeric`
  - `approved_by` — uuid; NULL
  - `approved_at` — timestamp with time zone; NULL
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `updated_at` — timestamp with time zone; NOT NULL; default `now()`

### `staff_reviews`
- Catalog row estimate: 1; RLS enabled: true
- Primary key: `id`
- Columns (10):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `order_id` — uuid; NOT NULL
  - `staff_id` — uuid; NOT NULL
  - `customer_id` — uuid; NOT NULL
  - `rating` — smallint; NOT NULL; check `rating >= 1 AND rating <= 5`
  - `comment` — text; NULL
  - `strengths` — ARRAY; NOT NULL; default `'{}'::text[]`
  - `weaknesses` — ARRAY; NOT NULL; default `'{}'::text[]`
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `updated_at` — timestamp with time zone; NOT NULL; default `now()`

### `support_reviews`
- Catalog row estimate: 2; RLS enabled: true
- Primary key: `id`
- Columns (9):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `conversation_id` — uuid; NOT NULL
  - `customer_id` — uuid; NOT NULL
  - `staff_id` — uuid; NULL
  - `rating` — smallint; NOT NULL; check `rating >= 1 AND rating <= 5`
  - `comment` — text; NULL
  - `strengths` — ARRAY; NOT NULL; default `'{}'::text[]`
  - `weaknesses` — ARRAY; NOT NULL; default `'{}'::text[]`
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`

### `staff_bank_accounts`
- Catalog row estimate: 1; RLS enabled: true
- Primary key: `id`
- Columns (13):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `user_id` — uuid; NOT NULL
  - `account_title` — text; NOT NULL
  - `iban` — text; NOT NULL
  - `account_number` — text; NULL
  - `is_default` — boolean; NOT NULL; default `false`
  - `is_active` — boolean; NOT NULL; default `true`
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `updated_at` — timestamp with time zone; NOT NULL; default `now()`
  - `status` — text; NOT NULL; default `'pending'::text`; check `status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])`
  - `verified_by` — uuid; NULL
  - `verified_at` — timestamp with time zone; NULL
  - `rejection_reason` — text; NULL

### `staff_earnings`
- Catalog row estimate: 2; RLS enabled: true
- Primary key: `id`
- Columns (12):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `staff_id` — uuid; NOT NULL
  - `order_id` — uuid; NULL
  - `gross_amount` — bigint; NOT NULL; default `0`
  - `commission_percent` — numeric; NOT NULL; default `0`
  - `commission_amount` — bigint; NOT NULL; default `0`
  - `net_amount` — bigint; NOT NULL; default `0`
  - `adjustment_amount` — bigint; NOT NULL; default `0`
  - `status` — text; NOT NULL; default `'available'::text`; check `status = ANY (ARRAY['available'::text, 'held'::text, 'settled'::text, 'reversed'::text])`
  - `description` — text; NULL
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `updated_at` — timestamp with time zone; NOT NULL; default `now()`

### `staff_settlements`
- Catalog row estimate: 2; RLS enabled: true
- Primary key: `id`
- Columns (16):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `staff_id` — uuid; NOT NULL
  - `bank_account_id` — uuid; NOT NULL
  - `amount` — bigint; NOT NULL
  - `status` — text; NOT NULL; default `'requested'::text`; check `status = ANY (ARRAY['requested'::text, 'approved'::text, 'processing'::text, 'paid'::text, 'rejected'::text])) NOT VALI`
  - `admin_note` — text; NULL
  - `requested_at` — timestamp with time zone; NOT NULL; default `now()`
  - `processed_at` — timestamp with time zone; NULL
  - `processed_by` — uuid; NULL
  - `fee_amount` — bigint; NOT NULL; default `1000`
  - `net_amount` — bigint; NOT NULL; default `0`
  - `payment_amount` — bigint; NULL
  - `payment_reference` — text; NULL
  - `payment_paid_at` — timestamp with time zone; NULL
  - `payment_receipt_path` — text; NULL
  - `payment_note` — text; NULL

### `staff_financial_adjustments`
- Catalog row estimate: 1; RLS enabled: true
- Primary key: `id`
- Columns (9):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `staff_id` — uuid; NOT NULL
  - `order_id` — uuid; NULL
  - `amount` — bigint; NOT NULL; check `amount <> 0`
  - `reason` — text; NOT NULL
  - `created_by` — uuid; NULL
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `adjustment_type` — text; NOT NULL; default `'manual'::text`
  - `reference_key` — text; NULL

### `payout_requests`
- Catalog row estimate: 0; RLS enabled: true
- Primary key: `id`
- Columns (11):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `staff_user_id` — uuid; NOT NULL
  - `bank_account_id` — uuid; NOT NULL
  - `amount` — bigint; NOT NULL; check `amount > 0`
  - `status` — text; NOT NULL; default `'requested'::text`; check `status = ANY (ARRAY['requested'::text, 'approved'::text, 'processing'::text, 'paid'::text, 'rejected'::text])`
  - `admin_note` — text; NULL
  - `processed_by` — uuid; NULL
  - `processed_at` — timestamp with time zone; NULL
  - `paid_at` — timestamp with time zone; NULL
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `updated_at` — timestamp with time zone; NOT NULL; default `now()`

### `support_faqs`
- Catalog row estimate: 8; RLS enabled: true
- Primary key: `id`
- Columns (9):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `category` — text; NOT NULL
  - `question` — text; NOT NULL
  - `answer` — text; NOT NULL
  - `keywords` — ARRAY; NOT NULL; default `'{}'::text[]`
  - `sort_order` — integer; NOT NULL; default `0`
  - `is_active` — boolean; NOT NULL; default `true`
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `updated_at` — timestamp with time zone; NOT NULL; default `now()`

### `order_refunds`
- Catalog row estimate: 0; RLS enabled: true
- Primary key: `id`
- Columns (15):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `order_id` — uuid; NOT NULL
  - `user_id` — uuid; NOT NULL
  - `amount` — bigint; NOT NULL; check `amount > 0`
  - `status` — text; NOT NULL; default `'requested'::text`; check `status = ANY (ARRAY['requested'::text, 'approved'::text, 'processing'::text, 'completed'::text, 'rejected'::text, 'failed'::text])`
  - `reason` — text; NOT NULL
  - `refund_method` — text; NOT NULL; default `'manual_bank_transfer'::text`
  - `transaction_id` — text; NULL
  - `admin_note` — text; NULL
  - `requested_by` — uuid; NULL
  - `processed_by` — uuid; NULL
  - `requested_at` — timestamp with time zone; NOT NULL; default `now()`
  - `processed_at` — timestamp with time zone; NULL
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `updated_at` — timestamp with time zone; NOT NULL; default `now()`

### `order_cancellation_requests`
- Catalog row estimate: 1; RLS enabled: true
- Primary key: `id`
- Columns (11):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `order_id` — uuid; NOT NULL
  - `user_id` — uuid; NOT NULL
  - `status` — text; NOT NULL; default `'pending'::text`; check `status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])`
  - `reason` — text; NOT NULL; check `char_length(btrim(reason)) >= 3 AND char_length(btrim(reason)) <= 2000`
  - `admin_note` — text; NULL
  - `requested_at` — timestamp with time zone; NOT NULL; default `now()`
  - `reviewed_at` — timestamp with time zone; NULL
  - `reviewed_by` — uuid; NULL
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `updated_at` — timestamp with time zone; NOT NULL; default `now()`

### `member_tags`
- Catalog row estimate: 1; RLS enabled: true
- Primary key: `id`
- Columns (8):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `name` — text; NOT NULL
  - `slug` — text; NOT NULL
  - `description` — text; NULL
  - `color` — text; NULL; default `'#179d99'::text`
  - `is_active` — boolean; NOT NULL; default `true`
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `updated_at` — timestamp with time zone; NOT NULL; default `now()`

### `member_tag_assignments`
- Catalog row estimate: 2; RLS enabled: true
- Primary key: `id`
- Columns (7):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `tag_id` — uuid; NOT NULL
  - `user_id` — uuid; NOT NULL
  - `assigned_at` — timestamp with time zone; NOT NULL; default `now()`
  - `expires_at` — timestamp with time zone; NULL
  - `source` — text; NOT NULL; default `'manual'::text`
  - `referral_link_id` — uuid; NULL

### `tag_referral_links`
- Catalog row estimate: 2; RLS enabled: true
- Primary key: `id`
- Columns (7):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `tag_id` — uuid; NOT NULL
  - `code` — text; NOT NULL
  - `is_active` — boolean; NOT NULL; default `true`
  - `expires_at` — timestamp with time zone; NULL
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `assignment_duration_days` — integer; NULL; check `assignment_duration_days IS NULL OR assignment_duration_days > 0`

### `discounts`
- Catalog row estimate: 1; RLS enabled: true
- Primary key: `id`
- Columns (17):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `name` — text; NOT NULL
  - `description` — text; NULL
  - `discount_type` — text; NOT NULL; check `discount_type = ANY (ARRAY['percent'::text, 'fixed'::text])`
  - `value` — numeric; NOT NULL; check `value >= 0::numeric`
  - `max_discount_amount` — bigint; NULL
  - `min_order_amount` — bigint; NULL
  - `starts_at` — timestamp with time zone; NULL
  - `ends_at` — timestamp with time zone; NULL
  - `usage_limit` — integer; NULL
  - `per_user_limit` — integer; NULL
  - `is_active` — boolean; NOT NULL; default `true`
  - `stackable` — boolean; NOT NULL; default `false`
  - `priority` — integer; NOT NULL; default `0`
  - `applies_to_all_services` — boolean; NOT NULL; default `true`
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `updated_at` — timestamp with time zone; NOT NULL; default `now()`

### `discount_codes`
- Catalog row estimate: 1; RLS enabled: true
- Primary key: `id`
- Columns (9):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `discount_id` — uuid; NOT NULL
  - `code` — text; NOT NULL
  - `is_active` — boolean; NOT NULL; default `true`
  - `usage_limit` — integer; NULL
  - `per_user_limit` — integer; NULL
  - `starts_at` — timestamp with time zone; NULL
  - `ends_at` — timestamp with time zone; NULL
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`

### `discount_tag_rules`
- Catalog row estimate: 1; RLS enabled: true
- Primary key: `id`
- Columns (3):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `discount_id` — uuid; NOT NULL
  - `tag_id` — uuid; NOT NULL

### `discount_services`
- Catalog row estimate: 0; RLS enabled: true
- Primary key: `discount_id`, `service_id`
- Columns (2):
  - `discount_id` — uuid; NOT NULL
  - `service_id` — uuid; NOT NULL

### `discount_usages`
- Catalog row estimate: 3; RLS enabled: true
- Primary key: `id`
- Columns (10):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `discount_id` — uuid; NOT NULL
  - `discount_code_id` — uuid; NULL
  - `user_id` — uuid; NULL
  - `order_id` — uuid; NULL
  - `service_id` — uuid; NULL
  - `original_amount` — bigint; NOT NULL
  - `discount_amount` — bigint; NOT NULL
  - `final_amount` — bigint; NOT NULL
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`

### `news_announcements`
- Catalog row estimate: 0; RLS enabled: true
- Primary key: `id`
- Columns (18):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `title` — text; NOT NULL
  - `slug` — text; NOT NULL
  - `excerpt` — text; NULL
  - `content` — text; NOT NULL; default `''::text`
  - `category` — text; NOT NULL; default `'general'::text`
  - `image_url` — text; NULL
  - `source_name` — text; NULL
  - `source_url` — text; NULL
  - `official_url` — text; NULL
  - `source_guid` — text; NULL
  - `status` — text; NOT NULL; default `'review'::text`; check `status = ANY (ARRAY['draft'::text, 'review'::text, 'published'::text, 'archived'::text])`
  - `is_active_registration` — boolean; NOT NULL; default `false`
  - `registration_start_at` — timestamp with time zone; NULL
  - `registration_end_at` — timestamp with time zone; NULL
  - `published_at` — timestamp with time zone; NULL
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `updated_at` — timestamp with time zone; NOT NULL; default `now()`

### `news_sources`
- Catalog row estimate: 0; RLS enabled: true
- Primary key: `id`
- Columns (11):
  - `id` — uuid; NOT NULL; default `gen_random_uuid()`
  - `name` — text; NOT NULL
  - `source_type` — text; NOT NULL; default `'website'::text`; check `source_type = ANY (ARRAY['rss'::text, 'website'::text, 'api'::text])`
  - `url` — text; NOT NULL
  - `category` — text; NOT NULL; default `'general'::text`
  - `is_active` — boolean; NOT NULL; default `true`
  - `check_interval_hours` — integer; NOT NULL; default `24`; check `check_interval_hours >= 1 AND check_interval_hours <= 168`
  - `last_checked_at` — timestamp with time zone; NULL
  - `last_error` — text; NULL
  - `created_at` — timestamp with time zone; NOT NULL; default `now()`
  - `updated_at` — timestamp with time zone; NOT NULL; default `now()`

## Foreign-key constraints

Constraints are deduplicated by constraint name; the connector reports schema-wide FK metadata alongside table records.

- `ai_profiles_user_id_fkey`: `public.ai_profiles` (user_id) → `auth.users` (id)
- `ai_sessions_ai_profile_id_fkey`: `public.ai_sessions` (ai_profile_id) → `public.ai_profiles` (id)
- `blog_comments_post_id_fkey`: `public.blog_comments` (post_id) → `public.blog_posts` (id)
- `blog_comments_user_id_fkey`: `public.blog_comments` (user_id) → `auth.users` (id)
- `blog_post_services_post_id_fkey`: `public.blog_post_services` (post_id) → `public.blog_posts` (id)
- `blog_post_services_service_id_fkey`: `public.blog_post_services` (service_id) → `public.services` (id)
- `blog_post_views_post_id_fkey`: `private.blog_post_views` (post_id) → `public.blog_posts` (id)
- `blog_posts_author_id_fkey`: `public.blog_posts` (author_id) → `auth.users` (id)
- `blog_posts_category_id_fkey`: `public.blog_posts` (category_id) → `public.blog_categories` (id)
- `blog_ratings_post_id_fkey`: `public.blog_ratings` (post_id) → `public.blog_posts` (id)
- `blog_ratings_user_id_fkey`: `public.blog_ratings` (user_id) → `auth.users` (id)
- `blog_reactions_post_id_fkey`: `public.blog_reactions` (post_id) → `public.blog_posts` (id)
- `blog_reactions_user_id_fkey`: `public.blog_reactions` (user_id) → `auth.users` (id)
- `custom_forms_active_version_id_fkey`: `public.custom_forms` (active_version_id) → `public.form_versions` (id)
- `custom_forms_created_by_fkey`: `public.custom_forms` (created_by) → `public.profiles` (id)
- `custom_forms_parent_form_id_fkey`: `public.custom_forms` (parent_form_id) → `public.custom_forms` (id)
- `custom_forms_service_id_fkey`: `public.custom_forms` (service_id) → `public.services` (id)
- `discount_codes_discount_id_fkey`: `public.discount_codes` (discount_id) → `public.discounts` (id)
- `discount_services_discount_id_fkey`: `public.discount_services` (discount_id) → `public.discounts` (id)
- `discount_services_service_id_fkey`: `public.discount_services` (service_id) → `public.services` (id)
- `discount_tag_rules_discount_id_fkey`: `public.discount_tag_rules` (discount_id) → `public.discounts` (id)
- `discount_tag_rules_tag_id_fkey`: `public.discount_tag_rules` (tag_id) → `public.member_tags` (id)
- `discount_usages_discount_code_id_fkey`: `public.discount_usages` (discount_code_id) → `public.discount_codes` (id)
- `discount_usages_discount_id_fkey`: `public.discount_usages` (discount_id) → `public.discounts` (id)
- `discount_usages_order_id_fkey`: `public.discount_usages` (order_id) → `public.orders` (id)
- `discount_usages_service_id_fkey`: `public.discount_usages` (service_id) → `public.services` (id)
- `discount_usages_user_id_fkey`: `public.discount_usages` (user_id) → `public.profiles` (id)
- `form_versions_created_by_fkey`: `public.form_versions` (created_by) → `auth.users` (id)
- `form_versions_form_id_fkey`: `public.form_versions` (form_id) → `public.custom_forms` (id)
- `goals_created_by_fkey`: `public.goals` (created_by) → `auth.users` (id)
- `member_tag_assignments_referral_link_fk`: `public.member_tag_assignments` (referral_link_id) → `public.tag_referral_links` (id)
- `member_tag_assignments_tag_id_fkey`: `public.member_tag_assignments` (tag_id) → `public.member_tags` (id)
- `member_tag_assignments_user_id_fkey`: `public.member_tag_assignments` (user_id) → `public.profiles` (id)
- `messages_order_id_fkey`: `public.messages` (order_id) → `public.orders` (id)
- `messages_sender_id_fkey`: `public.messages` (sender_id) → `public.profiles` (id)
- `notifications_order_id_fkey`: `public.notifications` (order_id) → `public.orders` (id)
- `notifications_recipient_id_fkey`: `public.notifications` (recipient_id) → `public.profiles` (id)
- `order_cancellation_requests_order_id_fkey`: `public.order_cancellation_requests` (order_id) → `public.orders` (id)
- `order_cancellation_requests_reviewed_by_fkey`: `public.order_cancellation_requests` (reviewed_by) → `public.profiles` (id)
- `order_cancellation_requests_user_id_fkey`: `public.order_cancellation_requests` (user_id) → `auth.users` (id)
- `order_commission_ledger_order_id_fkey`: `public.order_commission_ledger` (order_id) → `public.orders` (id)
- `order_commission_ledger_staff_user_id_fkey`: `public.order_commission_ledger` (staff_user_id) → `public.profiles` (id)
- `order_files_order_id_fkey`: `public.order_files` (order_id) → `public.orders` (id)
- `order_files_uploaded_by_fkey`: `public.order_files` (uploaded_by) → `auth.users` (id)
- `order_history_order_id_fkey`: `public.order_history` (order_id) → `public.orders` (id)
- `order_refunds_order_id_fkey`: `public.order_refunds` (order_id) → `public.orders` (id)
- `order_refunds_processed_by_fkey`: `public.order_refunds` (processed_by) → `public.profiles` (id)
- `order_refunds_requested_by_fkey`: `public.order_refunds` (requested_by) → `public.profiles` (id)
- `order_refunds_user_id_fkey`: `public.order_refunds` (user_id) → `auth.users` (id)
- `order_staff_requests_approved_by_fkey`: `public.order_staff_requests` (approved_by) → `public.profiles` (id)
- `order_staff_requests_order_id_fkey`: `public.order_staff_requests` (order_id) → `public.orders` (id)
- `order_staff_requests_requested_by_fkey`: `public.order_staff_requests` (requested_by) → `public.profiles` (id)
- `order_staff_requests_staff_user_id_fkey`: `public.order_staff_requests` (staff_user_id) → `public.profiles` (id)
- `orders_assigned_staff_id_fkey`: `public.orders` (assigned_staff_id) → `public.profiles` (id)
- `orders_discount_code_id_fkey`: `public.orders` (discount_code_id) → `public.discount_codes` (id)
- `orders_discount_id_fkey`: `public.orders` (discount_id) → `public.discounts` (id)
- `orders_form_id_fkey`: `public.orders` (form_id) → `public.custom_forms` (id)
- `orders_form_version_id_fkey`: `public.orders` (form_version_id) → `public.form_versions` (id)
- `orders_service_id_fkey`: `public.orders` (service_id) → `public.services` (id)
- `orders_user_id_fkey`: `public.orders` (user_id) → `public.profiles` (id)
- `payments_order_id_fkey`: `public.payments` (order_id) → `public.orders` (id)
- `payments_user_id_fkey`: `public.payments` (user_id) → `auth.users` (id)
- `payout_requests_bank_account_id_fkey`: `public.payout_requests` (bank_account_id) → `public.staff_bank_accounts` (id)
- `payout_requests_processed_by_fkey`: `public.payout_requests` (processed_by) → `public.profiles` (id)
- `payout_requests_staff_user_id_fkey`: `public.payout_requests` (staff_user_id) → `public.profiles` (id)
- `profiles_id_fkey`: `public.profiles` (id) → `auth.users` (id)
- `service_announcements_service_id_fkey`: `public.services_announcements` (service_id) → `public.services` (id)
- `services_parent_form_id_fkey`: `public.services` (parent_form_id) → `public.custom_forms` (id)
- `services_parent_service_id_fkey`: `public.services` (parent_service_id) → `public.services` (id)
- `social_categories_platform_id_fkey`: `public.social_categories` (platform_id) → `public.social_platforms` (id)
- `social_orders_admin_approved_by_fkey`: `public.social_orders` (admin_approved_by) → `auth.users` (id)
- `social_orders_service_id_fkey`: `public.social_orders` (service_id) → `public.social_services` (id)
- `social_orders_user_id_fkey`: `public.social_orders` (user_id) → `auth.users` (id)
- `social_services_category_id_fkey`: `public.social_services` (category_id) → `public.social_categories` (id)
- `social_services_platform_id_fkey`: `public.social_services` (platform_id) → `public.social_platforms` (id)
- `staff_bank_accounts_user_id_fkey`: `public.staff_bank_accounts` (user_id) → `public.profiles` (id)
- `staff_bank_accounts_verified_by_fkey`: `public.staff_bank_accounts` (verified_by) → `public.profiles` (id)
- `staff_category_access_approved_by_fkey`: `public.staff_category_access` (approved_by) → `public.profiles` (id)
- `staff_category_access_user_id_fkey`: `public.staff_category_access` (user_id) → `public.profiles` (id)
- `staff_earnings_order_id_fkey`: `public.staff_earnings` (order_id) → `public.orders` (id)
- `staff_earnings_staff_id_fkey`: `public.staff_earnings` (staff_id) → `public.profiles` (id)
- `staff_financial_adjustments_created_by_fkey`: `public.staff_financial_adjustments` (created_by) → `public.profiles` (id)
- `staff_financial_adjustments_order_id_fkey`: `public.staff_financial_adjustments` (order_id) → `public.orders` (id)
- `staff_financial_adjustments_staff_id_fkey`: `public.staff_financial_adjustments` (staff_id) → `public.profiles` (id)
- `staff_reviews_customer_id_fkey`: `public.staff_reviews` (customer_id) → `public.profiles` (id)
- `staff_reviews_order_id_fkey`: `public.staff_reviews` (order_id) → `public.orders` (id)
- `staff_reviews_staff_id_fkey`: `public.staff_reviews` (staff_id) → `public.profiles` (id)
- `staff_role_assignments_approved_by_fkey`: `public.staff_role_assignments` (approved_by) → `public.profiles` (id)
- `staff_role_assignments_role_id_fkey`: `public.staff_role_assignments` (role_id) → `public.staff_roles` (id)
- `staff_role_assignments_user_id_fkey`: `public.staff_role_assignments` (user_id) → `public.profiles` (id)
- `staff_service_access_approved_by_fkey`: `public.staff_service_access` (approved_by) → `public.profiles` (id)
- `staff_service_access_service_id_fkey`: `public.staff_service_access` (service_id) → `public.services` (id)
- `staff_service_access_user_id_fkey`: `public.staff_service_access` (user_id) → `public.profiles` (id)
- `staff_settlements_bank_account_id_fkey`: `public.staff_settlements` (bank_account_id) → `public.staff_bank_accounts` (id)
- `staff_settlements_processed_by_fkey`: `public.staff_settlements` (processed_by) → `public.profiles` (id)
- `staff_settlements_staff_id_fkey`: `public.staff_settlements` (staff_id) → `public.profiles` (id)
- `sub_goals_goal_id_fkey`: `public.sub_goals` (goal_id) → `public.goals` (id)
- `support_conversation_participants_conversation_id_fkey`: `public.support_conversation_participants` (conversation_id) → `public.support_conversations` (id)
- `support_conversation_participants_user_id_fkey`: `public.support_conversation_participants` (user_id) → `public.profiles` (id)
- `support_conversations_assigned_staff_id_fkey`: `public.support_conversations` (assigned_staff_id) → `public.profiles` (id)
- `support_conversations_order_id_fkey`: `public.support_conversations` (order_id) → `public.orders` (id)
- `support_conversations_user_id_fkey`: `public.support_conversations` (user_id) → `public.profiles` (id)
- `support_messages_conversation_id_fkey`: `public.support_messages` (conversation_id) → `public.support_conversations` (id)
- `support_messages_sender_id_fkey`: `public.support_messages` (sender_id) → `public.profiles` (id)
- `support_reviews_conversation_id_fkey`: `public.support_reviews` (conversation_id) → `public.support_conversations` (id)
- `support_reviews_customer_id_fkey`: `public.support_reviews` (customer_id) → `public.profiles` (id)
- `support_reviews_staff_id_fkey`: `public.support_reviews` (staff_id) → `public.profiles` (id)
- `tag_referral_links_tag_id_fkey`: `public.tag_referral_links` (tag_id) → `public.member_tags` (id)

## Remaining catalog work

- This listing does not fully inventory all indexes, unique/exclusion constraints, policy predicates, trigger bodies, routine source/grants, or view SQL. Extract these from `pg_constraint`, `pg_indexes`, `pg_policies`, `pg_proc`, `information_schema.triggers`, and `pg_views` in separate read-only queries.
- `profiles.id` references `auth.users.id`, so authentication cannot be replaced by copying `profiles` alone.
- The known public view is `social_services_public`; inspect its exact definition and security behavior.
- Storage is outside `public`: the earlier inventory found `blog-images`, `order-files`, and `payment-receipts`. Keep private buckets private and test authorization after migration.
