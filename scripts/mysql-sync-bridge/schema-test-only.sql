-- Run manually ONLY in the non-production validation database tusancni_test.
-- Do not run against tusancni_main. These tables hold synchronization metadata only.
CREATE TABLE IF NOT EXISTS data_sync_event_receipts (
  event_id CHAR(36) NOT NULL PRIMARY KEY,
  source_outbox_id BIGINT UNSIGNED NOT NULL,
  schema_name VARCHAR(64) NOT NULL,
  table_name VARCHAR(64) NOT NULL,
  record_key_hash CHAR(64) NOT NULL,
  operation ENUM('insert','update','delete') NOT NULL,
  applied_at DATETIME(3) NOT NULL,
  KEY idx_sync_receipts_record (record_key_hash, source_outbox_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS data_sync_record_versions (
  record_key_hash CHAR(64) NOT NULL PRIMARY KEY,
  schema_name VARCHAR(64) NOT NULL,
  table_name VARCHAR(64) NOT NULL,
  record_key_json JSON NOT NULL,
  source_outbox_id BIGINT UNSIGNED NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  KEY idx_sync_versions_table (schema_name, table_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
