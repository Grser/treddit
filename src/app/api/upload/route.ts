export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, getUploadSizeErrorMessage } from "@/lib/upload";
import { analyzeSensitiveMediaInput } from "@/lib/sensitiveMedia";
import fs from "fs";
import path from "path";

function buildPublicUploadUrl(req: Request, filename: string) {
  const requestUrl = (() => {
    try {
      return new URL(req.url);
    } catch {
      return null;
    }
  })();

  const requestPathBase = requestUrl ? `${requestUrl.origin}` : "";

  const requestProtocol = (() => {
    try {
      const protocol = new URL(req.url).protocol.replace(":", "");
      return protocol || null;
    } catch {
      return null;
    }
  })();

  const forwardedHost = req.headers.get("x-forwarded-host")?.trim();
  if (forwardedHost) {
    const host = forwardedHost.split(",")[0]?.trim();
    if (host) {
      const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
      const hasLocalHost = host.includes("localhost") || host.startsWith("127.");
      const fallbackProto = hasLocalHost ? "http" : "https";
      const proto = forwardedProto || (requestProtocol === "https" ? "https" : fallbackProto);
      return `${proto}://${host}/uploads/${filename}`;
    }
  }

  const host = req.headers.get("host")?.trim();
  if (host) {
    const hasLocalHost = host.includes("localhost") || host.startsWith("127.");
    const proto = requestProtocol === "https" ? "https" : hasLocalHost ? "http" : "https";
    return `${proto}://${host}/uploads/${filename}`;
  }

  if (requestPathBase) return `${requestPathBase}/uploads/${filename}`;

  return `/uploads/${filename}`;
}

function resolveUploadDirs() {
  const dirs = new Set<string>();
  const cwd = process.cwd();
  dirs.add(path.resolve(cwd, "public", "uploads"));
  dirs.add(path.resolve(cwd, "..", "public", "uploads"));
  dirs.add(path.resolve(cwd, "..", "..", "public", "uploads"));
  return [...dirs];
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
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: getUploadSizeErrorMessage() }, { status: 413 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const uploadDirs = resolveUploadDirs();
  const uploadsDir = uploadDirs[0];
  for (const dir of uploadDirs) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  const filename = generateUniqueFilename(uploadsDir, `${Date.now()}-${file.name}`);
  for (const dir of uploadDirs) {
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, buffer);
  }

  const url = buildPublicUploadUrl(req, filename);
  const analysis = analyzeSensitiveMediaInput({ filename: file.name, mimeType: file.type });

  return NextResponse.json({ ok: true, url, owner: user.id, sensitive: analysis });
}
