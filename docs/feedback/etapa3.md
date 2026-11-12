# 📊 Feedback da Etapa 3: Etapa 3: Interface Web Responsiva

- **Última Avaliação**: `2026-11-10`

---

## 🌟 Pontos Fortes da Equipe
- Cobertura ampla: quase todos os 14 RFs têm tela no front-end React/Vite/TypeScript, integradas à API por serviços Axios.
- Suíte de testes automatizados (Vitest, Testing Library, MSW) e documentação com prints bem estruturada.
- Autoria de código distribuída entre os 7 alunos, com histórico de 26/10 a 08/11.

## ⚠️ Oportunidades de Melhoria
- O quadro de contribuição diverge do histórico: a tela Escolha de Horários (RF-005) é atribuída a Pedro, mas foi escrita por Letícia, que não consta no quadro; as telas do profissional (Vinícius) também não constam.
- Resgate de pontos (RF-014) não está implementado no front-end; telas de Serviços e Escolha de Horários não têm testes.
- Trabalho concentrado em 07/11 e 08/11, véspera do prazo; Pedro responde por cerca de 40% dos commits da etapa.

---

## 👥 Quadro de Participação da Equipe

| Aluno | Nome | GitHub | Commits | Funcionalidades | % Participação |
| :---: | :--- | :--- | :---: | :--- | :---: |
| Aluno 1 | João Pedro Lopes da Silva | `JoaoLopes994` | 11 | RF-011, RF-014, RF-001, RF-002 | `93%` |
| Aluno 2 | Raphael Yankous Machado Clemente | `RaphaelYankous` | 7 | RF-009, RF-013 | `95%` |
| Aluno 3 | Kelven Rodrigues da Silva | `puckelvensilva` | 20 | RF-011, RF-012, RF-002, RF-007 | `95%` |
| Aluno 4 | Leticia Beatriz da Silva | `leticiabeatrizs` | 4 | RF-005, RF-006, RF-010 | `80%` |
| Aluno 5 | Pedro Ivo Dias Ferreira da Silva | `PedroD98` | 42 | RF-001, RF-003, RF-002, RF-005/RF-006, RF-007 | `98%` |
| Aluno 6 | Vinícius Claret Nunes | `viniciusclaretnuns` | 6 | RF-007, RF-008, RF-013 | `92%` |
| Aluno 7 | Julio de Oliveira Nascimento | `xSC4Rx` | 12 | RF-004, RF-002 | `90%` |

---

## 🔍 Avaliação Individual por Atividades Entregues

### 👤 Aluno 1: João Pedro Lopes da Silva
- **🧩 Funcionalidades**: RF-011 Home do cliente; RF-014 Pontos de fidelidade; RF-001 Acesso; RF-002 Gestor (4 de 14 do sistema)
- **✔️ Entregue**: Telas Home, Perfil/Meus Dados do cliente, Perfil/Meus Dados do gestor e Recuperar/Redefinir senha (H37b); Testes das telas de gestor e de senha (H37c); Atualização da documentação da etapa (seções 2.1 e 4.1)
- **❌ Pendente/Incompleto**: Resgate de pontos (RF-014) não implementado no front-end.
- **Parecer**: Implementou Home, perfil do cliente, telas do gestor e o fluxo de recuperação de senha, com testes, em quatro momentos distintos (31/10 a 08/11). Participação consistente; falta o fluxo de resgate de pontos.

---

### 👤 Aluno 2: Raphael Yankous Machado Clemente
- **🧩 Funcionalidades**: RF-009 Cancelamento de agendamento; RF-013 Avaliações (2 de 14 do sistema)
- **✔️ Entregue**: Meus Agendamentos (H37b); Avaliar atendimento e componentes `SeletorEstrelas`/`AnexoFoto` (H37b); Serviços `agendamentosService.ts` e `avaliacoesService.ts` (H35b) com testes e prints atualizados
- **❌ Pendente/Incompleto**: Nenhuma pendência relevante no escopo declarado.
- **Parecer**: Implementou RF-009 e RF-013 de ponta a ponta, com componentes reutilizáveis, serviços e testes, concentrados em 07/11 e 08/11. Declarado e comprovado coincidem.

---

