# PDI Workspace · Almir

> Deploy sync: automatic progress + deadline alerts enabled.

Workspace pessoal para acompanhar o Plano de Desenvolvimento Individual, inicialmente baseado na planilha `[PDI 2025.2] Planejamento do Time_Almir_may26.xlsx`.

## Estado atual

- Login privado com usuário + senha.
- Duas trilhas iniciais importadas da planilha.
- Edição de objetivo, ação, execução, resultado esperado, prazo, observação, status e progresso.
- Comentários/atualizações identificados como Almir ou Gestor.
- Histórico de alterações.
- Persistência compartilhada no Supabase.
- RLS habilitado nas tabelas.
- A aplicação acessa o banco para escrita apenas pelo servidor.

## Variáveis no Vercel

```env
APP_ACCESS_USERNAME=almir
APP_ACCESS_PASSWORD=uma-senha-forte

NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

SUPABASE_SECRET_KEY=sb_secret_...
```

`SUPABASE_SECRET_KEY` é server-only. Nunca use o prefixo `NEXT_PUBLIC_` nela e nunca a envie para o GitHub.

Se o projeto do Supabase ainda usa a chave legada `service_role`, a aplicação também aceita:

```env
SUPABASE_SERVICE_ROLE_KEY=...
```

## Banco

Execute `supabase/schema.sql` no SQL Editor do Supabase.

Na primeira abertura autenticada da aplicação, se `pdi_tracks` estiver vazio, as duas trilhas iniciais são inseridas automaticamente.

## Deploy

1. Importe o repositório no Vercel.
2. Configure todas as variáveis acima.
3. Faça um novo deploy.
4. Acesse o domínio.
5. Entre com `APP_ACCESS_USERNAME` e `APP_ACCESS_PASSWORD`.

## Próximas fases

- Supabase Auth com contas separadas.
- Papéis Owner e Manager.
- Permissões específicas por tipo de conteúdo.
- Ciclos de estudo.
- Banco de pessoas e perguntas.
- Documentos e anexos.
- Highlights/evidências.
- Métricas de PDI.
