import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'estoque',
  ssl: (process.env.DB_HOST || '').includes('Amazon RDS') ? { rejectUnauthorized: false } : undefined,
});

try {
  const migrationsDir = path.join(__dirname, '../drizzle');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    
    // Split by statement-breakpoint
    const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(s => s);
    
    for (const statement of statements) {
      try {
        console.log(`Executing: ${file}`);
        await connection.execute(statement);
        console.log(`✓ ${file} executed successfully`);
      } catch (err) {
        if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_DUP_ENTRY') {
          console.log(`⚠ ${file} already exists, skipping...`);
        } else {
          console.error(`✗ Error in ${file}:`, err.message);
        }
      }
    }
  }

  console.log('All migrations completed!');
} catch (error) {
  console.error('Error:', error.message);
} finally {
  await connection.end();
}
