# PDI Workspace · Decisões do projeto

## Objetivo

Transformar o PDI de uma planilha estática em um workspace vivo de desenvolvimento profissional, com planejamento, documentação, feedbacks, histórico e evidências.

## Stack

- Next.js 16
- React 19
- GitHub para código e versionamento
- Vercel para deploy e variáveis de ambiente
- Supabase para banco e, futuramente, autenticação e storage

## V1 atual

A base já utiliza Supabase como persistência compartilhada.

### Fluxo

```text
Login compartilhado
      ↓
Next.js / Vercel
      ↓
API server-side protegida por sessão
      ↓
Supabase
```

A Publishable Key não possui policies anônimas de escrita. As operações privilegiadas são executadas apenas no servidor usando `SUPABASE_SECRET_KEY`.

## Acesso

A V1 usa:

- `APP_ACCESS_USERNAME`
- `APP_ACCESS_PASSWORD`

O usuário padrão, quando `APP_ACCESS_USERNAME` não existe, é `almir`.

Uma sessão HTTP-only é criada após o login. Rotas de leitura e gravação do PDI validam essa sessão.

## Dados atuais

- Trilhas de desenvolvimento
- Objetivos
- Ações
- Como executar
- Resultados esperados
- Prazos
- Observações
- Progresso
- Status
- Atualizações/comentários
- Histórico de mudanças

## Banco

Tabelas:

- `pdi_tracks`
- `pdi_updates`
- `pdi_history`
- `profiles` preparada para autenticação futura

RLS está habilitado.

## Próxima fase

1. Migrar o login compartilhado para Supabase Auth.
2. Criar contas Almir e Gestor.
3. Aplicar roles `owner` e `manager`.
4. Criar policies de RLS por usuário.
5. Adicionar ciclos de estudo.
6. Adicionar pessoas e banco de perguntas.
7. Criar documentação e anexos via Supabase Storage.
8. Criar highlights/evidências e métricas.
