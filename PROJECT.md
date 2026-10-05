# PDI Workspace · Decisões do projeto

## Objetivo

Transformar o PDI de uma planilha estática em um workspace vivo de desenvolvimento profissional, com planejamento, documentação, feedbacks, histórico e evidências.

## Stack

- Next.js 16
- React 19
- GitHub para código e versionamento
- Vercel para deploy
- Supabase para banco, autenticação e storage na próxima etapa

## V1

A V1 prioriza velocidade e validação da interface. Os dados iniciais foram importados da planilha de maio/2026 e as alterações são salvas localmente no navegador.

### Entidades já representadas

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

## Acesso

A aplicação aceita uma senha compartilhada definida pela variável server-side `APP_ACCESS_PASSWORD`. Nenhuma senha é incluída no repositório.

No futuro o acesso será migrado para Supabase Auth, com usuários separados.

### Papéis planejados

- `owner`: Almir. Controle completo.
- `manager`: gestor. Comentários, avaliações, validações e permissões de edição definidas posteriormente.

## Persistência planejada

O GitHub não será usado como banco de dados. Conteúdos criados pela interface serão persistidos no Supabase.

### Fase 2

1. Criar tabelas no Supabase.
2. Migrar as duas trilhas seed para o banco.
3. Persistir atualizações e histórico.
4. Adicionar login individual.
5. Registrar autoria por usuário.
6. Criar Row Level Security.
7. Criar módulo de documentação e anexos.
8. Criar ciclos de estudo e banco de perguntas.
9. Criar highlights/evidências e métricas do PDI.
