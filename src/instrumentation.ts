const SHELL_MISSING_REGEX = /spawn\s+\/bin\/sh\s+ENOENT/i;

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
  return Boolean(cause) && isMissingShellError(cause);
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
    if (isMissingShellError(error)) {
      console.warn("Se ignoró un error de entorno por falta de /bin/sh.", error);
      return;
    }
    throw error;
  });

  process.on("unhandledRejection", (reason) => {
    if (isMissingShellError(reason)) {
      console.warn("Se ignoró una promesa rechazada por falta de /bin/sh.", reason);
      return;
    }
    throw reason;
  });
}
