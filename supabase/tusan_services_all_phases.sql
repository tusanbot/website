-- Tusan Website - Master Service Seed Runner
--
-- IMPORTANT:
-- This file is a psql runner, not a Supabase SQL Editor script.
-- It executes the five phase seed files in the correct order.
--
-- Run from the repository root with a PostgreSQL client (psql):
--   psql "$DATABASE_URL" -f supabase/tusan_services_all_phases.sql
--
-- Do NOT execute the individual phase files separately when using this runner.
-- Phase 1 complete supersedes the original phase1 file.

\set ON_ERROR_STOP on

\echo '=== Tusan service seed: Phase 1 (complete) ==='
\ir tusan_services_phase1_complete.sql

\echo '=== Tusan service seed: Phase 2 ==='
\ir tusan_services_phase2.sql

\echo '=== Tusan service seed: Phase 3 ==='
\ir tusan_services_phase3.sql

\echo '=== Tusan service seed: Phase 4 ==='
\ir tusan_services_phase4.sql

\echo '=== Tusan service seed: Phase 5 ==='
\ir tusan_services_phase5.sql

\echo '=== Tusan service seed completed successfully ==='
