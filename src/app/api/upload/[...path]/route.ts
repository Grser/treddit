export const runtime = "nodejs";

import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

function resolveUploadDirs() {
  const dirs = new Set<string>();
  const cwd = process.cwd();
  const customUploadDir = process.env.TREDDIT_UPLOAD_DIR?.trim();
  if (customUploadDir) {
    dirs.add(path.resolve(customUploadDir));
  }
  dirs.add(path.resolve(cwd, "public", "uploads"));
  dirs.add(path.resolve(cwd, "..", "public", "uploads"));
  dirs.add(path.resolve(cwd, "..", "..", "public", "uploads"));
  return [...dirs];
}

function isSafePathSegment(segment: string) {
  return /^[a-zA-Z0-9._-]+$/.test(segment);
}

function getContentType(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".gif") return "image/gif";
  if (ext === ".webp") return "image/webp";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".webm") return "video/webm";
  if (ext === ".ogg") return "video/ogg";
  if (ext === ".mov") return "video/quicktime";
  return "application/octet-stream";
}

export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const rawPathSegments = (await params).path || [];
  const pathSegments = rawPathSegments.map((segment) => decodeURIComponent(segment || "").trim()).filter(Boolean);

  if (pathSegments.length === 0 || pathSegments.some((segment) => !isSafePathSegment(segment))) {
    return NextResponse.json({ error: "Archivo inválido" }, { status: 400 });
  }

  const filename = pathSegments[pathSegments.length - 1];

  for (const dir of resolveUploadDirs()) {
    const filepath = path.join(dir, ...pathSegments);
    if (!fs.existsSync(filepath) || !fs.statSync(filepath).isFile()) {
      continue;
    }

    const buffer = fs.readFileSync(filepath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": getContentType(filename),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  return NextResponse.json({ error: "No encontrado" }, { status: 404 });
}
