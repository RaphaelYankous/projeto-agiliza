# 📊 Feedback da Etapa 2: Etapa 2: APIs, Web Services e Persistência de Dados Distribuída

- **Última Avaliação**: `2026-10-21`

---

## 🌟 Pontos Fortes da Equipe
- API NestJS bastante completa e funcional: autenticação JWT/RBAC, usuários, clientes, admins, estabelecimentos, profissionais, serviços, agenda, agendamentos, fidelidade, avaliações (MongoDB) e e-mail.
- Modelagem de dados bem documentada (DER, descrição das tabelas e decisões como prevenção de double booking e fidelidade), aderente ao código e às migrations.
- Suíte de testes expressiva (513 unitários e 329 de contrato HTTP, 100% de linhas nos services) com relatório de cobertura documentado.
- Todos os integrantes entregaram código ou documentação evidenciados por commits, com boa divisão de módulos.

## ⚠️ Oportunidades de Melhoria
- T2.7 (Dockerfile/docker-compose) consta como `Entregue`, mas não existe no repositório e a seção 5.1 diz que não há Docker; ajustar o quadro ou entregar a atividade.
- T2.6 (testes) está atribuída a João, mas os testes foram commitados por Pedro e Leticia; o quadro não reflete a autoria real. Leticia, Julio e Vinícius (Admins/Fidelidade, Clientes/Serviços, Profissionais) entregaram módulos que nem aparecem no quadro.
- Documentação desatualizada em partes: seção 3.3 trata RBAC como futuro e traz expiração/exemplos de auth divergentes do código; seção 3.2.3 (Profissionais) com exemplos fora do contrato real; tabela 3.1 com vários `[Nome do Aluno]`.
- Gateway/integração de serviços externos (T2.5) está apenas descrito; testes de integração com banco real seguem pendentes; pendências já mapeadas na seção 3.2.4 não foram corrigidas.

---

## 👥 Quadro de Participação da Equipe

| Aluno | Nome | GitHub | Commits | Funcionalidades | % Participação |
| :---: | :--- | :--- | :---: | :--- | :---: |
| 1 | João Pedro Lopes da Silva | `JoaoLopes994` | 6 | F7, F13 (2 de 14) | 70% |
| 2 | Raphael Yankous Machado Clemente | `RaphaelYankous` | 13 | F12, F8, F9 (3 de 14) | 92% |
| 3 | Kelven Rodrigues da Silva | `puckelvensilva` | 19 | F4, F11 (2 de 14) | 82% |
| 4 | Leticia Beatriz da Silva | `leticiabeatrizs` | 7 | F3, F10 (2 de 14) | 72% |
| 5 | Pedro Ivo Dias Ferreira da Silva | `PedroD98` | 30 | F1, F13, F11 (3 de 14) | 96% |
| 6 | Vinícius Claret Nunes | `viniciusclaretnuns` | 7 | F5, F14 (2 de 14) | 74% |
| 7 | Julio de Oliveira Nascimento | `xSC4Rx` | 11 | F2, F6, F13 (3 de 14) | 87% |

*Commits (sem merges) são apenas informativos; a participação decorre do conteúdo entregue.*

---

## 🔍 Avaliação Individual por Atividades Entregues

### 👤 Aluno 1: João Pedro Lopes da Silva
- **🧩 Funcionalidades**: F7 — Agenda de profissionais (disponibilidade e bloqueios); F13 — Testes automatizados (2 de 14 do sistema)
- **✔️ Entregue**: Módulo de Agenda: disponibilidades semanais, bloqueios e cálculo de horários livres (H36b); Documentação dos endpoints de Agenda, seção 3.2.8 (H36a); Estratégia de testes automatizados, seção 4 (H36c)
- **❌ Pendente/Incompleto**: T2.6 (Desenvolvimento de testes automatizados) consta no quadro como de sua responsabilidade, mas os arquivos de teste (inclusive os da Agenda) foram commitados por Pedro e Leticia; não há commit seu em `*.spec.ts`/`*.e2e-spec.ts`. | O status `Entregue` declarado no quadro para T2.6 não corresponde à autoria real.
- **Parecer**: Entrega consistente em código (Agenda) e em documentação (3.2.8 e estratégia de testes), com boa qualidade técnica. Porém a tarefa de testes que lhe foi atribuída não tem commit seu: a autoria dos testes é de colegas. Para as próximas etapas, entregue os testes do módulo que você desenvolveu.

---

### 👤 Aluno 2: Raphael Yankous Machado Clemente
- **🧩 Funcionalidades**: F12 — Modelagem e persistência (DER, schema, migrations); F8 — Agendamentos (criação, conflito, cancelamento); F9 — Notificações por e-mail (3 de 14 do sistema)
- **✔️ Entregue**: Modelagem e persistência, DER e schema (T2.2, H36b/H35b); Migrations e alinhamento de entidades; Core de Agendamentos (H36b); Módulo de e-mail transacional (H35b)
- **❌ Pendente/Incompleto**: Não há testes de sua autoria para os módulos de Agendamentos e e-mail (os testes foram feitos por colegas). | A documentação da seção 3.2.6 (Agendamentos) merece revisão final de consistência com o código atual.
- **Parecer**: Contribuição forte e bem distribuída entre modelagem, regra de negócio central (agendamentos) e integração de e-mail, com documentação aderente ao código. Participação constante de 01/10 a 10/10. Seguir a mesma linha, acrescentando testes para os módulos de sua autoria.

---

