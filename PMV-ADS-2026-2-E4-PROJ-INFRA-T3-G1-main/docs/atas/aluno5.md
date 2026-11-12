# 📊 Portal de Acompanhamento e Avaliação: Aluno 5

- **Nome Completo**: Pedro Ivo Dias Ferreira da Silva
- **Usuário do GitHub**: `PedroD98`
- **Função Pretendida**: APIs Backend / Testes

---

## 📈 Histórico de Participação por Etapa

| Etapa | % Participação | Commits |
| :---: | :---: | :---: |
| Etapa 3 | `98%` | `42` |
| Etapa 2 | `96%` | `30` |
| Etapa 1 | `98%` | `40` |

---

## 🔍 Avaliação por Etapa

### 🏗️ ETAPA 3 - Etapa 3: Interface Web Responsiva
*   **Participação**: `98%` — Commits: `42`
*   **Funcionalidades em que atuou** (do total de 14 do sistema):
    - RF-001 Login e cadastro: Login, cadastro com foto, AuthProvider e rotas por perfil — commit(s) `0bf1aba`, `dfdb61e`, `f314c9b`
    - RF-003 Profissionais: Lista, cadastro, edição, exclusão, foto e horários — commit(s) `cafa848`, `b96bf00`, `ae00a40`, `fe0a492`
    - RF-002 Estabelecimento: Foto principal e galeria — commit(s) `f5ca688`, `178e519`, `91eb74f`
    - RF-005/RF-006 Agendamento: Escolha de serviço/profissional e grade pelo funcionamento (ajustes) — commit(s) `0337efd`, `6decf88`
    - RF-007 Agenda: Horários do profissional para o gestor, validação de horários — commit(s) `512dbdd`, `405e02a`
*   **Atividades Entregues**:
    - Login, cadastro, layout padrão, `api.ts` e gerenciamento de sessão (H37b/H35b) — `0bf1aba`, `dfdb61e`, `d838ab4`, `b9386f5`.
    - Módulo de profissionais e fotos/galeria do estabelecimento (H37b/H35b) — `cafa848`, `f5ca688`, `178e519`.
    - Suíte de testes com Vitest, Testing Library e MSW (H37c) — `b7effc5`, `37cb57b`, `5e98a4f`, `03dfb23`.
    - Revisão e consolidação do `docs/frontend-web.md` (prints, tabelas, testes) — `c6ed553`, `c69d366`.
*   **Atividades Pendentes/Incompletas**:
    - A atribuição da tela Escolha de Horários (RF-005) no quadro excede o comprovado: a tela original é de outro aluno; sua contribuição foi de ajuste.
*   **Parecer do Professor**: Maior contribuição do grupo: autenticação, módulo de profissionais, fotos, testes e documentação, distribuídos de 28/10 a 08/11. Um ponto de autoria no quadro precisa ser corrigido.

### 🏗️ ETAPA 2 - Etapa 2: APIs, Web Services e Persistência de Dados Distribuída
*   **Participação**: `96%` — Commits: `30`
*   **Funcionalidades em que atuou** (do total de 14 do sistema):
    - F1 — Autenticação, autorização e usuários (JWT/RBAC): implementou — commit(s) `8ba3954`, `9d47099`, `85042b0`
    - F13 — Testes automatizados (unitários e contrato HTTP): implementou a suíte — commit(s) `76942b9`, `a160a56`, `f98f8cc`
    - F11 — Avaliações (MongoDB): configuração inicial do MongoDB; contribuição pontual — commit(s) `1312272`
*   **Atividades Entregues**:
    - Boilerplate da API, roteamento e inicialização (T2.1, H36b) — commits `51cbd48`, `f028c89`, `d5ea45b`, `dfb2ad1`: Nest, TypeORM, i18n, timeout, logger, README do backend.
    - Autenticação JWT e RBAC (T2.4, H36b) — commits `8ba3954`, `9d47099`, `85042b0`: guards, `@Roles`, `@Public`, `@CurrentUser`, política de acesso e módulo de usuários.
    - Configuração do MongoDB (H35b) — commit `1312272`.
    - Testes automatizados (H36c/H27a) — commits `76942b9`, `a160a56`, `f98f8cc`: 513 testes unitários e 329 de contrato HTTP, com helpers e relatório de cobertura na seção 4 do documento.
    - Seções 3.1 a 3.3 da documentação — commit `d4bb833`.
*   **Atividades Pendentes/Incompletas**:
    - A seção 3.3 ainda trata o RBAC no futuro ("será implementado") e traz exemplos de `/auth/register` e `/auth/login` divergentes do código (expiresIn 3600 vs. expiração real de 600 s); atualizar.
    - Tabela 3.1 ainda tem vários responsáveis como `[Nome do Aluno]`.
*   **Parecer do Professor**: Principal contribuição técnica da equipe: base da API, segurança e a suíte de testes que cobre os módulos de todos os colegas. Participação constante ao longo de toda a etapa. Resta atualizar a documentação de segurança e preencher a tabela de endpoints.

### 🏗️ ETAPA 1 - Etapa 1: Contexto e Planejamento da Solução Distribuída
*   **Participação**: `98%` — Commits: `40`
*   **Atividades Entregues**:
    - Descrição das Personas e Mapa de Stakeholders — T1.2 (H34a) — commit `89930f8`: 5 personas completas (dono de barbearia, dona de clínica, nail designer, cabeleireiro, cliente), cada uma com perfil, frustração e uso da solução, além do mapa de stakeholders diretos/indiretos.
    - Diagrama de Componentes Físico e Lógico da Solução — T1.5 (H35a) — commits `9fc8df7`, `4b05fef`: diagrama Mermaid inicial e posterior atualização para refletir a stack final (NestJS, MySQL/MongoDB, SendGrid, OAuth).
    - Manutenção do Quadro de Contribuição Real — commits `5aacb55`, `7f7ffb8`.
*   **Atividades Pendentes/Incompletas**:
    - Nenhuma pendência nas tarefas sob sua responsabilidade (T1.2 e T1.5).
*   **Parecer do Professor**: Duas entregas de boa qualidade e coerentes entre si — as personas alimentam diretamente a justificativa do problema, e o diagrama de arquitetura foi mantido sincronizado com as decisões de tecnologia tomadas ao longo da etapa. Maior volume de commits da equipe, com atuação relevante também na integração de PRs de outros colegas; participação constante do início ao fim da etapa.

