// Simple seed script - uses pg directly to avoid Prisma import issues
import { Client } from "pg";
import bcrypt from "bcryptjs";

const client = new Client({
  connectionString: process.env.DASHBOARD_DATABASE_URL || "postgres://paperclip:paperclip@db:5432/dashboard",
});

async function ensureAdmin(email: string, name: string) {
  const res = await client.query('SELECT id FROM "User" WHERE email = $1', [email]);

  if (res.rows.length === 0) {
    const passwordHash = await bcrypt.hash("admin123", 12);
    const id = `cuid_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    await client.query(
      `INSERT INTO "User" (id, email, name, "passwordHash", role, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [id, email, name, passwordHash, "ADMIN"]
    );
    console.log(`Admin user created: ${email}`);
  } else {
    console.log(`Admin user already exists: ${email}`);
  }
}

async function main() {
  await client.connect();

  await ensureAdmin("yash@stage.in", "Yash (Admin)");
  await ensureAdmin("naman@stage.in", "Naman (Admin)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => client.end());
