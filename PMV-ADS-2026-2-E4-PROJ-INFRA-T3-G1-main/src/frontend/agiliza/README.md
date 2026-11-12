# Agiliza: front web

Aplicação web do Agiliza, feita em React 19, TypeScript e Vite. Ela consome a API do backend em `src/backend/agiliza-api`.

## Requisitos

- Node.js 20 ou superior, com npm.
- Backend rodando, por padrão em `http://localhost:3000`. As instruções estão em `src/backend/README.md`.

## Como rodar

```bash
npm install
npm run dev
```

A aplicação abre em `http://localhost:5173`.

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento com recarga automática |
| `npm run build` | Checa os tipos e gera a versão de produção em `dist/` |
| `npm run lint` | Verifica o padrão de código (ESLint) |
| `npm run preview` | Serve localmente o conteúdo de `dist/` |
| `npm test` | Roda os testes uma vez (Vitest) |
| `npm run test:watch` | Roda os testes de novo a cada alteração |
| `npm run test:coverage` | Roda os testes e gera o relatório de cobertura em `coverage/` |

## Testes

Os testes usam Vitest, React Testing Library e MSW, que simula as respostas da API. Não é preciso subir o backend. Cada teste fica ao lado do arquivo testado, com o sufixo `.spec.tsx`, e os utilitários compartilhados ficam em `src/test/`. Um teste que chama uma rota da API sem resposta simulada falha e mostra qual rota faltou.

Veja a estratégia completa na seção 4 de `docs/frontend-web.md`.

## Endereço da API

O front lê o endereço da API da variável `VITE_API_URL`. Sem ela, usa `http://localhost:3000/api`.

Para usar outro endereço, copie o `.env.example` para `.env.local` e ajuste o valor:

```bash
cp .env.example .env.local
```

O `.env.local` não vai para o git. O backend também precisa aceitar a origem do front: veja `CORS_ORIGIN` no README do backend.

## Melhorias futuras

- Transição suave ao abrir e recolher o painel lateral pelo botão de menu (☰). Hoje ele aparece e some sem animação. Antes de implementar, avaliar se só transições CSS resolvem ou se compensa uma biblioteca de animação.
