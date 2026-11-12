# 📊 Portal de Acompanhamento e Avaliação: Kelven Rodrigues da Silva

- **Nome Completo**: Kelven Rodrigues da Silva
- **Usuário do GitHub**: `puckelvensilva`
- **Função Pretendida**: APIs Backend

---

## 📈 Histórico de Participação por Etapa

| Etapa | % Participação | Commits |
| :---: | :---: | :---: |
| Etapa 3 | `95%` | `20` |
| Etapa 2 | `82%` | `19` |
| Etapa 1 | `98%` | `24` |

---

## 🔍 Avaliação por Etapa

### 🏗️ ETAPA 3 - Etapa 3: Interface Web Responsiva
*   **Participação**: `95%` — Commits: `20`
*   **Funcionalidades em que atuou** (do total de 14 do sistema):
    - RF-011 Busca e detalhe do estabelecimento: Telas Busca, Estabelecimento, componente Chip — commit(s) `a8cddfe`, `861786f`, `bf219c9`
    - RF-012 Painel do gestor: Painel de métricas e navegação do gestor — commit(s) `63a3dfb`, `6819116`, `b6f7d96`
    - RF-002 Gestão do estabelecimento: Criar/editar estabelecimento — commit(s) `c6731fa`, `4a1ba39`
    - RF-007 Agenda (visão do gestor): Agenda da equipe — commit(s) `909ebbb`, `8a3ba52`
*   **Atividades Entregues**:
    - Estrutura inicial do projeto, estilos globais e Home (H37b) — `d81a414`.
    - Busca, detalhe, painel do gestor, criação/edição de estabelecimento (H37b/H35b) — `a8cddfe`, `63a3dfb`, `c6731fa`, `6819116`: telas extensas com `estabelecimentoService.ts` e `gestorService.ts`.
    - Agenda da equipe e seus testes (H37b/H37c) — `909ebbb`, `8a3ba52`.
    - Proposta de implantação/CI web (documental) — `6fb653c`.
*   **Atividades Pendentes/Incompletas**:
    - Contribuição em `docs/` pontual (um dos commits apenas remove uma linha); a documentação da etapa foi consolidada principalmente por colegas.
*   **Parecer do Professor**: Maior entrega de telas do grupo depois de Pedro, cobrindo busca, painel e gestão do estabelecimento, distribuída de 26/10 a 08/11. Autoria comprovada pelo histórico.

### 🏗️ ETAPA 2 - Etapa 2: APIs, Web Services e Persistência de Dados Distribuída
*   **Participação**: `82%` — Commits: `19`
*   **Funcionalidades em que atuou** (do total de 14 do sistema):
    - F4 — Estabelecimentos (com latitude/longitude): implementou CRUD e documentou — commit(s) `69ace2b`, `33ea34a`, `73ed6c1`
    - F11 — Avaliações (MongoDB): implementou CRUD e documentou — commit(s) `2252fd6`, `603fd64`
*   **Atividades Entregues**:
    - CRUD de Estabelecimentos com latitude/longitude (T2.3, H36b) — commits `69ace2b`, `33ea34a`, `b70b14f`: entidade, DTOs, controller, service e migrations.
    - CRUD de Avaliações em MongoDB (H36b/H35b) — commit `2252fd6`: schema Mongoose, controller, service e DTOs.
    - Seção 2.2 Integração e Infraestrutura Distribuída (T2.5, H35b) — commit `992e9f7`; documentação dos payloads 3.2.2 e 3.2.7 — commits `73ed6c1`, `603fd64`, `d1fb623`.
*   **Atividades Pendentes/Incompletas**:
    - T2.7 (Dockerfile e docker-compose) está marcada `Entregue`, mas não existe Dockerfile/compose no repositório e a seção 5.1 afirma que a equipe optou por execução local sem Docker: atividade não entregue.
    - T2.5 (gateway/clientes HTTP externos): a seção 2.2 é descritiva e não há implementação de gateway ou cliente externo de sua autoria; parcial.
    - Vários commits são triviais ("Hello/Goodbye", remoção de swagger e node_modules), sem valor de entrega.
*   **Parecer do Professor**: Boa entrega de código (Estabelecimentos e Avaliações/MongoDB) e documentação correspondente. A atividade de conteinerização declarada como entregue não existe, e a de integração está só em texto; o status do quadro precisa refletir a realidade. Priorizar a entrega efetiva do que foi assumido.

### 🏗️ ETAPA 1 - Etapa 1: Contexto e Planejamento da Solução Distribuída
*   **Participação**: `98%` — Commits: `24`
*   **Atividades Entregues**:
    - Definição das Tecnologias Distribuídas e Hospedagem — T1.6 (H35a) — commit `7480256`: primeira versão completa da seção 4.2, com stack de backend, frontend web, mobile, banco de dados e hospedagem, cada escolha justificada.
    - Especificação de Contratos de API — T1.7 (H36a) — commits `3cf8815`, `3b86775`, `5c89762`, `68c2d8f`, `e4b0a70`: construção incremental de todos os 11 endpoints da seção 5 (autenticação, estabelecimentos, serviços, horários, agendamentos, painel admin, histórico, erros padronizados), com payload e resposta de exemplo em cada um.
*   **Atividades Pendentes/Incompletas**:
    - Nenhuma pendência nas tarefas sob sua responsabilidade (T1.6 e T1.7).
*   **Parecer do Professor**: Duas tarefas sob sua responsabilidade, ambas entregues com profundidade técnica — os contratos de API estão bem estruturados e cobrem os principais fluxos do sistema, com padrão de erro único. Volume de commits alto mas com conteúdo real em cada um (evolução incremental dos endpoints), distribuído de forma consistente entre 26/08 e 05/09. Participação destacada na equipe.

