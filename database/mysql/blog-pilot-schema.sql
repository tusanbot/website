-- Tosan blog MySQL pilot schema
-- Safe to run against an EMPTY MySQL database. Does not touch Supabase.
-- UUIDs are stored as CHAR(36); PostgreSQL text[] seo_keywords becomes JSON.
-- Keep these tables separate from production reads until data is imported and verified.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS blog_categories (
  id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_blog_categories_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blog_posts (
  id CHAR(36) NOT NULL,
  title TEXT NOT NULL,
  slug VARCHAR(512) NOT NULL,
  excerpt TEXT NULL,
  content LONGTEXT NOT NULL,
  featured_image TEXT NULL,
  category_id CHAR(36) NULL,
  meta_title TEXT NULL,
  meta_description TEXT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'draft',
  published_at DATETIME(3) NULL,
  author_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  primary_keyword TEXT NULL,
  seo_keywords JSON NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_blog_posts_slug (slug(191)),
  KEY idx_blog_posts_status_published (status, published_at),
  KEY idx_blog_posts_category (category_id),
  CONSTRAINT fk_blog_posts_category FOREIGN KEY (category_id)
    REFERENCES blog_categories (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blog_post_services (
  post_id CHAR(36) NOT NULL,
  service_id CHAR(36) NOT NULL,
  PRIMARY KEY (post_id, service_id),
  KEY idx_blog_post_services_service (service_id),
  CONSTRAINT fk_blog_post_services_post FOREIGN KEY (post_id)
    REFERENCES blog_posts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Read-only copies for rendering engagement summaries on the pilot page.
-- User IDs are retained as UUID strings; auth itself remains in Supabase.
CREATE TABLE IF NOT EXISTS blog_reactions (
  id CHAR(36) NOT NULL,
  post_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  reaction VARCHAR(32) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_blog_reactions_post (post_id),
  CONSTRAINT fk_blog_reactions_post FOREIGN KEY (post_id)
    REFERENCES blog_posts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blog_ratings (
  id CHAR(36) NOT NULL,
  post_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  rating SMALLINT NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_blog_ratings_post (post_id),
  CONSTRAINT fk_blog_ratings_post FOREIGN KEY (post_id)
    REFERENCES blog_posts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blog_comments (
  id CHAR(36) NOT NULL,
  post_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  author_name VARCHAR(255) NULL,
  PRIMARY KEY (id),
  KEY idx_blog_comments_post_status (post_id, status),
  CONSTRAINT fk_blog_comments_post FOREIGN KEY (post_id)
    REFERENCES blog_posts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
