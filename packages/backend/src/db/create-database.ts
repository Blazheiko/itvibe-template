import "dotenv/config";
import pg from "pg";

const dbName = process.env["PGSQL_DB_NAME"] ?? "itvibe_template";

const connectionDefaults = {
  host: process.env["PGSQL_HOST"] ?? "127.0.0.1",
  port: Number(process.env["PGSQL_PORT"] ?? 5432),
  user: process.env["PGSQL_USER"] ?? "postgres",
  password: process.env["PGSQL_PASSWORD"] ?? "",
};

async function createDatabase(): Promise<void> {
  const adminClient = new pg.Client({
    ...connectionDefaults,
    database: "postgres",
  });
  await adminClient.connect();

  const result = await adminClient.query(
    `SELECT 1 FROM pg_database WHERE datname = $1`,
    [dbName],
  );

  if (result.rowCount === 0) {
    await adminClient.query(`CREATE DATABASE "${dbName}"`);
    console.log(`Database "${dbName}" created successfully.`);
  } else {
    console.log(`Database "${dbName}" already exists.`);
  }

  await adminClient.end();

  const dbClient = new pg.Client({
    ...connectionDefaults,
    database: dbName,
  });
  await dbClient.connect();
  await dbClient.query("CREATE EXTENSION IF NOT EXISTS vector");
  console.log(`Extension "vector" ensured in database "${dbName}".`);
  await dbClient.end();
}

createDatabase().catch((err: unknown) => {
  console.error("Failed to create database:", err);
  process.exit(1);
});
