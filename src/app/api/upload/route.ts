export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import fs from "fs";
import path from "path";

function buildPublicUploadUrl(req: Request, filename: string) {
  const fallbackBase = "https://treddit.clawn.cat";
  try {
    const origin = new URL(req.url).origin;
    return `${origin}/uploads/${filename}`;
  } catch {
    return `${fallbackBase}/uploads/${filename}`;
  }
}

function splitFilenameParts(filename: string) {
  const ext = path.extname(filename);
  const name = ext ? filename.slice(0, -ext.length) : filename;
  return { name, ext };
}

function generateUniqueFilename(uploadsDir: string, originalName: string) {
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_") || "archivo";
  const { name, ext } = splitFilenameParts(safeName);
  let candidate = safeName;
  let index = 1;

  while (fs.existsSync(path.join(uploadsDir, candidate))) {
    candidate = `${name}-${index}${ext}`;
    index += 1;
  }

  return candidate;
}

export async function POST(req: Request) {
  // exige sesión para subir
  const user = await requireUser();

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "form-data inválido" }, { status: 400 });

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "archivo requerido" }, { status: 400 });

  // validación mínima
  if (file.size > 1024 * 1024 * 1024) {
    return NextResponse.json({ error: "archivo demasiado grande (1GB máximo)" }, { status: 413 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const filename = generateUniqueFilename(uploadsDir, `${Date.now()}-${file.name}`);
  const filepath = path.join(uploadsDir, filename);

  fs.writeFileSync(filepath, buffer);

  const url = buildPublicUploadUrl(req, filename);

  return NextResponse.json({ ok: true, url, owner: user.id });
}
