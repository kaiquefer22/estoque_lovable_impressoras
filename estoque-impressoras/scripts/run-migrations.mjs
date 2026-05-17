import { readdir, readFile } from "fs/promises";
import { join } from "path";
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
  ssl: {
    rejectUnauthorized: false,
  },
};

async function runMigrations() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    
    // Ler arquivos SQL de migração
    const migrationsDir = "./drizzle";
    const files = await readdir(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith(".sql")).sort();
    
    console.log(`Found ${sqlFiles.length} migration files`);
    
    for (const file of sqlFiles) {
      const filePath = join(migrationsDir, file);
      const sql = await readFile(filePath, "utf-8");
      
      // Dividir por statement-breakpoint
      const statements = sql.split("-->").map(s => s.trim()).filter(s => s && !s.startsWith("statement-breakpoint"));
      
      console.log(`\nRunning ${file}...`);
      for (const statement of statements) {
        if (statement) {
          try {
            await connection.execute(statement);
            console.log(`  ✓ ${statement.substring(0, 50)}...`);
          } catch (error) {
            // Ignorar erros de constraint já existente
            if (error.code === "ER_DUP_KEYNAME" || error.code === "ER_CANT_DROP_FIELD_OR_KEY") {
              console.log(`  ⊘ ${statement.substring(0, 50)}... (already exists)`);
            } else {
              console.error(`  ✗ Error: ${error.message}`);
            }
          }
        }
      }
    }
    
    console.log("\n✓ Migrations completed");
  } catch (error) {
    console.error("✗ Error:", error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigrations();
