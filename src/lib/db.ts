import mysql from "mysql2/promise";

const {
  DATABASE_HOST = "db.clawn.cat",
  DATABASE_USER = "conexiones",
  DATABASE_PASS = "1234",
  DATABASE_NAME = "treddit",
} = process.env;

export const db = mysql.createPool({
  host: DATABASE_HOST,
  user: DATABASE_USER,
  password: DATABASE_PASS,
  database: DATABASE_NAME,
  connectionLimit: 10,
});
