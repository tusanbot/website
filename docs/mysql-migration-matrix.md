# Full-site Supabase → MySQL migration matrix

**Repository:** `tusanbot/website`  
**Branch:** `migration/blog-mysql-pilot`  
**Source:** Supabase project `yhbaedfifcxgjxutnyjc`  
**Status:** planning artifact; no production schema/data, live routing, or PR state changed.

## Migration rules

1. Keep Supabase authoritative until acceptance and explicit cutover approval.
2. Build/test only in the isolated cPanel app and a separate MySQL target. Never truncate an occupied target.
3. Preserve primary-key UUIDs, foreign-key semantics, timestamp meaning, JSON/array content, and Unicode (`utf8mb4`).
4. Replace RLS with explicit server-side authorization and test ownership/role boundaries before switching a feature.
5. Keep Auth and Storage in Supabase temporarily unless a separate, tested migration plan is approved. `profiles.id → auth.users.id` means profile rows alone do not reproduce login/session behavior.
6. For each table, obtain exact source/target counts, PK-set comparison, normalized hashes, FK orphan checks, and business acceptance tests. Catalog row estimates are not proof of counts.
7. No production write, destructive operation, live route switch, PR merge, or public test exposure without explicit approval.

## Feature migration matrix

| Workstream | Source tables / objects | Order | Required validation | Status |
|---|---|---|---|---|
| Existing blog pilot | `blog_categories`, `blog_posts`, `blog_post_services`, `blog_comments`, `blog_ratings`, `blog_reactions` | Existing pilot | Re-run exact counts, PK/hash and relationship checks before release; earlier 154-row match was reported | Pilot only |
| Service catalog and SEO | `services`, `services_announcements`, `site_settings` | Core schema first | Public listing, Persian slugs, hierarchy, pricing rules, metadata, announcement visibility | Not started |
| Forms and registrations | `custom_forms`, `form_versions`, `registrations`, `goals`, `sub_goals` | After services | Form version history, JSON schema, create/edit/submit, active dates, goal hierarchy | Not started |
| Accounts/settings/AI | `profiles`, `messages`, `notifications`, `ai_profiles`, `ai_sessions`, `api_rate_limits`, `traxtor_saved_projects` | Auth decision first | Login/logout, cookies, session expiry, profile ownership, recipient isolation, rate limits | Blocked on Auth strategy |
| Orders and files | `orders`, `order_files`, `order_history`, `order_cancellation_requests`, `order_refunds`, `order_staff_requests` | After users/services/forms | State transitions, tracking codes, ownership, staff/admin permissions, refund idempotency, private attachments | Not started |
| Payments | `payments` plus provider callback/transition routines | After orders | Callback verification, duplicate/replayed events, reconciliation, pending/success/failure states; never replay real production callbacks | High risk |
| Discounts/referrals | `discounts`, `discount_codes`, `discount_services`, `discount_tag_rules`, `discount_usages`, `member_tags`, `member_tag_assignments`, `tag_referral_links` | After profiles/services | Eligibility, limits, atomic usage, tag/referral attribution, failed-order rollback | Not started |
| Staff roles and finance | `staff_roles`, `staff_role_assignments`, `staff_service_access`, `staff_category_access`, `staff_bank_accounts`, `staff_earnings`, `staff_settlements`, `staff_financial_adjustments`, `staff_reviews`, `order_commission_ledger`, `payout_requests` | After profiles/orders | Least privilege, role escalation tests, approvals/audit, financial reconciliation, bank-data access, payout lifecycle | High risk |
| Support | `support_conversations`, `support_conversation_participants`, `support_messages`, `support_faqs`, `support_reviews` | After profiles/staff access | Conversation ownership, participant-only reads, assignment/claim/close, admin visibility, review integrity | Not started |
| Social catalog/orders | `social_categories`, `social_platforms`, `social_services`, `social_orders`, `social_sync_logs`, view `social_services_public` | Catalog before orders | View output/security, API sync logs, admin vs user order visibility | Not started |
| Other finance | `financial_transactions` | After identity/order rules | Ledger consistency, numeric precision, no duplicate postings, authorization | Not started |
| News | `news_announcements`, `news_sources` | Independent after core | Publication visibility, source attribution, admin CRUD | Not started |
| Storage | `blog-images`, `order-files`, `payment-receipts` | Separate workstream | Keep public blog images available; private files require authorized access; compare object counts/checksums | Not started |
| Database behavior | Constraints, indexes, policies, routines, triggers, view | Before each feature | Full definitions/grants/callers; translate business rules into tested server services/transactions, not blind syntax porting | Inventory incomplete |
| Authentication | Supabase Auth; FK `profiles.id → auth.users.id` | Explicit decision required | Password/session/refresh/reset/email/phone flows, ID continuity, admin claims, recovery/rollback | Decision required |

## Object inventory gates

| Object type | Known snapshot | Required action |
|---|---|---|
| Public tables | 60; all 60 reported RLS-enabled | Finish schema details; exact counts and all indexes/constraints |
| Public view | 1: `social_services_public` | Extract exact SQL and inspect security-invoker behavior |
| Routines | 89 reported earlier | Inventory args, return type, security mode, grants, definitions and callers; map RPCs to server services |
| Trigger event entries | 40 reported earlier | Record timing/event/function/body and execution order; test replacements |
| RLS | All 60 enabled; prior Security Advisor snapshot reported 6 tables with no policies | Extract each command, role, USING and WITH CHECK; test intended access, not just policy names |
| Supabase Auth | 15 users reported earlier | Do not put credential hashes or sensitive Auth records in GitHub; decide keep-vs-replace |
| Storage | 3 buckets / 157 objects reported earlier | Preserve private access controls; validate object metadata and authorized download paths |
| Supabase migrations | 267 recorded earlier | Use as history/context; do not replay blindly into MySQL |

## Execution checklist

- [x] Blog-only MySQL pilot and read-only `/mysql-test` route exist on the migration branch.
- [x] Supabase code-usage scan added; its counts are heuristic text matches, not exact executable-call counts.
- [ ] Finish catalog extraction: indexes, constraints, policy expressions, routine definitions/security/grants, trigger definitions, view SQL, Storage policies/config.
- [ ] Map all Supabase call sites by feature and client/server access; remove false positives from legacy files/logs.
- [ ] Inspect existing MySQL schema without dropping or overwriting anything.
- [ ] Create additive DDL for the isolated target; test idempotence and FK dependency order.
- [ ] Run exact-count/data-integrity validation across all tables.
- [ ] Protect test subdomain with access control and noindex before exposure.
- [ ] Verify dependency security and cPanel build/runtime constraints.
- [ ] Run feature-by-feature regression and authorization tests.
- [ ] Plan final delta sync/write freeze, backup, explicit approval, cutover and rollback.

## Immediate next step

Finish read-only extraction of constraints/indexes/policies, routine security/definitions, triggers, and view SQL. Compare target MySQL schema with the source inventory, then prepare additive DDL and repeatable transfer scripts. Do not switch routes or move all production data until Auth, Storage, and authorization decisions are settled.
