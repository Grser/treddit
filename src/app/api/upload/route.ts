export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, getUploadSizeErrorMessage } from "@/lib/upload";
import { analyzeSensitiveMediaInput } from "@/lib/sensitiveMedia";
import fs from "fs";
import path from "path";

function buildPublicUploadUrl(pathSegments: string[]) {
  return `/api/upload/${pathSegments.map((segment) => encodeURIComponent(segment)).join("/")}`;
}

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

function splitFilenameParts(filename: string) {
  const ext = path.extname(filename);
  const name = ext ? filename.slice(0, -ext.length) : filename;
  return { name, ext };
}

function generateUniqueFilename(uploadsDir: string, directorySegments: string[], originalName: string) {
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_") || "archivo";
  const { name, ext } = splitFilenameParts(safeName);
  const targetDir = path.join(uploadsDir, ...directorySegments);
  let candidate = safeName;
  let index = 1;

  while (fs.existsSync(path.join(targetDir, candidate))) {
    candidate = `${name}-${index}${ext}`;
    index += 1;
  }

  return candidate;
}

function parseChunkMetadata(req: Request) {
  const { searchParams } = new URL(req.url);
  const uploadId = searchParams.get("uploadId")?.trim() || "";
  const filename = searchParams.get("filename")?.trim() || "";
  const chunkIndexRaw = searchParams.get("chunkIndex");
  const totalChunksRaw = searchParams.get("totalChunks");

  if (!uploadId && !chunkIndexRaw && !totalChunksRaw) {
    return null;
  }

  const chunkIndex = Number(chunkIndexRaw);
  const totalChunks = Number(totalChunksRaw);
  if (!uploadId || !Number.isInteger(chunkIndex) || !Number.isInteger(totalChunks) || chunkIndex < 0 || totalChunks <= 0 || chunkIndex >= totalChunks) {
    throw new Error("metadatos de chunks inválidos");
  }

  return { uploadId: uploadId.replace(/[^a-zA-Z0-9_-]/g, ""), filename, chunkIndex, totalChunks };
}

function resolveUploadScope(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawScope = searchParams.get("scope")?.trim() || "general";
  const safeScope = rawScope.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return safeScope || "general";
}

function resolveUserUploadDirectory(userId: string, scope: string) {
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "") || "anon";
  return [safeUserId, scope];
}

export async function POST(req: Request) {
  // exige sesión para subir
  const user = await requireUser();

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "form-data inválido" }, { status: 400 });

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "archivo requerido" }, { status: 400 });

  const scope = resolveUploadScope(req);
  const userDirectorySegments = resolveUserUploadDirectory(user.id, scope);
  const uploadDirs = resolveUploadDirs();
  const uploadsDir = uploadDirs[0];
  for (const dir of uploadDirs) {
    const userScopedDir = path.join(dir, ...userDirectorySegments);
    if (!fs.existsSync(userScopedDir)) fs.mkdirSync(userScopedDir, { recursive: true });
  }

  let chunkMeta: ReturnType<typeof parseChunkMetadata> = null;
  try {
    chunkMeta = parseChunkMetadata(req);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "metadatos inválidos" }, { status: 400 });
  }

  if (!chunkMeta && file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: getUploadSizeErrorMessage() }, { status: 413 });
  }

  if (chunkMeta) {
    const chunksRoot = path.join(uploadsDir, ".chunks", ...userDirectorySegments);
    const tempDir = path.join(chunksRoot, chunkMeta.uploadId);
    fs.mkdirSync(tempDir, { recursive: true });

    const chunkPath = path.join(tempDir, `${chunkMeta.chunkIndex}.part`);
    const chunkBuffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(chunkPath, chunkBuffer);

    const expectedChunkPaths = Array.from({ length: chunkMeta.totalChunks }, (_, index) => path.join(tempDir, `${index}.part`));
    const hasAllChunks = expectedChunkPaths.every((partPath) => fs.existsSync(partPath));
    if (!hasAllChunks) {
      return NextResponse.json({ ok: true, partial: true, chunkIndex: chunkMeta.chunkIndex });
    }

    const filename = generateUniqueFilename(uploadsDir, userDirectorySegments, `${Date.now()}-${chunkMeta.filename || file.name}`);
    const relativePathSegments = [...userDirectorySegments, filename];
    const finalPath = path.join(uploadsDir, ...relativePathSegments);
    const stream = fs.createWriteStream(finalPath);
    for (const partPath of expectedChunkPaths) {
      stream.write(fs.readFileSync(partPath));
    }
    stream.end();

    await new Promise<void>((resolve, reject) => {
      stream.on("finish", () => resolve());
      stream.on("error", reject);
    });

    for (const dir of uploadDirs.slice(1)) {
      fs.copyFileSync(finalPath, path.join(dir, ...relativePathSegments));
    }

    fs.rmSync(tempDir, { recursive: true, force: true });

    const url = buildPublicUploadUrl(relativePathSegments);
    const analysis = analyzeSensitiveMediaInput({ filename: chunkMeta.filename || file.name, mimeType: file.type });
    return NextResponse.json({ ok: true, url, owner: user.id, scope, sensitive: analysis });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const filename = generateUniqueFilename(uploadsDir, userDirectorySegments, `${Date.now()}-${file.name}`);
  const relativePathSegments = [...userDirectorySegments, filename];
  for (const dir of uploadDirs) {
    const filepath = path.join(dir, ...relativePathSegments);
    fs.writeFileSync(filepath, buffer);
  }

  const url = buildPublicUploadUrl(relativePathSegments);
  const analysis = analyzeSensitiveMediaInput({ filename: file.name, mimeType: file.type });

  return NextResponse.json({ ok: true, url, owner: user.id, scope, sensitive: analysis });
}
