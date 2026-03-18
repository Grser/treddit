import { validateUploadSize } from "@/lib/upload";

type UploadResponse = { url?: string; error?: string; sensitive?: { suggestedSensitive?: boolean } };

const CHUNK_SIZE_BYTES = 25 * 1024 * 1024;

function createUploadId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function parseUploadResponse(res: Response): Promise<UploadResponse> {
  const payload = (await res.json().catch(() => ({}))) as UploadResponse;
  if (!res.ok) {
    throw new Error(typeof payload.error === "string" && payload.error.trim() ? payload.error : "UPLOAD_FAILED");
  }
  return payload;
}

export async function uploadFile(
  file: File,
  options?: { onProgress?: (progress: number) => void },
): Promise<UploadResponse> {
  validateUploadSize(file);

  if (file.size <= CHUNK_SIZE_BYTES) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    return parseUploadResponse(res);
  }

  const uploadId = createUploadId();
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE_BYTES);

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
    const start = chunkIndex * CHUNK_SIZE_BYTES;
    const end = Math.min(file.size, start + CHUNK_SIZE_BYTES);
    const chunk = file.slice(start, end, file.type || "application/octet-stream");

    const formData = new FormData();
    formData.append("file", chunk, file.name);

    const params = new URLSearchParams({
      uploadId,
      chunkIndex: String(chunkIndex),
      totalChunks: String(totalChunks),
      filename: file.name,
    });
    const res = await fetch(`/api/upload?${params.toString()}`, { method: "POST", body: formData });
    const payload = await parseUploadResponse(res);
    options?.onProgress?.(Math.max(1, Math.min(100, Math.round(((chunkIndex + 1) / totalChunks) * 100))));

    if (chunkIndex === totalChunks - 1) {
      return payload;
    }
  }

  throw new Error("UPLOAD_FAILED");
}

