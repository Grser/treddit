import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { db } from "./db";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";

export type SessionUser = {
  id: number;
  username: string;
  email: string;
};

export function signSession(payload: SessionUser) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("treddit_token")?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SessionUser;
    return decoded;
  } catch {
    return null;
  }
}

/** Verifica cookie y devuelve user o 401 lanzando Response */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  return user;
}

/** Helpers de consultas comunes */
export async function findUserByEmail(email: string) {
  const [rows] = await db.execute("SELECT id, username, email, password FROM Users WHERE email=? AND visible=1", [email]);
  return (rows as any[])[0] || null;
}

export async function findUserById(id: number) {
  const [rows] = await db.execute("SELECT id, username, email FROM Users WHERE id=? AND visible=1", [id]);
  return (rows as any[])[0] || null;
}

export async function requireAdmin() {
  const me = await requireUser();
  const [rows] = await db.query("SELECT is_admin FROM Users WHERE id=? LIMIT 1", [me.id]);
  if (!(rows as any[])[0]?.is_admin) {
    throw new Error("FORBIDDEN");
  }
  return me;
}
