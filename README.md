# Estoque Impressoras

Sistema de controle de estoque de insumos para impressoras.

## Stack

- **Frontend**: React 19 + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express + tRPC
- **Banco de Dados**: PostgreSQL (Supabase)
- **ORM**: Drizzle ORM

## Configuração

### 1. Pré-requisitos

- Node.js 18+
- pnpm (`npm install -g pnpm`)

### 2. Instalar dependências

```bash
pnpm install
```

### 3. Configurar variáveis de ambiente

Copie o arquivo de exemplo e preencha com suas credenciais:

```bash
cp .env.example .env.local
```

Edite `.env.local` com suas configurações do Supabase e demais variáveis.

### 4. Executar em desenvolvimento

```bash
pnpm dev
```

### 5. Build para produção

```bash
pnpm build
pnpm start
```

## Deploy

Este projeto é compatível com **Lovable** (via GitHub sync), **Render**, **Railway** e qualquer plataforma que suporte Node.js.

### Variáveis obrigatórias em produção

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Connection string do Supabase PostgreSQL |
| `JWT_SECRET` | Chave secreta para JWT (mín. 32 caracteres) |

### Variáveis opcionais

| Variável | Descrição |
|----------|-----------|
| `SENDGRID_API_KEY` | Para envio de emails (reset de senha, notificações) |
| `PORT` | Porta do servidor (padrão: 3000) |
