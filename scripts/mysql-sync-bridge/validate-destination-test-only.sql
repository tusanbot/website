-- READ-ONLY destination validation. Run ONLY after selecting tusancni_test in phpMyAdmin.
-- Do not run against tusancni_main. This file contains SELECT statements only.
-- First result set must report selected_database = tusancni_test. Stop if it does not.

SELECT DATABASE() AS selected_database,
       VERSION() AS mariadb_version;

-- 1) Blog slug constraints: Supabase requires unique, non-null slugs and the
-- application validator caps slugs at 191 characters.
SELECT 'blog_posts duplicate non-null slugs' AS check_name, COUNT(*) AS issue_count
FROM (
  SELECT slug FROM blog_posts
  WHERE slug IS NOT NULL
  GROUP BY slug HAVING COUNT(*) > 1
) duplicates
UNION ALL
SELECT 'blog_posts null slugs', COUNT(*) FROM blog_posts WHERE slug IS NULL
UNION ALL
SELECT 'blog_posts slugs longer than 191 chars', COUNT(*)
FROM blog_posts WHERE CHAR_LENGTH(slug) > 191
UNION ALL
SELECT 'blog_categories duplicate non-null slugs', COUNT(*)
FROM (
  SELECT slug FROM blog_categories
  WHERE slug IS NOT NULL
  GROUP BY slug HAVING COUNT(*) > 1
) duplicates
UNION ALL
SELECT 'blog_categories null slugs', COUNT(*) FROM blog_categories WHERE slug IS NULL
UNION ALL
SELECT 'blog_categories slugs longer than 191 chars', COUNT(*)
FROM blog_categories WHERE CHAR_LENGTH(slug) > 191;

-- 2) Inspect current destination column definitions for fields with known
-- source/destination type differences, and ensure no expected column is missing.
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND (
    (TABLE_NAME = 'blog_posts' AND COLUMN_NAME IN
      ('id','slug','seo_keywords','created_at','updated_at','published_at'))
    OR
    (TABLE_NAME = 'services_announcements' AND COLUMN_NAME IN
      ('id','documents','start_at','end_at','extended_end_at','is_active','is_extendable'))
  )
ORDER BY TABLE_NAME, ORDINAL_POSITION;

-- 3) Verify duplicate keys that should be unique in the source schema.
SELECT 'blog_ratings duplicate (post_id,user_id)' AS check_name, COUNT(*) AS issue_count
FROM (
  SELECT post_id, user_id FROM blog_ratings
  GROUP BY post_id, user_id HAVING COUNT(*) > 1
) duplicates
UNION ALL
SELECT 'blog_reactions duplicate (post_id,user_id)', COUNT(*)
FROM (
  SELECT post_id, user_id FROM blog_reactions
  GROUP BY post_id, user_id HAVING COUNT(*) > 1
) duplicates
UNION ALL
SELECT 'blog_post_services duplicate (post_id,service_id)', COUNT(*)
FROM (
  SELECT post_id, service_id FROM blog_post_services
  GROUP BY post_id, service_id HAVING COUNT(*) > 1
) duplicates;

-- 4) Row counts for reconciliation; compare these with the corresponding
-- Supabase counts before any write test. Counts are not proof of row equality.
SELECT 'blog_categories' AS table_name, COUNT(*) AS row_count FROM blog_categories
UNION ALL SELECT 'blog_posts', COUNT(*) FROM blog_posts
UNION ALL SELECT 'blog_post_services', COUNT(*) FROM blog_post_services
UNION ALL SELECT 'blog_comments', COUNT(*) FROM blog_comments
UNION ALL SELECT 'blog_reactions', COUNT(*) FROM blog_reactions
UNION ALL SELECT 'blog_ratings', COUNT(*) FROM blog_ratings
UNION ALL SELECT 'services_announcements', COUNT(*) FROM services_announcements;
