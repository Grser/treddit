const SHELL_MISSING_REGEX = /spawn\s+\/bin\/sh\s+ENOENT/i;
const WINDOWS_PATH_PERMISSION_REGEX = /EPERM: operation not permitted, open ['"](?:[A-Za-z]:\\[^'"]+)['"]/i;
const WINDOWS_PATH_NOT_FOUND_REGEX = /ENOENT: no such file or directory, open ['"](?:[A-Za-z]:\\(?:tmp|temp)\\[^'"]+)['"]/i;

function isMissingShellError(error: unknown): boolean {
  if (error instanceof Error && SHELL_MISSING_REGEX.test(error.message)) {
    return true;
  }

  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? error.code : undefined;
  const path = "path" in error ? error.path : undefined;
  if (code === "ENOENT" && path === "/bin/sh") {
    return true;
  }

  const cause = "cause" in error ? error.cause : undefined;
  if (cause && isMissingShellError(cause)) {
    return true;
  }

  const errors = "errors" in error ? error.errors : undefined;
  if (Array.isArray(errors)) {
    return errors.some((entry) => isMissingShellError(entry));
  }

  return false;
}

function isWindowsPathPermissionError(error: unknown): boolean {
  if (error instanceof Error && WINDOWS_PATH_PERMISSION_REGEX.test(error.message)) {
    return true;
  }

  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? error.code : undefined;
  const path = "path" in error ? error.path : undefined;
  if (code !== "EPERM" || typeof path !== "string") {
    return false;
  }

  return /^[A-Za-z]:\\/.test(path);
}

function isWindowsTempPathNotFoundError(error: unknown): boolean {
  if (error instanceof Error && WINDOWS_PATH_NOT_FOUND_REGEX.test(error.message)) {
    return true;
  }

  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? error.code : undefined;
  const path = "path" in error ? error.path : undefined;
  if (code !== "ENOENT" || typeof path !== "string") {
    return false;
  }

  return /^[A-Za-z]:\\(?:tmp|temp)\\/i.test(path);
}

function isIgnoredEnvironmentError(error: unknown): boolean {
  return isMissingShellError(error) || isWindowsPathPermissionError(error) || isWindowsTempPathNotFoundError(error);
}

const globalForShellGuard = globalThis as typeof globalThis & {
  __tredditShellErrorGuardsRegistered?: boolean;
};

export async function register() {
  if (globalForShellGuard.__tredditShellErrorGuardsRegistered) {
    return;
  }

  globalForShellGuard.__tredditShellErrorGuardsRegistered = true;

  process.on("uncaughtException", (error) => {
    if (isIgnoredEnvironmentError(error)) {
      console.warn("Se ignoró un error de entorno no crítico.", error);
      return;
    }

    // Re-throwing inside this handler can trigger recursive uncaughtException cycles.
    process.nextTick(() => {
      throw error;
    });
  });

  process.on("unhandledRejection", (reason) => {
    if (isIgnoredEnvironmentError(reason)) {
      console.warn("Se ignoró una promesa rechazada por un error de entorno no crítico.", reason);
      return;
    }

    process.nextTick(() => {
      throw reason;
    });
  });
}
