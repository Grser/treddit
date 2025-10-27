import mysql from "mysql2/promise";

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

if (missingVariables.length > 0) {
  throw new Error(
    `Missing required database environment variables: ${missingVariables.join(", ")}`,
  );
}

export const db = mysql.createPool({
  host: DATABASE_HOST!,
  user: DATABASE_USER!,
  password: DATABASE_PASS!,
  database: DATABASE_NAME!,
  connectionLimit: 10,
});
