# PDI Workspace · Almir

Workspace pessoal para acompanhar o Plano de Desenvolvimento Individual, inicialmente baseado na planilha `[PDI 2025.2] Planejamento do Time_Almir_may26.xlsx`.

## V1

- Replica as duas trilhas atuais do PDI.
- Permite editar objetivo, ação, execução, resultado esperado, prazo, observação, status e progresso.
- Permite registrar atualizações/comentários como **Almir** ou **Gestor**.
- Mantém um histórico básico de alterações.
- Protege a aplicação com uma senha compartilhada quando `APP_ACCESS_PASSWORD` está configurada.
- Salva as alterações no `localStorage` do navegador nesta primeira versão.
- Já deixa as variáveis do Supabase previstas para a próxima etapa.

> Importante: nesta V1, os dados editados ainda não são sincronizados entre navegadores. A próxima etapa é conectar a persistência ao Supabase para que Almir e Gestor compartilhem a mesma base.

## Rodar localmente

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra `http://localhost:3000`.

## Variáveis de ambiente

```env
APP_ACCESS_PASSWORD=uma-senha-forte
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Nunca envie senhas ou chaves secretas para o GitHub.

## Deploy no Vercel

1. Importe `almirneto-bit/pdi-workspace-almir` no Vercel.
2. Em **Settings → Environment Variables**, crie `APP_ACCESS_PASSWORD`.
3. Faça o deploy.
4. Na próxima etapa, adicione também as duas variáveis públicas do Supabase e aplique o schema.

## Próxima etapa

A integração com Supabase irá substituir o `localStorage` por tabelas compartilhadas, adicionando usuários separados, autoria real, comentários, histórico persistente, documentos e permissões Owner/Manager.
