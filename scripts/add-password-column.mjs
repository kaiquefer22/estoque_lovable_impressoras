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

async function addPasswordColumn() {
  const connection = await mysql.createConnection(config);
  
  try {
    // Adicionar coluna passwordHash se não existir
    await connection.execute(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS passwordHash text AFTER loginMethod
    `);
    console.log("✓ Column passwordHash added successfully");
  } catch (error) {
    if (error.code === "ER_DUP_FIELDNAME") {
      console.log("✓ Column passwordHash already exists");
    } else {
      console.error("✗ Error:", error.message);
    }
  } finally {
    await connection.end();
  }
}

addPasswordColumn();
