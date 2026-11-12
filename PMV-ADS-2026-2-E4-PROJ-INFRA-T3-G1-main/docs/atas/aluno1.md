# 📊 Portal de Acompanhamento e Avaliação: Aluno 1

- **Nome Completo**: João Pedro Lopes da Silva
- **Usuário do GitHub**: `JoaoLopes994`
- **Função Pretendida**: Estruturas de Dados / APIs Backend / DB / DevOps

---

## 📈 Histórico de Participação por Etapa

| Etapa | % Participação | Commits |
| :---: | :---: | :---: |
| Etapa 3 | `93%` | `11` |
| Etapa 2 | `70%` | `6` |
| Etapa 1 | `97%` | `16` |

---

## 🔍 Avaliação por Etapa

### 🏗️ ETAPA 3 - Etapa 3: Interface Web Responsiva
*   **Participação**: `93%` — Commits: `11`
*   **Funcionalidades em que atuou** (do total de 14 do sistema):
    - RF-011 Home do cliente: Home com vitrine e geolocalização — commit(s) `a229a17`
    - RF-014 Pontos de fidelidade: Perfil do cliente e Meus Dados (exibição de pontos; resgate não implementado) — commit(s) `ce80090`, `e4c56e0`
    - RF-001 Acesso: Recuperação e redefinição de senha, ajuste no Login — commit(s) `a79afca`, `f6e5901`
    - RF-002 Gestor: Perfil e Meus Dados do gestor — commit(s) `f39b7dd`
*   **Atividades Entregues**:
    - Telas Home, Perfil/Meus Dados do cliente, Perfil/Meus Dados do gestor e Recuperar/Redefinir senha (H37b) — `a229a17`, `ce80090`, `e4c56e0`, `f39b7dd`, `a79afca`: código funcional integrado à API (`perfilClienteService.ts`, `gestorService.ts`, `authService.ts`).
    - Testes das telas de gestor e de senha (H37c) — `f39b7dd`, `16c45b0`: specs com Vitest e Testing Library.
    - Atualização da documentação da etapa (seções 2.1 e 4.1) — `16c45b0`.
*   **Atividades Pendentes/Incompletas**:
    - Resgate de pontos (RF-014) não implementado no front-end.
*   **Parecer do Professor**: Implementou Home, perfil do cliente, telas do gestor e o fluxo de recuperação de senha, com testes, em quatro momentos distintos (31/10 a 08/11). Participação consistente; falta o fluxo de resgate de pontos.

### 🏗️ ETAPA 2 - Etapa 2: APIs, Web Services e Persistência de Dados Distribuída
*   **Participação**: `70%` — Commits: `6`
*   **Funcionalidades em que atuou** (do total de 14 do sistema):
    - F7 — Agenda de profissionais (disponibilidade e bloqueios): implementou módulo e documentou — commit(s) `01af7e9`, `e3699a5`
    - F13 — Testes automatizados: definiu a estratégia (seção 4); contribuição pontual — commit(s) `e1948a0`
*   **Atividades Entregues**:
    - Módulo de Agenda: disponibilidades semanais, bloqueios e cálculo de horários livres (H36b) — commit `01af7e9`: controller, service, DTOs, entidades e migration `CreateAgenda`.
    - Documentação dos endpoints de Agenda, seção 3.2.8 (H36a) — commits `e3699a5`, `819d9fa`: cerca de 270 linhas com rotas, payloads e erros.
    - Estratégia de testes automatizados, seção 4 (H36c) — commit `e1948a0`: pirâmide de testes, padrões e critérios de priorização.
*   **Atividades Pendentes/Incompletas**:
    - T2.6 (Desenvolvimento de testes automatizados) consta no quadro como de sua responsabilidade, mas os arquivos de teste (inclusive os da Agenda) foram commitados por Pedro e Leticia; não há commit seu em `*.spec.ts`/`*.e2e-spec.ts`.
    - O status `Entregue` declarado no quadro para T2.6 não corresponde à autoria real.
*   **Parecer do Professor**: Entrega consistente em código (Agenda) e em documentação (3.2.8 e estratégia de testes), com boa qualidade técnica. Porém a tarefa de testes que lhe foi atribuída não tem commit seu: a autoria dos testes é de colegas. Para as próximas etapas, entregue os testes do módulo que você desenvolveu.

### 🏗️ ETAPA 1 - Etapa 1: Contexto e Planejamento da Solução Distribuída
*   **Participação**: `97%` — Commits: `16`
*   **Atividades Entregues**:
    - Definição do Problema, Objetivos e Justificativa — T1.1 (H34a) — commit `3e85c87`: seção 1.1 escrita do zero, com problema delimitado com clareza (gestão manual de agenda em barbearias/salões), objetivo geral específico e objetivos críticos coerentes, e justificativa com dados de mercado (Sebrae).
    - Refinamento de "Tecnologias e Hospedagem" (T1.6, fora de sua responsabilidade oficial) — commits `dfc793b`, `e3b09cb`: atualizou a stack (Express→NestJS, Postgres/Redis→MySQL/MongoDB) para manter coerência com o diagrama de arquitetura, e adicionou os blocos de Autenticação/OAuth e SendGrid.
    - Ajustes de formatação gerais no documento — commit `8b1071b`.
*   **Atividades Pendentes/Incompletas**:
    - Nenhuma pendência na tarefa sob sua responsabilidade (T1.1).
*   **Parecer do Professor**: Entrega sólida e bem escrita na sua tarefa principal, com problema e objetivo claramente delimitados e justificados com dados concretos. Participação que vai além do escopo formal, contribuindo ativamente para manter a seção de tecnologias coerente com o diagrama de arquitetura. Commits distribuídos em mais de uma sessão, sem sinal de concentração de última hora.

