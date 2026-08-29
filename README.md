# 🌾 BR-CO AgroAdrian - Nutrição de Precisão e Planejamento Zootécnico

<p align="center">
  <img src="https://img.shields.io/badge/React-18.x-61dafb?style=for-the-badge&logo=react&logoColor=black" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178c6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.x-38bdf8?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/PWA-Offline_First-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA" />
  <img src="https://img.shields.io/badge/Vite-Build_Tool-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
</p>

O **BR-CO AgroAdrian** é uma plataforma progressiva (PWA) de formulação de dietas de custo mínimo, auditoria nutricional e planejamento estratégico de confinamento para pequenos e médios ruminantes (ovinos e caprinos de corte e leite).

O sistema implementa equações biomatemáticas do **BR-COR (2024)**, diretrizes de exigências nutricionais e programação linear simplex para transformar o manejo nutricional em resultados zootécnicos e financeiros previsíveis.

---

## 🎯 Principais Funcionalidades

### 🧬 1. Motores Biológicos de Precisão (BR-COR 2024)
- **Cálculo de Exigências:** Determinação precisa de Consumo de Matéria Seca (CMS), NDT, Proteína Bruta (PB), Cálcio (Ca), Fósforo (P), Fibra em Detergente Neutro (FDN), Extrato Etéreo (EE) e Cobre (Cu).
- **Módulos Dedicados por Espécie e Categoria:**
  - Ovinos Unificados (Crescimento e Reprodução).
  - Caprinos de Corte.
  - Caprinos de Leite (Curvas de lactação e composição do leite).
- **Prioridade Reprodutiva:** Ajuste metabólico automático para fêmeas gestantes e lactantes.

### ⚡ 2. Otimizador de Custo Mínimo (Simplex Solver)
- Formulação instantânea da dieta de menor custo financeiro.
- **Travas Ruminatórias e Biológicas de Segurança:**
  - Trava máxima de NNP (Ureia) para prevenção de toxemia.
  - Inclusão mínima de suplemento mineral.
  - Trava de Cobre para ovinos (prevenção de intoxicação crônica acumulativa).
  - Limite de Extrato Etéreo (EE) para integridade da fermentação ruminal.

### 📈 3. Planejador Estratégico de Confinamento (Planning)
- **Faseamento Automático:** Escalonamento da safra em fases (Adaptação, Crescimento e Terminação).
- **Viabilidade Econômica:** Custo total por cabeça, custo da @ produzida e custo por kg de ganho de peso.
- **Lista de Compras (Estoque MN):** Conversão automática de Matéria Seca (MS) para Matéria Natural (MN) com previsão de compras e participação percentual de cada ingrediente no orçamento.

### 📄 4. Dossiê de Safra e Laudo Técnico em PDF
- Geração instantânea de laudos técnicos e relatórios de planejamento em formato A4 Paisagem/Retrato.
- Prova científica com tabelas de **Oferta vs. Meta** e proporções de bateia para o tratador.
- Arquitetura de impressão robusta, imune a travamentos e com suporte a renderização off-screen.

### 📶 5. Arquitetura PWA Offline-First
- Armazenamento local persistente em **IndexedDB**.
- Funcionalidade completa no campo sem necessidade de conexão com a internet.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
- **Otimização Linear:** [javascript-lp-solver](https://github.com/JWally/jsLPSolver)
- **Exportação de Documentos:** [html2pdf.js](https://ekoopmans.github.io/html2pdf.js/) + [html2canvas](https://html2canvas.hertzen.com/) + [jsPDF](https://github.com/parallax/jsPDF)
- **Ícones:** [Lucide React](https://lucide.dev/)
- **Persistência Local:** IndexedDB
- **Build Tool:** [Vite](https://vitejs.dev/)

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/nicolas-adrian/br-co-agroadrian.git
   cd br-co-agroadrian
Instale as dependências:
code
Bash
npm install
Inicie o servidor de desenvolvimento:
code
Bash
npm run dev
Acesse a aplicação no navegador:
code
Code
http://localhost:3000
📦 Build para Produção e Deploy
Para gerar o bundle de produção otimizado para plataformas como Vercel, Netlify ou Cloud Run:
code
Bash
npm run build
Os arquivos estáticos prontos para distribuição estarão na pasta dist/.
📂 Estrutura do Projeto
code
Text
src/
├── components/          # Componentes visuais da interface
│   ├── AuditLaudo.tsx   # Laudo técnico imprimível
│   ├── FormulationUI.tsx# Interface de formulação e dashboard nutricional
│   ├── IngredientDB.tsx # Gerenciador de banco de alimentos
│   ├── PlanningUI.tsx   # Painel de planejamento de safra e projeções
│   └── SetupFunnel.tsx  # Coleta de biometria e metas do lote
├── services/            # Motores de cálculo zootécnico e regras de negócio
│   ├── CaprinosCorteEngine.ts
│   ├── CaprinosLeiteEngine.ts
│   ├── OvinosUnificadosEngine.ts
│   ├── FluxoProteicoEngine.ts
│   ├── engine.ts        # Roteador central de exigências
│   ├── solver.ts        # Algoritmo simplex de otimização de custo
│   ├── pdfService.ts    # Serviço de geração e exportação de PDF
│   └── db.ts            # Camada de banco de dados offline (IndexedDB)
├── types.ts             # Interfaces TypeScript e definições de tipos
├── App.tsx              # Estrutura principal e controle de abas
└── main.tsx             # Ponto de entrada da aplicação
👨‍🔬 Responsável Técnico & Autoria
Nicolas Adrian Viana de Oliveira
Graduando em Zootecnia — Universidade Federal da Bahia (UFBA)
📄 Licença
Este projeto é desenvolvido para fins de pesquisa, extensão e consultoria em nutrição de precisão. Distribuído sob a licença MIT. Consulte o arquivo LICENSE para obter mais detalhes.
