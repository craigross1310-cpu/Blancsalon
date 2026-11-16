import { migrations } from "./migrations";

export interface Db {
  kind: "pglite" | "postgres";
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  /** Run multiple statements (no parameters). */
  exec(text: string): Promise<void>;
  /** Run fn inside a transaction. Nested calls reuse the outer transaction. */
  tx<T>(fn: (db: Db) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || undefined;
}

/** No external database configured: an embedded Postgres (PGlite) is used. */
export function usesEmbeddedDb(): boolean {
  return !databaseUrl();
}

/**
 * Demo mode = the site hasn't been configured for real use yet (no database, or
 * no SESSION_SECRET). In demo mode the database is set up automatically with
 * BLANC's menu, a demo owner login and sample bookings.
 */
export function isDemoMode(): boolean {
  return usesEmbeddedDb() || !process.env.SESSION_SECRET;
}

// ── PGlite (embedded, demo) ─────────────────────────────────────
async function createPglite(dataDir: string): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  if (dataDir !== "memory://") {
    const fs = await import("node:fs");
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const pg = await PGlite.create(dataDir);

  type Q = { query: typeof pg.query; exec: typeof pg.exec };
  const wrap = (conn: Q, inTx: boolean): Db => ({
    kind: "pglite",
    async query<T>(text: string, params: unknown[] = []) {
      const r = await conn.query<T>(text, params as never[]);
      return r.rows;
    },
    async exec(text: string) {
      await conn.exec(text);
    },
    async tx<T>(fn: (db: Db) => Promise<T>): Promise<T> {
      if (inTx) return fn(wrap(conn, true));
      return pg.transaction(async (t) => fn(wrap(t as unknown as Q, true)));
    },
    async close() {
      if (!inTx) await pg.close();
    },
  });
  return wrap(pg, false);
}

// ── postgres.js (production: Supabase / Neon / any Postgres) ────
async function createPostgres(url: string): Promise<Db> {
  const postgres = (await import("postgres")).default;
  const parsed = new URL(url);
  const isLocal = ["localhost", "127.0.0.1", ""].includes(parsed.hostname);
  // Hosting providers add query options (sslmode, channel_binding, pgbouncer…) that
  // postgres.js would forward to the server as settings; SSL is configured below instead.
  const host = parsed.searchParams.get("host"); // unix-socket connections
  parsed.search = host ? `?host=${encodeURIComponent(host)}` : "";
  const sql = postgres(parsed.toString(), {
    // Supabase's transaction pooler (port 6543) does not support prepared statements.
    prepare: false,
    max: Number(process.env.DATABASE_POOL_MAX || 5),
    idle_timeout: 20,
    ssl: process.env.DATABASE_SSL === "false" || isLocal ? false : "require",
    onnotice: () => {},
  });

  type Conn = { unsafe: typeof sql.unsafe };
  const wrap = (conn: Conn, inTx: boolean): Db => ({
    kind: "postgres",
    async query<T>(text: string, params: unknown[] = []) {
      const rows = await conn.unsafe(text, params as never[]);
      return rows as unknown as T[];
    },
    async exec(text: string) {
      await conn.unsafe(text);
    },
    async tx<T>(fn: (db: Db) => Promise<T>): Promise<T> {
      if (inTx) return fn(wrap(conn, true));
      return sql.begin(async (t) => fn(wrap(t as unknown as Conn, true))) as Promise<T>;
    },
    async close() {
      if (!inTx) await sql.end({ timeout: 5 });
    },
  });
  return wrap(sql, false);
}

// ── Migrations ─────────────────────────────────────────────────
export async function migrate(db: Db): Promise<string[]> {
  const applied: string[] = [];
  await db.tx(async (t) => {
    if (db.kind === "postgres") await t.query("select pg_advisory_xact_lock(727274)");
    await t.exec(`create table if not exists schema_migrations (
      name text primary key, applied_at timestamptz not null default now())`);
    const done = new Set((await t.query<{ name: string }>("select name from schema_migrations")).map((r) => r.name));
    for (const m of migrations) {
      if (done.has(m.name)) continue;
      await t.exec(m.sql);
      await t.query("insert into schema_migrations (name) values ($1)", [m.name]);
      applied.push(m.name);
    }
  });
  return applied;
}

// ── Singleton ──────────────────────────────────────────────────
const g = globalThis as unknown as { __blancDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!g.__blancDb) {
    g.__blancDb = (async () => {
      const url = databaseUrl();
      if (url) {
        const db = await createPostgres(url);
        if (isDemoMode() || process.env.AUTO_MIGRATE === "true") await migrate(db);
        if (isDemoMode()) {
          const { seedIfEmpty } = await import("./seed");
          // Serialise first-run seeding across concurrently starting servers.
          await db.tx(async (t) => {
            await t.query("select pg_advisory_xact_lock(727276)");
            await seedIfEmpty(t);
          });
        }
        return db;
      }
      const dir =
        process.env.PGLITE_DIR || (process.env.VERCEL ? "/tmp/blanc-pglite" : `${process.cwd()}/.data/pglite`);
      const db = await createPglite(dir);
      await migrate(db);
      const { seedIfEmpty } = await import("./seed");
      await seedIfEmpty(db);
      return db;
    })().catch((err) => {
      g.__blancDb = undefined;
      throw err;
    });
  }
  return g.__blancDb;
}

/** Test helper: open an isolated database (in-memory PGlite or a Postgres URL). */
export async function openDb(opts: { url?: string; dataDir?: string }): Promise<Db> {
  return opts.url ? createPostgres(opts.url) : createPglite(opts.dataDir ?? "memory://");
}
