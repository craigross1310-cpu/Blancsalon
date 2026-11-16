/**
 * Applies database migrations to DATABASE_URL.
 *   DATABASE_URL=postgres://… npm run db:migrate
 *   npm run db:migrate -- --print   (prints the SQL to paste into the Supabase SQL editor instead)
 *   npm run db:migrate -- --seed-menu  (also loads BLANC's treatment menu if the table is empty)
 *   npm run db:migrate -- --demo       (menu + demo owner login + sample bookings, for a hosted client demo)
 */
import { migrations } from "../src/lib/db/migrations";
import { databaseUrl, migrate, openDb } from "../src/lib/db/client";
import { seedIfEmpty, seedTreatments } from "../src/lib/db/seed";

(async () => {
  if (process.argv.includes("--print")) {
    console.log(migrations.map((m) => `-- ${m.name}\n${m.sql}`).join("\n\n"));
    return;
  }
  const url = databaseUrl();
  if (!url) throw new Error("Set DATABASE_URL first.");
  const db = await openDb({ url });
  const applied = await migrate(db);
  console.log(applied.length ? `Applied: ${applied.join(", ")}` : "Database already up to date.");
  if (process.argv.includes("--demo")) {
    console.log((await seedIfEmpty(db)) ? "Loaded demo data (menu, demo owner login, sample bookings)." : "Data already present — demo data not loaded.");
  } else if (process.argv.includes("--seed-menu")) {
    const [{ n }] = await db.query<{ n: number }>(`select count(*)::int as n from treatments`);
    if (Number(n) === 0) {
      await seedTreatments(db);
      console.log("Loaded BLANC treatment menu.");
    } else console.log("Treatments already exist — menu not loaded.");
  }
  await db.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
