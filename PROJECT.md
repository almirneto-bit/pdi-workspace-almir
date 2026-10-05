# PDI Workspace · Version 1.0.0

## Status

**V1 finalizada em 05/10/2026.**

Esta versão consolida a primeira base funcional do PDI Workspace de Almir: uma plataforma privada para organizar trilhas de desenvolvimento, acompanhar execução, registrar aprendizados, comentários, evidências e histórico de evolução.

## Objetivo

Transformar o PDI de uma planilha estática em um workspace vivo de desenvolvimento profissional, com planejamento, acompanhamento, documentação e memória histórica.

## Stack

- Next.js 16
- React 19
- GitHub para código e versionamento
- Vercel para deploy
- Supabase para persistência
- Login compartilhado da V1 por usuário + senha da aplicação

## Arquitetura

```text
GitHub
  código da plataforma
        ↓
Vercel
  aplicação publicada
        ↓
Supabase
  dados persistentes do PDI
```

## Acesso V1

Variáveis de ambiente no Vercel:

- `APP_ACCESS_USERNAME`
- `APP_ACCESS_PASSWORD`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`

A aplicação usa sessão HTTP-only após login.

## Funcionalidades da V1

### Trilhas
- Visualizar múltiplas trilhas de desenvolvimento
- Criar novas trilhas
- Editar nome, objetivo, ação, como executar, resultado esperado, observação, status e progresso
- Definir prazo por calendário com data inicial e final

### Acompanhamento
- Checklist por trilha
- Adicionar itens
- Marcar/desmarcar itens
- Excluir itens
- Percentual de conclusão do checklist
- Histórico de alterações

### Comentários e documentação
- Comentários específicos da ação
- Insights gerais da trilha
- Updates gerais
- Editar comentários
- Excluir comentários
- Editar updates
- Excluir updates
- Registro de autoria textual na V1
- Registro temporal das alterações

### Persistência
Dados salvos no Supabase:

- `pdi_tracks`
- `pdi_updates`
- `pdi_history`
- `pdi_checklist_items`
- `pdi_notes`

RLS habilitado e escrita realizada pela API server-side da aplicação.

## Direção visual V1

Base branca e editorial.

Paleta:
- Preto: `#000000`
- Roxo: `#8200FF`
- Rosa: `#C86BFC`
- Verde: `#D4EF39`
- Gelo: `#EBF1FF`

Princípios:
- fundo branco
- preto como texto e contorno
- roxo como ação principal
- rosa e verde como acentos
- gelo como superfície secundária
- títulos condensados/editoriais
- labels menores em linguagem mono

A PP Formula não está incluída no projeto por depender de arquivo/licença própria. O CSS possui fallbacks até uma fonte oficial ser adicionada.

## Próximas versões possíveis

A V1 está considerada encerrada. Evoluções futuras podem incluir:

- Supabase Auth com contas individuais
- papéis Owner / Manager
- permissões específicas
- anexos via Supabase Storage
- trilhas de conhecimento/estudo
- banco de pessoas
- perguntas para mentorias/conversas
- evidências e highlights
- métricas por ciclo
- dashboard de evolução por período
