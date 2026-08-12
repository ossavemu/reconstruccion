import { createClient, type Client } from "@libsql/client";

let client: Client | null = null;
let schemaReady = false;

export function getDb(): Client {
  if (!client) {
    const url = import.meta.env.TURSO_DATABASE_URL;
    const authToken = import.meta.env.TURSO_AUTH_TOKEN;
    if (!url || !authToken) {
      throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set");
    }
    client = createClient({ url, authToken });
  }
  return client;
}

export async function ensureSchema(db: Client): Promise<void> {
  if (schemaReady) return;
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS solicitudes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        creado_en TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS votos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        fecha TEXT NOT NULL,
        creado_en TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    ],
    "write",
  );
  schemaReady = true;
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}
