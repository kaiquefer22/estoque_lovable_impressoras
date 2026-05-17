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

const connection = await mysql.createConnection(config);
const [columns] = await connection.execute("DESCRIBE users");
console.log("Columns in users table:");
columns.forEach(col => console.log(`  - ${col.Field} (${col.Type})`));
await connection.end();
