import mysql from "mysql2/promise";

type QueryArgs = Parameters<mysql.Pool["query"]>;
type ExecuteArgs = Parameters<mysql.Pool["execute"]>;

const {
  DATABASE_HOST,
  DATABASE_USER,
  DATABASE_PASS,
  DATABASE_NAME,
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

let pool: mysql.Pool | null = null;

if (isConfigured) {
  pool = mysql.createPool({
    host: DATABASE_HOST!,
    user: DATABASE_USER!,
    password: DATABASE_PASS!,
    database: DATABASE_NAME!,
    connectionLimit: 10,
  });
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

export const db = {
  query<T extends mysql.RowDataPacket[][] | mysql.RowDataPacket[] | mysql.OkPacket | mysql.OkPacket[]>(
    ...args: QueryArgs
  ) {
    return ensurePool().query<T>(...args);
  },
  execute<T extends mysql.RowDataPacket[][] | mysql.RowDataPacket[] | mysql.OkPacket | mysql.OkPacket[]>(
    ...args: ExecuteArgs
  ) {
    return ensurePool().execute<T>(...args);
  },
};

export function isDatabaseConfigured() {
  return isConfigured;
}
