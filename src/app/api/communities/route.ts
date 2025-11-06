export const runtime = "nodejs";

import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

type CommunityRequestBody = {
  name?: unknown;
  slug?: unknown;
  description?: unknown;
};

function normalizeSlug(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

export async function POST(req: Request) {
  const me = await requireUser();
  const body = (await req.json().catch(() => null)) as CommunityRequestBody | null;
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 80) : "";
  let slug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const description = typeof body?.description === "string"
    ? body.description.trim().slice(0, 280)
    : "";

  if (!name || name.length < 3) {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  }

  if (!slug) {
    slug = normalizeSlug(name);
  } else {
    slug = normalizeSlug(slug);
  }

  if (!slug || slug.length < 3 || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "El identificador debe tener al menos 3 caracteres y solo letras, números o guiones" }, { status: 400 });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query<RowDataPacket[]>("SELECT id FROM Communities WHERE slug=? LIMIT 1", [slug]);
    if (existing.length > 0) {
      await conn.rollback();
      return NextResponse.json({ error: "Ya existe una comunidad con ese identificador" }, { status: 409 });
    }

    const [insertResult] = await conn.execute<ResultSetHeader>(
      "INSERT INTO Communities (slug, name, description, created_at, visible) VALUES (?, ?, ?, NOW(), 1)",
      [slug, name, description || null],
    );

    const communityId = Number(insertResult.insertId);

    await conn.execute(
      "INSERT INTO Community_Members (community_id, user_id, role) VALUES (?, ?, 'owner') ON DUPLICATE KEY UPDATE role='owner'",
      [communityId, me.id],
    );

    await conn.commit();
    return NextResponse.json({ ok: true, slug });
  } catch (error) {
    await conn.rollback();
    console.error("community-create", error);
    return NextResponse.json({ error: "No se pudo crear la comunidad" }, { status: 500 });
  } finally {
    conn.release();
  }
}
