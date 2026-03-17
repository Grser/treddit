export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export function formatUploadLimit(maxBytes = MAX_UPLOAD_BYTES) {
  const mb = maxBytes / (1024 * 1024);
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)}MB`;
}

export function getUploadSizeErrorMessage(maxBytes = MAX_UPLOAD_BYTES) {
  return `archivo demasiado grande (${formatUploadLimit(maxBytes)} máximo)`;
}

export function validateUploadSize(file: File, maxBytes = MAX_UPLOAD_BYTES) {
  if (file.size > maxBytes) {
    throw new Error(getUploadSizeErrorMessage(maxBytes));
  }
}
