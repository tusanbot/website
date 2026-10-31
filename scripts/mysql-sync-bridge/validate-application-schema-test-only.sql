-- READ-ONLY schema and relationship audit for the first MySQL repository pilots.
-- Run ONLY after selecting tusancni_test in phpMyAdmin. Do not run on tusancni_main.
-- The first result must report selected_database = tusancni_test; otherwise STOP.

SELECT DATABASE() AS selected_database, VERSION() AS mariadb_version;

-- Required columns used by the provider-selectable blog and announcement repositories.
SELECT expected.table_name, expected.column_name
FROM (
  SELECT 'blog_posts' table_name, 'id' column_name UNION ALL
  SELECT 'blog_posts','slug' UNION ALL
  SELECT 'blog_posts','category_id' UNION ALL
  SELECT 'blog_posts','created_at' UNION ALL
  SELECT 'blog_categories','id' UNION ALL
  SELECT 'blog_categories','name' UNION ALL
  SELECT 'blog_categories','slug' UNION ALL
  SELECT 'blog_post_services','post_id' UNION ALL
  SELECT 'blog_post_services','service_id' UNION ALL
  SELECT 'blog_comments','id' UNION ALL
  SELECT 'blog_comments','post_id' UNION ALL
  SELECT 'blog_comments','user_id' UNION ALL
  SELECT 'blog_comments','content' UNION ALL
  SELECT 'blog_comments','status' UNION ALL
  SELECT 'blog_comments','created_at' UNION ALL
  SELECT 'blog_comments','updated_at' UNION ALL
  SELECT 'blog_comments','author_name' UNION ALL
  SELECT 'services','id' UNION ALL
  SELECT 'services','title' UNION ALL
  SELECT 'services','slug' UNION ALL
  SELECT 'services','is_active' UNION ALL
  SELECT 'services_announcements','id' UNION ALL
  SELECT 'services_announcements','title' UNION ALL
  SELECT 'services_announcements','type' UNION ALL
  SELECT 'services_announcements','summary' UNION ALL
  SELECT 'services_announcements','content' UNION ALL
  SELECT 'services_announcements','start_at' UNION ALL
  SELECT 'services_announcements','end_at' UNION ALL
  SELECT 'services_announcements','extended_end_at' UNION ALL
  SELECT 'services_announcements','button_label' UNION ALL
  SELECT 'services_announcements','service_id' UNION ALL
  SELECT 'services_announcements','priority' UNION ALL
  SELECT 'services_announcements','created_at' UNION ALL
  SELECT 'services_announcements','documents' UNION ALL
  SELECT 'services_announcements','is_extendable' UNION ALL
  SELECT 'services_announcements','is_active' UNION ALL
  SELECT 'services_announcements','updated_at'
) AS expected
LEFT JOIN information_schema.COLUMNS actual
  ON actual.TABLE_SCHEMA = DATABASE()
 AND actual.TABLE_NAME = expected.table_name
 AND actual.COLUMN_NAME = expected.column_name
WHERE actual.COLUMN_NAME IS NULL
ORDER BY expected.table_name, expected.column_name;

-- Orphaned references that would break the admin joins.
SELECT 'blog_posts.category_id without category' AS check_name, COUNT(*) AS issue_count
FROM blog_posts p
LEFT JOIN blog_categories c ON c.id = p.category_id
WHERE p.category_id IS NOT NULL AND c.id IS NULL
UNION ALL
SELECT 'blog_post_services without post', COUNT(*)
FROM blog_post_services x
LEFT JOIN blog_posts p ON p.id = x.post_id
WHERE p.id IS NULL
UNION ALL
SELECT 'blog_post_services without service', COUNT(*)
FROM blog_post_services x
LEFT JOIN services s ON s.id = x.service_id
WHERE s.id IS NULL
UNION ALL
SELECT 'services_announcements without service', COUNT(*)
FROM services_announcements a
LEFT JOIN services s ON s.id = a.service_id
WHERE a.service_id IS NOT NULL AND s.id IS NULL;

-- Unique constraints expected by application-level duplicate handling.
SELECT TABLE_NAME, INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS indexed_columns, NON_UNIQUE
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('blog_posts','blog_categories','blog_post_services')
GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE
ORDER BY TABLE_NAME, INDEX_NAME;

-- Type details for date and JSON-like fields. Review before enabling MySQL writes.
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND (
    (TABLE_NAME = 'blog_posts' AND COLUMN_NAME IN ('seo_keywords','published_at','created_at','updated_at'))
    OR (TABLE_NAME = 'services_announcements' AND COLUMN_NAME IN ('documents','start_at','end_at','extended_end_at','created_at','updated_at'))
    OR (TABLE_NAME = 'services' AND COLUMN_NAME IN ('price','form_schema'))
  )
ORDER BY TABLE_NAME, ORDINAL_POSITION;
