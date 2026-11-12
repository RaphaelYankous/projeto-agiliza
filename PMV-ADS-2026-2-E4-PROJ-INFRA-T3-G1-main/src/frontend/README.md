# 💻 Módulo Frontend (Aplicação Web)

Este diretório contém o código-fonte da aplicação Web do projeto **Agiliza** (interface responsiva construída em React com Vite).

---

## 🚀 Orientações de Desenvolvimento

Para manter a organização e a qualidade do projeto, garanta que:
1. O frontend consuma de forma dinâmica as APIs construídas no módulo [backend](../../src/backend).
2. O layout seja responsivo e reflita as escolhas de design e wireframes descritas em [docs/frontend-web.md](../../docs/frontend-web.md).
3. A estrutura de componentes e páginas siga o padrão modular adotado na pasta `src/`.

---

## 📁 Estrutura de Pastas (`src/`)

```text
src/
├── assets/          # Arquivos estáticos
├── components/      # Componentes globais e reutilizáveis
├── pages/           # Páginas da aplicação
├── styles/          # Estilos globais global.css e colors.js
├── App.tsx          # Componente raiz
└── main.tsx         # Ponto de entrada da aplicação
```

### 1. Setup do Projeto
Abra o seu terminal na pasta do frontend (onde está o arquivo `package.json`) e instale as dependências:

```bash
npm install
```
## 2. Execução (Modo de Desenvolvimento)
Para rodar a aplicação localmente em tempo de desenvolvimento:

```bash
npm run dev
```