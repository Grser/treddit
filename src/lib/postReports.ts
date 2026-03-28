import { db, isDatabaseConfigured } from "@/lib/db";

let ensuredReportsSchema = false;

export async function ensurePostReportsSchema() {
  if (ensuredReportsSchema || !isDatabaseConfigured()) return;

  await db.execute(`
    CREATE TABLE IF NOT EXISTS Post_Reports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      post_id INT NOT NULL,
      reporter_id INT NOT NULL,
      reason VARCHAR(280) NULL,
      status ENUM('pending','reviewed') NOT NULL DEFAULT 'pending',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_post_report (post_id, reporter_id),
      INDEX idx_post_reports_post (post_id),
      INDEX idx_post_reports_status (status, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  ensuredReportsSchema = true;
}
