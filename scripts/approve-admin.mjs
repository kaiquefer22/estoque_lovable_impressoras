import mysql from "mysql2/promise";

const dbUrl = process.env.DATABASE_URL;
const url = new URL(dbUrl);
const config = {
  host: url.hostname,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
};

async function approveAdmin() {
  const connection = await mysql.createConnection(config);
  
  try {
    // Aprovar usuário admin
    await connection.execute(
      "UPDATE users SET isApproved = true WHERE role = ? AND email = ?",
      ["admin", "admin@estoque.local"]
    );
    console.log("✓ Admin user approved successfully");
  } catch (error) {
    console.error("✗ Error:", error.message);
  } finally {
    await connection.end();
  }
}

approveAdmin();
