import { createHash } from "crypto";
import mysql from "mysql2/promise";


const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL não está definida");
  process.exit(1);
}

// Parse DATABASE_URL
const url = new URL(dbUrl);
const config = {
  host: url.hostname,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: true,
};

async function createAdmin() {
  let connection;
  try {
    // Adicionar opções SSL
    const sslConfig = {
      ...config,
      ssl: {
        rejectUnauthorized: false,
      },
    };
    connection = await mysql.createConnection(sslConfig);
    
    // Verificar se já existe admin
    const [admins] = await connection.execute(
      "SELECT * FROM users WHERE role = ?",
      ["admin"]
    );
    
    if (admins.length > 0) {
      console.log("✓ Admin user already exists");
      return;
    }
    
    // Criar admin com senha padrão
    const defaultPassword = "Admin@123456";
    const passwordHash = createHash("sha256").update(defaultPassword).digest("hex");
    
    await connection.execute(
      "INSERT INTO users (openId, email, name, passwordHash, loginMethod, role, createdAt, updatedAt, lastSignedIn) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())",
      ["admin-default", "admin@estoque.local", "Administrador", passwordHash, "password", "admin"]
    );
    
    console.log("✓ Admin user created successfully");
    console.log("  Email: admin@estoque.local");
    console.log("  Password: Admin@123456");
  } catch (error) {
    console.error("✗ Error:", error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createAdmin();
