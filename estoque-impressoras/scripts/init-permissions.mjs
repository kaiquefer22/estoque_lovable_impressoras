import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse DATABASE_URL
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL não está definida');
  process.exit(1);
}

// Formato: mysql://user:password@host:port/database
const url = new URL(dbUrl);
const connection = await mysql.createConnection({
  host: url.hostname,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: url.hostname.includes('rds') ? { rejectUnauthorized: false } : undefined,
});

try {
  console.log('Conectado ao banco de dados');
  
  // Executar migrações
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
        await connection.execute(statement);
        console.log(`✓ ${file}`);
      } catch (err) {
        if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_DUP_ENTRY' || err.code === 'ER_DUP_FIELDNAME') {
          console.log(`⚠ ${file} já existe`);
        } else {
          console.error(`✗ ${file}:`, err.message);
        }
      }
    }
  }

  // Inicializar dados de permissões
  console.log('\nInicializando dados de permissões...');
  
  // Inserir módulos de permissão
  const modules = [
    { name: 'printers', displayName: 'Impressoras', description: 'Gerenciar impressoras' },
    { name: 'supplies', displayName: 'Insumos', description: 'Gerenciar insumos' },
    { name: 'stock_movements', displayName: 'Movimentações', description: 'Entrada e saída de estoque' },
    { name: 'purchase_orders', displayName: 'Pedidos', description: 'Gerenciar pedidos de compra' },
    { name: 'reports', displayName: 'Relatórios', description: 'Gerar e visualizar relatórios' },
    { name: 'audit', displayName: 'Auditoria', description: 'Visualizar histórico de ações' },
    { name: 'users', displayName: 'Usuários', description: 'Gerenciar usuários' },
    { name: 'permissions', displayName: 'Permissões', description: 'Controlar permissões de usuários' },
    { name: 'email_config', displayName: 'Config. E-mails', description: 'Configurar envio de emails' },
    { name: 'alerts', displayName: 'Alertas', description: 'Gerenciar alertas do sistema' },
  ];

  for (const module of modules) {
    try {
      await connection.execute(
        'INSERT IGNORE INTO permission_modules (name, displayName, description) VALUES (?, ?, ?)',
        [module.name, module.displayName, module.description]
      );
      console.log(`✓ Módulo: ${module.displayName}`);
    } catch (err) {
      console.error(`✗ Erro ao inserir módulo ${module.name}:`, err.message);
    }
  }

  // Inserir ações de permissão
  const actions = [
    { name: 'view', displayName: 'Visualizar' },
    { name: 'create', displayName: 'Criar' },
    { name: 'edit', displayName: 'Editar' },
    { name: 'delete', displayName: 'Deletar' },
    { name: 'report', displayName: 'Gerar Relatório' },
  ];

  for (const action of actions) {
    try {
      await connection.execute(
        'INSERT IGNORE INTO permission_actions (moduleId, name, displayName) VALUES (1, ?, ?)',
        [action.name, action.displayName]
      );
    } catch (err) {
      // Silenciar erros de ação duplicada
    }
  }

  console.log('\n✓ Inicialização concluída com sucesso!');
} catch (error) {
  console.error('Erro:', error.message);
  process.exit(1);
} finally {
  await connection.end();
}
