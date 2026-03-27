import type { RowDataPacket } from "mysql2";

import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCommunityAccessControl } from "@/lib/communityPermissions";

type Params = { params: Promise<{ id: string }> };

type CommunityRow = RowDataPacket & {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon_url?: string | null;
  banner_url?: string | null;
};

async function hasColumn(column: "icon_url" | "banner_url") {
  const [rows] = await db.query<RowDataPacket[]>("SHOW COLUMNS FROM Communities LIKE ?", [column]);
  return rows.length > 0;
}

function normalizeOptionalUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, 500);
  return trimmed.length > 0 ? trimmed : null;
}

async function ensureManagerAccess(communityId: number, userId: number) {
  const access = await getCommunityAccessControl(communityId, userId);
  return access.isMember && access.permissions.can_edit_community;
}

async function tryAddMediaColumn(column: "icon_url" | "banner_url") {
  try {
    await db.execute(`ALTER TABLE Communities ADD COLUMN ${column} VARCHAR(500) NULL`);
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error
      ? String((error as { code?: unknown }).code || "")
      : "";
    if (code !== "ER_DUP_FIELDNAME") {
      console.warn(`No se pudo crear Communities.${column}`, error);
    }
  }
}

export async function GET(_: Request, { params }: Params) {
  const me = await requireUser();
  const { id } = await params;
  const communityId = Number(id);

  if (!Number.isInteger(communityId) || communityId <= 0) {
    return NextResponse.json({ error: "Comunidad inválida" }, { status: 400 });
  }

  const canManage = await ensureManagerAccess(communityId, me.id);
  if (!canManage && !me.is_admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const includeIcon = await hasColumn("icon_url");
  const includeBanner = await hasColumn("banner_url");

  const extraColumns = [
    includeIcon ? "c.icon_url" : "NULL as icon_url",
    includeBanner ? "c.banner_url" : "NULL as banner_url",
  ].join(", ");

  const [rows] = await db.query<CommunityRow[]>(
    `SELECT c.id, c.slug, c.name, c.description, ${extraColumns}
     FROM Communities c
     WHERE c.id = ?
     LIMIT 1`,
    [communityId],
  );

  const community = rows[0];
  if (!community) {
    return NextResponse.json({ error: "Comunidad no encontrada" }, { status: 404 });
  }

  return NextResponse.json({
    item: {
      id: Number(community.id),
      slug: String(community.slug),
      name: String(community.name),
      description: community.description ? String(community.description) : "",
      icon_url: community.icon_url ? String(community.icon_url) : "",
      banner_url: community.banner_url ? String(community.banner_url) : "",
    },
  });
}

export async function PATCH(req: Request, { params }: Params) {
  const me = await requireUser();
  const { id } = await params;
  const communityId = Number(id);

  if (!Number.isInteger(communityId) || communityId <= 0) {
    return NextResponse.json({ error: "Comunidad inválida" }, { status: 400 });
  }

  const canManage = await ensureManagerAccess(communityId, me.id);
  if (!canManage && !me.is_admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 80) : "";
  const description = typeof body?.description === "string" ? body.description.trim().slice(0, 280) : "";
  const iconUrl = normalizeOptionalUrl(body?.icon_url);
  const bannerUrl = normalizeOptionalUrl(body?.banner_url);

  if (!name || name.length < 3) {
    return NextResponse.json({ error: "El nombre debe tener al menos 3 caracteres." }, { status: 400 });
  }

  let includeIcon = await hasColumn("icon_url");
  let includeBanner = await hasColumn("banner_url");

  if (iconUrl !== null && !includeIcon) {
    await tryAddMediaColumn("icon_url");
    includeIcon = await hasColumn("icon_url");
  }

  if (bannerUrl !== null && !includeBanner) {
    await tryAddMediaColumn("banner_url");
    includeBanner = await hasColumn("banner_url");
  }

  const fields: string[] = ["name = ?", "description = ?"];
  const values: unknown[] = [name, description || null];

  if (includeIcon) {
    fields.push("icon_url = ?");
    values.push(iconUrl);
  }

  if (includeBanner) {
    fields.push("banner_url = ?");
    values.push(bannerUrl);
  }

  values.push(communityId);

  await db.execute(`UPDATE Communities SET ${fields.join(", ")} WHERE id = ? LIMIT 1`, values);

  return NextResponse.json({ ok: true });
}
