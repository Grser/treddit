import type { RowDataPacket } from "mysql2";

import jwt, { type SignOptions } from "jsonwebtoken";
import { cookies } from "next/headers";
import { db } from "./db";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES: SignOptions["expiresIn"] = (process.env.JWT_EXPIRES as SignOptions["expiresIn"]) || "7d";

export type SessionUser = {
  id: number;
  username: string;
  email: string;
  avatar_url?: string | null;
  is_admin?: boolean;
  is_verified?: boolean;
};

export function signSession(payload: SessionUser) {
  const normalized: SessionUser = {
    id: payload.id,
    username: payload.username,
    email: payload.email,
    avatar_url: payload.avatar_url ?? null,
    is_admin: Boolean(payload.is_admin),
    is_verified: Boolean(payload.is_verified),
  };
  return jwt.sign(normalized, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("treddit_token")?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SessionUser;
    return {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      avatar_url: decoded.avatar_url ?? null,
      is_admin: Boolean(decoded.is_admin),
      is_verified: Boolean(decoded.is_verified),
    };
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
type AuthUserRow = RowDataPacket & {
  id: number;
  username: string;
  email: string;
  password?: string;
  is_admin?: number;
};

type AdminRow = RowDataPacket & { is_admin: number };

export async function findUserByEmail(email: string) {
  const [rows] = await db.execute<AuthUserRow[]>(
    "SELECT id, username, email, password FROM Users WHERE email=? AND visible=1",
    [email],
  );
  return rows[0] || null;
}

export async function findUserById(id: number) {
  const [rows] = await db.execute<AuthUserRow[]>(
    "SELECT id, username, email FROM Users WHERE id=? AND visible=1",
    [id],
  );
  return rows[0] || null;
}

export async function requireAdmin() {
  const me = await requireUser();
  const [rows] = await db.query<AdminRow[]>("SELECT is_admin FROM Users WHERE id=? LIMIT 1", [me.id]);
  if (!rows[0]?.is_admin) {
    throw new Error("FORBIDDEN");
  }
  return me;
}