### 👤 Aluno 3: Kelven Rodrigues da Silva
- **🧩 Funcionalidades**: F4 — Estabelecimentos (com latitude/longitude); F11 — Avaliações (MongoDB) (2 de 14 do sistema)
- **✔️ Entregue**: CRUD de Estabelecimentos com latitude/longitude (T2.3, H36b); CRUD de Avaliações em MongoDB (H36b/H35b); Seção 2.2 Integração e Infraestrutura Distribuída (T2.5, H35b)
- **❌ Pendente/Incompleto**: T2.7 (Dockerfile e docker-compose) está marcada `Entregue`, mas não existe Dockerfile/compose no repositório e a seção 5.1 afirma que a equipe optou por execução local sem Docker: atividade não entregue. | T2.5 (gateway/clientes HTTP externos): a seção 2.2 é descritiva e não há implementação de gateway ou cliente externo de sua autoria; parcial. | Vários commits são triviais ("Hello/Goodbye", remoção de swagger e node_modules), sem valor de entrega.
- **Parecer**: Boa entrega de código (Estabelecimentos e Avaliações/MongoDB) e documentação correspondente. A atividade de conteinerização declarada como entregue não existe, e a de integração está só em texto; o status do quadro precisa refletir a realidade. Priorizar a entrega efetiva do que foi assumido.

---

### 👤 Aluno 4: Leticia Beatriz da Silva
- **🧩 Funcionalidades**: F3 — Administradores; F10 — Fidelidade (2 de 14 do sistema)
- **✔️ Entregue**: CRUD de Administradores (H36b); Fluxo de fidelidade (H36b/H35b); Testes do fluxo de fidelidade (H36c)
- **❌ Pendente/Incompleto**: Sua participação não consta no Quadro de Contribuição Real (admins e fidelidade não têm linha atribuída); registrar as atividades no quadro. | Documentação própria dos módulos Admin e Fidelidade (rotas, payloads) é mínima ou ausente.
- **Parecer**: Entrega técnica relevante e correta (admins e fidelidade, com testes), mas com pouca documentação e sem registro no quadro de contribuição. Poucos commits, porém substanciais. Documente os endpoints de Administradores e o fluxo de fidelidade na próxima rodada.

---

### 👤 Aluno 5: Pedro Ivo Dias Ferreira da Silva
- **🧩 Funcionalidades**: F1 — Autenticação, autorização e usuários (JWT/RBAC); F13 — Testes automatizados (unitários e contrato HTTP); F11 — Avaliações (MongoDB) (3 de 14 do sistema)
- **✔️ Entregue**: Boilerplate da API, roteamento e inicialização (T2.1, H36b); Autenticação JWT e RBAC (T2.4, H36b); Configuração do MongoDB (H35b); Testes automatizados (H36c/H27a); Seções 3.1 a 3.3 da documentação
- **❌ Pendente/Incompleto**: A seção 3.3 ainda trata o RBAC no futuro ("será implementado") e traz exemplos de `/auth/register` e `/auth/login` divergentes do código (expiresIn 3600 vs. expiração real de 600 s); atualizar. | Tabela 3.1 ainda tem vários responsáveis como `[Nome do Aluno]`.
- **Parecer**: Principal contribuição técnica da equipe: base da API, segurança e a suíte de testes que cobre os módulos de todos os colegas. Participação constante ao longo de toda a etapa. Resta atualizar a documentação de segurança e preencher a tabela de endpoints.

---

### 👤 Aluno 6: Vinícius Claret Nunes
- **🧩 Funcionalidades**: F5 — Profissionais; F14 — Proposta de implantação e CI/CD (2 de 14 do sistema)
- **✔️ Entregue**: Proposta de implantação e CI/CD (T2.8, H35c/H36c); CRUD de Profissionais (H36b)
- **❌ Pendente/Incompleto**: A documentação da seção 3.2.3 (Profissionais) segue com exemplos fora do código real (IDs numéricos, snake_case, campos embutidos) e a tabela 3.1 lista seus endpoints como `[Nome do Aluno]`. | O CRUD de Profissionais não consta no quadro de contribuição, e não há testes de sua autoria para ele. | Parte dos commits é de vídeo/quadro (valor baixo).
- **Parecer**: Entrega correta na proposta de infraestrutura/CI/CD e no CRUD de profissionais, ambos com conteúdo autoral. Falta alinhar a documentação dos endpoints ao código e registrar a atividade no quadro. Evolua para testes e documentação do módulo que desenvolveu.

---

### 👤 Aluno 7: Julio de Oliveira Nascimento
- **🧩 Funcionalidades**: F2 — Clientes; F6 — Serviços; F13 — Testes automatizados (3 de 14 do sistema)
- **✔️ Entregue**: CRUD de Clientes ligado a Usuários (H36b); CRUD de Serviços (H36b); Testes unitários de Clientes e Serviços (H36c/H27a); Documentação 3.2.4 e 3.2.5 e escopo do backend (H36a)
- **❌ Pendente/Incompleto**: Seus módulos não constam no Quadro de Contribuição Real; registrar as atividades. | As pendências que você mesmo documentou (estabelecimentoId obrigatório no corpo, DELETE com 500, mensagens em inglês) ainda não foram corrigidas.
- **Parecer**: Entrega completa e de qualidade: dois CRUDs, testes e documentação detalhada com crítica técnica honesta. Atividades fora do quadro oficial, o que dificulta o acompanhamento. Corrija as pendências que mapeou na próxima rodada.