### 👤 Aluno 3: Kelven Rodrigues da Silva
- **🧩 Funcionalidades**: RF-011 Busca e detalhe do estabelecimento; RF-012 Painel do gestor; RF-002 Gestão do estabelecimento; RF-007 Agenda (visão do gestor) (4 de 14 do sistema)
- **✔️ Entregue**: Estrutura inicial do projeto, estilos globais e Home (H37b); Busca, detalhe, painel do gestor, criação/edição de estabelecimento (H37b/H35b); Agenda da equipe e seus testes (H37b/H37c); Proposta de implantação/CI web (documental)
- **❌ Pendente/Incompleto**: Contribuição em `docs/` pontual (um dos commits apenas remove uma linha); a documentação da etapa foi consolidada principalmente por colegas.
- **Parecer**: Maior entrega de telas do grupo depois de Pedro, cobrindo busca, painel e gestão do estabelecimento, distribuída de 26/10 a 08/11. Autoria comprovada pelo histórico.

---

### 👤 Aluno 4: Leticia Beatriz da Silva
- **🧩 Funcionalidades**: RF-005 Horários livres; RF-006 Agendamento pelo cliente; RF-010 Notificações (3 de 14 do sistema)
- **✔️ Entregue**: Tela Escolha de Horários, fluxo de agendamento e notificações (H37b/H35b)
- **❌ Pendente/Incompleto**: Não consta no Quadro de Contribuição da Etapa 3 nem na documentação da etapa; a tela Escolha de Horários (RF-005) está atribuída a outro aluno no documento. Sem testes próprios; trabalho de front-end concentrado em um único commit (07/11).
- **Parecer**: Entregou código substancial do fluxo de agendamento em um único commit, sem registro no quadro e sem testes. Registrar a contribuição no documento da etapa e distribuir o trabalho ao longo do período.

---

### 👤 Aluno 5: Pedro Ivo Dias Ferreira da Silva
- **🧩 Funcionalidades**: RF-001 Login e cadastro; RF-003 Profissionais; RF-002 Estabelecimento; RF-005/RF-006 Agendamento; RF-007 Agenda (5 de 14 do sistema)
- **✔️ Entregue**: Login, cadastro, layout padrão, `api.ts` e gerenciamento de sessão (H37b/H35b); Módulo de profissionais e fotos/galeria do estabelecimento (H37b/H35b); Suíte de testes com Vitest, Testing Library e MSW (H37c); Revisão e consolidação do `docs/frontend-web.md` (prints, tabelas, testes)
- **❌ Pendente/Incompleto**: A atribuição da tela Escolha de Horários (RF-005) no quadro excede o comprovado: a tela original é de outro aluno; sua contribuição foi de ajuste.
- **Parecer**: Maior contribuição do grupo: autenticação, módulo de profissionais, fotos, testes e documentação, distribuídos de 28/10 a 08/11. Um ponto de autoria no quadro precisa ser corrigido.

---

### 👤 Aluno 6: Vinícius Claret Nunes
- **🧩 Funcionalidades**: RF-007 Agenda do profissional; RF-008 Bloqueios de agenda; RF-013 Avaliações (leitura) (3 de 14 do sistema)
- **✔️ Entregue**: Agenda do profissional, Bloqueios e Perfil profissional (H37b); Ajuste de mocks de testes; Registro de tarefas no quadro de contribuição
- **❌ Pendente/Incompleto**: As telas de agenda/bloqueios/perfil não estão no Quadro da Etapa 3 do `frontend-web.md` (consta só o serviço de API). Sem commits de código entre 04/11 e 08/11, apenas ajuste de teste e vídeo.
- **Parecer**: Implementou as telas do profissional (RF-007, RF-008) em dois dias de trabalho e corrigiu pontos de revisão. Falta registrar essas telas no quadro correto e ampliar os testes.

---

### 👤 Aluno 7: Julio de Oliveira Nascimento
- **🧩 Funcionalidades**: RF-004 Serviços; RF-002 Estabelecimento (serviços ofertados) (2 de 14 do sistema)
- **✔️ Entregue**: Telas de Serviços (home, cadastro, edição, exclusão) e `servicosService.ts` (H37b/H35b); Documentação das telas com prints e endpoints (seção 2.1); Proteção de rotas de serviços no backend
- **❌ Pendente/Incompleto**: Sem testes automatizados para as telas de Serviços. Atuação limitada a um RF no front-end, abaixo da cota justa.
- **Parecer**: Implementou RF-004 completo com serviço de API e documentação com prints, em 02/11, 07/11 e 08/11. Cobertura menor que a cota justa (um RF) e sem testes.
