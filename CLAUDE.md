# estoque-impressoras

Sistema de gerenciamento de estoque de suprimentos para impressoras (toners, cartuchos, peças, etc).

## Stack

- **Frontend**: React + TypeScript
- **Backend**: Node.js + TypeScript
- **Banco de dados**: MySQL
- **ORM**: Drizzle
- **Deploy**: Render
- **Envio de e-mail**: avaliar Resend ou Brevo (substituindo SendGrid)

## Histórico relevante

- Banco de dados atual é MySQL (o projeto já passou por outras configurações de banco ao longo do desenvolvimento — não assumir Postgres/Supabase em nada relacionado a schema, queries ou tipos).
- Já foram corrigidos bugs de: exibição de imagens de itens, códigos de item ausentes, e valores mínimos de estoque não sendo respeitados.
- Deploy no Render já teve problemas de: build steps não executando, caminhos de arquivos estáticos incorretos, erros de conexão SSL com o banco, e variáveis de ambiente mal configuradas — vale checar `render.yaml` e o painel de env vars antes de assumir que é bug de código.

## Convenções de código

- TypeScript estrito em frontend e backend.
- Preferir queries via Drizzle ORM, evitar SQL cru salvo em casos justificados.
- Manter consistência com os tipos gerados pelo schema do Drizzle entre frontend e backend.

## Comandos úteis

```bash
npm install          # instalar dependências
npm run dev           # ambiente de desenvolvimento local
npm run build          # build de produção
npm run db:push          # aplicar schema no MySQL via Drizzle (ajustar conforme script real do projeto)
```

> Nota: ajuste os comandos acima para bater exatamente com os scripts definidos no `package.json` do projeto, caso sejam diferentes.

## Cuidados ao editar

- Sempre trabalhar em uma branch separada, nunca commitar direto na branch de produção.
- Fazer commit de checkpoint antes de mudanças estruturais grandes (schema do banco, autenticação, deploy).
- Ao mexer em variáveis de ambiente ou configuração de deploy, checar se precisa espelhar a mudança no painel do Render.
- Antes de alterar o schema do MySQL, verificar impacto em queries e tipos gerados pelo Drizzle em todo o projeto.
