import { db, isDatabaseConfigured } from "@/lib/db";

export async function deleteAllPostsByUser(userId: number) {
  if (!isDatabaseConfigured()) return;
  if (!Number.isFinite(userId) || userId <= 0) return;
  await db.execute("DELETE FROM Posts WHERE user=?", [userId]);
}
