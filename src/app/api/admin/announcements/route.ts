import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export async function POST(req: Request) {
  const admin = await requireAdmin();
  const form = await req.formData();
  const description = String(form.get("description") || "").trim().slice(0, 500);
  const hashtagsRaw = String(form.get("hashtags") || "").trim();

  if (!description) {
    return NextResponse.json({ error: "El mensaje es obligatorio" }, { status: 400 });
  }

  const normalizedTags = new Set<string>();
  hashtagsRaw
    .split(/\s+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .forEach((tag) => {
      const normalized = tag.startsWith("#") ? tag : `#${tag}`;
      normalizedTags.add(normalized);
    });

  if (normalizedTags.size === 0) {
    normalizedTags.add("#ad");
  }

  const payload = `${description}\n\n${Array.from(normalizedTags).join(" ")}`.slice(0, 600);

  await db.execute("INSERT INTO Posts (user, description, created_at) VALUES (?, ?, NOW())", [admin.id, payload]);

  const redirectUrl = new URL("/admin/anuncios?created=1", BASE_URL);
  return NextResponse.redirect(redirectUrl);
}
