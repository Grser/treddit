import { db, isDatabaseConfigured } from "@/lib/db";

let ensuredUserReportsSchema = false;

export async function ensureUserReportsSchema() {
  if (ensuredUserReportsSchema || !isDatabaseConfigured()) return;

  await db.execute(`
    CREATE TABLE IF NOT EXISTS User_Reports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      reported_user_id INT NOT NULL,
      reporter_id INT NOT NULL,
      reason VARCHAR(280) NULL,
      status ENUM('pending','reviewed') NOT NULL DEFAULT 'pending',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_user_report (reported_user_id, reporter_id),
      INDEX idx_user_reports_reported (reported_user_id),
      INDEX idx_user_reports_status (status, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  ensuredUserReportsSchema = true;
}
