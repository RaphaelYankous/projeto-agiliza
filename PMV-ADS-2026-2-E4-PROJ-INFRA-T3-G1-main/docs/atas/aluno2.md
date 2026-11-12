# 📊 Portal de Acompanhamento e Avaliação: Aluno 2

- **Nome Completo**: Raphael Yankous Machado Clemente
- **Usuário do GitHub**: `RaphaelYankous`
- **Função Pretendida**: Designer / Frontend Web / Testes

---

## 📈 Histórico de Participação por Etapa

| Etapa | % Participação | Commits |
| :---: | :---: | :---: |
| Etapa 3 | `95%` | `7` |
| Etapa 2 | `92%` | `13` |
| Etapa 1 | `97%` | `8` |

---

## 🔍 Avaliação por Etapa

### 🏗️ ETAPA 3 - Etapa 3: Interface Web Responsiva
*   **Participação**: `95%` — Commits: `7`
*   **Funcionalidades em que atuou** (do total de 14 do sistema):
    - RF-009 Cancelamento de agendamento: Tela Meus Agendamentos com abas e cancelamento — commit(s) `7b46748`, `2177409`
    - RF-013 Avaliações: Tela Avaliar atendimento (nota, comentário, foto, bloqueio de repetição) — commit(s) `6abc410`, `66e8724`
*   **Atividades Entregues**:
    - Meus Agendamentos (H37b) — `7b46748`, `2177409`: lista Próximos/Histórico e cancelamento.
    - Avaliar atendimento e componentes `SeletorEstrelas`/`AnexoFoto` (H37b) — `6abc410`, `66e8724`: ~930 linhas autorais.
    - Serviços `agendamentosService.ts` e `avaliacoesService.ts` (H35b) com testes e prints atualizados — `66e8724`.
*   **Atividades Pendentes/Incompletas**:
    - Nenhuma pendência relevante no escopo declarado.
*   **Parecer do Professor**: Implementou RF-009 e RF-013 de ponta a ponta, com componentes reutilizáveis, serviços e testes, concentrados em 07/11 e 08/11. Declarado e comprovado coincidem.

### 🏗️ ETAPA 2 - Etapa 2: APIs, Web Services e Persistência de Dados Distribuída
*   **Participação**: `92%` — Commits: `13`
*   **Funcionalidades em que atuou** (do total de 14 do sistema):
    - F12 — Modelagem e persistência (DER, schema, migrations): modelou e documentou — commit(s) `cda708b`, `864bac8`, `cfba4b2`
    - F8 — Agendamentos (criação, conflito, cancelamento): implementou — commit(s) `315dff8`, `47a55a3`, `08d45ba`
    - F9 — Notificações por e-mail: implementou módulo e templates — commit(s) `99e31b8`, `7793c86`
*   **Atividades Entregues**:
    - Modelagem e persistência, DER e schema (T2.2, H36b/H35b) — commits `cda708b`, `864bac8`, `c8f9bba`: DER Mermaid completo, descrição das tabelas e decisões de modelagem (UUID, double booking, fidelidade, MongoDB), correspondendo ao código.
    - Migrations e alinhamento de entidades — commits `cfba4b2`, `3a69bb7`, `11c5193`: migration de alinhamento ao schema e entidade/tabela de agendamentos.
    - Core de Agendamentos (H36b) — commits `315dff8`, `47a55a3`, `08d45ba`, `7793c86`: criação, verificação de disponibilidade e bloqueios, conflito 409, cancelamento.
    - Módulo de e-mail transacional (H35b) — commits `99e31b8`, `7793c86`: templates e envio em criação/cancelamento.
*   **Atividades Pendentes/Incompletas**:
    - Não há testes de sua autoria para os módulos de Agendamentos e e-mail (os testes foram feitos por colegas).
    - A documentação da seção 3.2.6 (Agendamentos) merece revisão final de consistência com o código atual.
*   **Parecer do Professor**: Contribuição forte e bem distribuída entre modelagem, regra de negócio central (agendamentos) e integração de e-mail, com documentação aderente ao código. Participação constante de 01/10 a 10/10. Seguir a mesma linha, acrescentando testes para os módulos de sua autoria.

### 🏗️ ETAPA 1 - Etapa 1: Contexto e Planejamento da Solução Distribuída
*   **Participação**: `97%` — Commits: `8`
*   **Atividades Entregues**:
    - Catálogo de Serviços Web e Acordos de SLA — T1.4 (H34a) — commit `90c4028`: texto de fundamentação da arquitetura distribuída (desacoplamento, RBAC, prevenção de double booking) e tabela de SLA cobrindo os 7 serviços de TI do sistema, cada um com canal, SLA e responsável.
    - Conteúdo textual da Seção 6 (Projeto do Frontend Web), fora de sua responsabilidade oficial (T1.8 é de Vinícius) — commit `5fb9143`: objetivo, perfis de uso, funcionalidades do site e a relação completa das 14 telas (6.1), com componentes e ações principais por tela.
    - Revisão geral do documento — commit `67d0144` ("Revisão feita!").
*   **Atividades Pendentes/Incompletas**:
    - Nenhuma pendência na tarefa sob sua responsabilidade (T1.4).
*   **Parecer do Professor**: Entregou com qualidade sua tarefa oficial (catálogo de serviços e SLA) e ainda assumiu a redação de toda a parte textual do frontend web, que oficialmente seria de outro colega — colaboração que fortaleceu a entrega da equipe. Commits espaçados entre o final de agosto e o início de setembro, mostrando envolvimento contínuo.

