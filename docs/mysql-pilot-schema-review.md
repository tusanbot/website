# Pilot schema review findings

Reviewed against the proposed six-table blog pilot only. This is a source-code review, not a live database validation.

## Must fix before importing data

1. `blog_post_services.service_id` has no foreign-key constraint in the proposed MySQL DDL, while the source relationship is to `services(id)`. Decide whether the isolated target includes a compatible read-only `services` reference table or whether relationship integrity is verified externally; do not silently omit the relation.
2. `blog_posts.slug` is declared unique using a prefix index (`slug(191)`). This is not equivalent to a full unique constraint for longer slugs: distinct values with the same first 191 characters can collide. Validate actual slug length/distribution and choose a schema that enforces the intended uniqueness.
3. `CREATE TABLE IF NOT EXISTS` does not validate existing table definitions. Before copying, compare the actual target metadata with the expected schema and stop on any mismatch.
4. The current copy script's target-occupancy guard assumes all six tables already exist. It must fail clearly if a table is missing, and it must not treat a schema/query error as an empty table.
5. The script currently compares counts only. Before acceptance, add deterministic primary-key-set and normalized-row-hash comparison, plus orphan checks. Do not claim data parity from counts alone.
6. The GitHub Actions workflow shown in the pilot branch targets `migration/blog-mysql-pilot` and PRs into `main`, not the active deployment branch `cloudflare-migration`. It is not evidence that the active branch can install or build with the pilot dependencies.

## Safe boundary

No schema or copy script should run against production. Keep Supabase authoritative and Auth/Storage unchanged. No application route should query MySQL until a protected test surface, target schema validation, and parity gates are implemented and verified.
