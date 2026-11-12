# 📊 Portal de Acompanhamento e Avaliação: Aluno 7

- **Nome Completo**: Julio de Oliveira Nascimento
- **Usuário do GitHub**: `xSC4Rx`
- **Função Pretendida**: APIs Backend / Frontend Mobile

---

## 📈 Histórico de Participação por Etapa

| Etapa | % Participação | Commits |
| :---: | :---: | :---: |
| Etapa 3 | `90%` | `12` |
| Etapa 2 | `87%` | `11` |
| Etapa 1 | `73%` | `8` |

---

## 🔍 Avaliação por Etapa

### 🏗️ ETAPA 3 - Etapa 3: Interface Web Responsiva
*   **Participação**: `90%` — Commits: `12`
*   **Funcionalidades em que atuou** (do total de 14 do sistema):
    - RF-004 Serviços: Cadastro, listagem em cards, edição e exclusão — commit(s) `8f0051e`, `9e72fa2`, `35d0457`
    - RF-002 Estabelecimento (serviços ofertados): Seleção de estabelecimento nas telas de serviços — commit(s) `8f0051e`
*   **Atividades Entregues**:
    - Telas de Serviços (home, cadastro, edição, exclusão) e `servicosService.ts` (H37b/H35b) — `8f0051e`, `9e72fa2`, `35d0457`: ~1.360 linhas.
    - Documentação das telas com prints e endpoints (seção 2.1) — `c20314c`, `0fd2879`.
    - Proteção de rotas de serviços no backend — `1cd581f`.
*   **Atividades Pendentes/Incompletas**:
    - Sem testes automatizados para as telas de Serviços.
    - Atuação limitada a um RF no front-end, abaixo da cota justa.
*   **Parecer do Professor**: Implementou RF-004 completo com serviço de API e documentação com prints, em 02/11, 07/11 e 08/11. Cobertura menor que a cota justa (um RF) e sem testes.

### 🏗️ ETAPA 2 - Etapa 2: APIs, Web Services e Persistência de Dados Distribuída
*   **Participação**: `87%` — Commits: `11`
*   **Funcionalidades em que atuou** (do total de 14 do sistema):
    - F2 — Clientes: implementou CRUD e documentou — commit(s) `a9146bf`, `50ef88f`, `b959d2a`
    - F6 — Serviços: implementou CRUD e documentou — commit(s) `79c86c6`, `71ed572`
    - F13 — Testes automatizados: testes de Clientes e Serviços; contribuição pontual — commit(s) `b959d2a`, `71ed572`
*   **Atividades Entregues**:
    - CRUD de Clientes ligado a Usuários (H36b) — commits `a9146bf`, `50ef88f`, `6826af3`: cadastro transacional (QueryRunner), hash bcrypt, foto em base64, migration.
    - CRUD de Serviços (H36b) — commit `79c86c6`: entidade, DTOs, controller, service e migration.
    - Testes unitários de Clientes e Serviços (H36c/H27a) — commits `b959d2a`, `71ed572`: 12 testes no service e 6 no controller de Serviços, mais testes do service de Clientes.
    - Documentação 3.2.4 e 3.2.5 e escopo do backend (H36a) — commits `71ed572`, `b959d2a`, `2e3cd62`: rotas, payloads, observações de autorização e pendências conhecidas, de forma honesta e detalhada.
*   **Atividades Pendentes/Incompletas**:
    - Seus módulos não constam no Quadro de Contribuição Real; registrar as atividades.
    - As pendências que você mesmo documentou (estabelecimentoId obrigatório no corpo, DELETE com 500, mensagens em inglês) ainda não foram corrigidas.
*   **Parecer do Professor**: Entrega completa e de qualidade: dois CRUDs, testes e documentação detalhada com crítica técnica honesta. Atividades fora do quadro oficial, o que dificulta o acompanhamento. Corrija as pendências que mapeou na próxima rodada.

### 🏗️ ETAPA 1 - Etapa 1: Contexto e Planejamento da Solução Distribuída
*   **Participação**: `73%` — Commits: `8`
*   **Atividades Entregues (parcial)**:
    - Definição de Requisitos Funcionais e Não Funcionais — T1.3 (H34a) — commit `285b354`: as 14 linhas de RF e as 6 de RNF foram escritas por completo, cobrindo os principais fluxos do sistema (cadastro, agendamento, cancelamento, geolocalização, fidelidade).
*   **Atividades Pendentes/Incompletas**:
    - **RF-009 e RF-010 estão com a mesma descrição** ("O sistema deve permitir o cancelamento de agendamentos...") em canais diferentes (API/Backend vs. Web) — falta diferenciar o que muda entre eles, ou eliminar a duplicidade.
    - **RNF-001 e RNF-002 têm o texto idêntico** (sobre bibliotecas de mapas leves) mas estão em categorias diferentes (Disponibilidade e Desempenho) — parece erro de cópia; nenhum dos dois textos, do jeito que está, descreve de fato uma característica de desempenho ou disponibilidade.
    - **RNF-003 (RBAC) e RNF-006 (criptografia de credenciais) estão classificados como "Disponibilidade" e "Desempenho"**, quando na verdade são requisitos de **Segurança** — vale corrigir a coluna "Categoria" desses dois itens.
*   **Parecer do Professor**: A tarefa foi entregue e cobre um volume relevante de requisitos, mas com inconsistências que reduzem sua qualidade: duas duplicidades de texto entre requisitos diferentes e duas classificações de categoria de RNF que não correspondem ao que o requisito realmente descreve. Vale revisar a tabela de requisitos com atenção a esses pontos. Participação registrada em poucos commits de conteúdo, mas presentes em momentos distintos da etapa.

