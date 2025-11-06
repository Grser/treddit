import mysql from "mysql2/promise";

type QueryArgs = Parameters<mysql.Pool["query"]>;
type ExecuteArgs = Parameters<mysql.Pool["execute"]>;

const {
  DATABASE_HOST,
  DATABASE_USER,
  DATABASE_PASS,
  DATABASE_NAME,
  DATABASE_POOL_SIZE,
} = process.env;

const missingVariables = Object.entries({
  DATABASE_HOST,
  DATABASE_USER,
  DATABASE_PASS,
  DATABASE_NAME,
})
  .filter(([, value]) => value === undefined)
  .map(([key]) => key);

const isConfigured = missingVariables.length === 0;

const globalForDb = globalThis as unknown as { __tredditDbPool?: mysql.Pool | null };

let pool: mysql.Pool | null = null;

const parsedPoolSize = Number.parseInt(String(DATABASE_POOL_SIZE ?? ""), 10);
const connectionLimit = Number.isFinite(parsedPoolSize) && parsedPoolSize > 0 ? parsedPoolSize : 5;

if (DATABASE_POOL_SIZE && (!Number.isFinite(parsedPoolSize) || parsedPoolSize <= 0)) {
  console.warn(
    `Invalid DATABASE_POOL_SIZE value "${DATABASE_POOL_SIZE}". Falling back to ${connectionLimit} connections.`,
  );
}

if (isConfigured) {
  if (!globalForDb.__tredditDbPool) {
    globalForDb.__tredditDbPool = mysql.createPool({
      host: DATABASE_HOST!,
      user: DATABASE_USER!,
      password: DATABASE_PASS!,
      database: DATABASE_NAME!,
      connectionLimit,
      waitForConnections: true,
      queueLimit: 0,
    });
  }
  pool = globalForDb.__tredditDbPool;
} else {
  console.warn(
    `Database connection is not configured. Missing variables: ${missingVariables.join(", ")}`,
  );
}

function ensurePool(): mysql.Pool {
  if (!pool) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }
  return pool;
}

export class DatabaseConnectionLimitError extends Error {
  code = "DATABASE_CONNECTION_LIMIT";
  originalError: unknown;

  constructor(originalError?: unknown) {
    super("Database connection limit reached");
    this.name = "DatabaseConnectionLimitError";
    this.originalError = originalError;
  }
}

function isTooManyConnectionsError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === "object" && "code" in error && (error as { code?: unknown }).code === "ER_CON_COUNT_ERROR") {
    return true;
  }
  if (error instanceof Error && /Too many connections/i.test(error.message)) {
    return true;
  }
  return false;
}

function wrapDbPromise<T>(promise: Promise<T>): Promise<T> {
  return promise.catch((error) => {
    if (isTooManyConnectionsError(error)) {
      throw new DatabaseConnectionLimitError(error);
    }
    throw error;
  });
}

export function isDatabaseConnectionLimitError(
  error: unknown,
): error is DatabaseConnectionLimitError {
  return error instanceof DatabaseConnectionLimitError;
}

export const db = {
  query<T extends mysql.RowDataPacket[][] | mysql.RowDataPacket[] | mysql.OkPacket | mysql.OkPacket[]>(
    ...args: QueryArgs
  ) {
    return wrapDbPromise(ensurePool().query<T>(...args));
  },
  execute<T extends mysql.RowDataPacket[][] | mysql.RowDataPacket[] | mysql.OkPacket | mysql.OkPacket[]>(
    ...args: ExecuteArgs
  ) {
    return wrapDbPromise(ensurePool().execute<T>(...args));
  },
  async getConnection() {
    const instance = ensurePool();
    return wrapDbPromise(instance.getConnection());
  },
};

export function isDatabaseConfigured() {
  return isConfigured;
}
