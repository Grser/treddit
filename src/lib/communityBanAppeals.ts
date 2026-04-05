import { db, isDatabaseConfigured } from "@/lib/db";

let ensuredBanAppealsSchema = false;

export async function ensureCommunityBanAppealsSchema() {
  if (ensuredBanAppealsSchema || !isDatabaseConfigured()) return;

  await db.execute(`
    CREATE TABLE IF NOT EXISTS Community_Ban_Appeals (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      community_id BIGINT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      message VARCHAR(500) NOT NULL,
      status ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_community_ban_appeal_pending (community_id, user_id, status),
      KEY idx_community_ban_appeals_lookup (community_id, user_id),
      KEY idx_community_ban_appeals_status (status, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  ensuredBanAppealsSchema = true;
}
