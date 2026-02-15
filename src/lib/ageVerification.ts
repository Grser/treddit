import type { RowDataPacket } from "mysql2";

import { db, isDatabaseConfigured } from "@/lib/db";

type UsersAgeColumns = {
  birthDate: boolean;
  ageVerified: boolean;
};

let cachedUsersColumns: UsersAgeColumns | undefined;
let ageRequestsTableReady: boolean | undefined;

async function hasUsersColumn(column: string) {
  const [rows] = await db.query<RowDataPacket[]>("SHOW COLUMNS FROM Users LIKE ?", [column]);
  return rows.length > 0;
}

function isDuplicateSchemaError(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }
  const code = String((error as { code?: unknown }).code || "");
  return code === "ER_DUP_FIELDNAME" || code === "ER_DUP_KEYNAME" || code === "ER_TABLE_EXISTS_ERROR";
}

export async function ensureUsersAgeColumns() {
  if (!isDatabaseConfigured()) {
    cachedUsersColumns = { birthDate: true, ageVerified: true };
    return cachedUsersColumns;
  }

  if (cachedUsersColumns) {
    return cachedUsersColumns;
  }

  let birthDate = await hasUsersColumn("birth_date").catch(() => false);
  if (!birthDate) {
    try {
      await db.execute("ALTER TABLE Users ADD COLUMN birth_date DATE NULL");
      birthDate = true;
    } catch (error) {
      if (!isDuplicateSchemaError(error)) {
        console.warn("No se pudo crear Users.birth_date", error);
      } else {
        birthDate = true;
      }
    }
  }

  let ageVerified = await hasUsersColumn("is_age_verified").catch(() => false);
  if (!ageVerified) {
    try {
      await db.execute("ALTER TABLE Users ADD COLUMN is_age_verified TINYINT(1) NOT NULL DEFAULT 0");
      ageVerified = true;
    } catch (error) {
      if (!isDuplicateSchemaError(error)) {
        console.warn("No se pudo crear Users.is_age_verified", error);
      } else {
        ageVerified = true;
      }
    }
  }

  cachedUsersColumns = { birthDate, ageVerified };
  return cachedUsersColumns;
}

export async function ensureAgeVerificationRequestsTable() {
  if (!isDatabaseConfigured()) {
    ageRequestsTableReady = true;
    return true;
  }

  if (ageRequestsTableReady !== undefined) {
    return ageRequestsTableReady;
  }

  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS Age_Verification_Requests (
        id INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id INT(10) UNSIGNED NOT NULL,
        birth_date DATE NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_age_request_user (user_id),
        KEY idx_age_requests_created_at (created_at),
        CONSTRAINT fk_age_requests_user FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    ageRequestsTableReady = true;
  } catch (error) {
    console.warn("No se pudo asegurar la tabla Age_Verification_Requests", error);
    ageRequestsTableReady = false;
  }

  return ageRequestsTableReady;
}
