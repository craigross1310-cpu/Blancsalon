/**
 * Creates (or resets the password of) a dashboard login.
 *   DATABASE_URL=… npm run db:seed-owner -- owner@blancsalon.co.uk "Owner Name" [owner|staff]
 * The password is read from the OWNER_PASSWORD environment variable or prompted for.
 */
import { createInterface } from "node:readline/promises";
import { hashPassword } from "../src/lib/auth/password";
import { databaseUrl, openDb } from "../src/lib/db/client";

(async () => {
  const [email, name = "", role = "owner"] = process.argv.slice(2);
  if (!email) throw new Error('Usage: npm run db:seed-owner -- email@example.com "Name" [owner|staff]');
  if (!["owner", "staff"].includes(role)) throw new Error("Role must be owner or staff");
  const url = databaseUrl();
  if (!url) throw new Error("Set DATABASE_URL first.");
  let password = process.env.OWNER_PASSWORD;
  if (!password) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    password = await rl.question("Password (min 10 characters): ");
    rl.close();
  }
  if (!password || password.length < 10) throw new Error("Password must be at least 10 characters.");
  const db = await openDb({ url });
  await db.query(
    `insert into admin_users (email, name, role, password_hash) values ($1, $2, $3, $4)
     on conflict ((lower(email))) do update set name = excluded.name, role = excluded.role, password_hash = excluded.password_hash, active = true`,
    [email, name, role, await hashPassword(password)]
  );
  console.log(`Dashboard login ready for ${email} (${role}).`);
  await db.close();
})().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
