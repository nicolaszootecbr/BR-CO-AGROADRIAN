# 🐑 BR-CO AgroAdrian v2.0
> **Sistema Especialista de Nutrição de Precisão e Planejamento Bioeconômico**

Este repositório contém o código-fonte do **BR-CO AgroAdrian**, um PWA (Progressive Web App) desenvolvido para automatizar a formulação de dietas e o planejamento de ciclos produtivos para ovinos e caprinos, fundamentado integralmente no sistema **BR-CO 2024**.

---

## 🚀 Diferenciais do Projeto

O AgroAdrian não é apenas uma calculadora de ração, mas um sistema de auditoria nutricional que implementa:

*   **Modelagem Alométrica:** Conversão automática de PC para PCVZ (Peso Corporal Vazio) e cálculo de Peso Metabólico ($PC^{0.75}$).
*   **Cálculo Diferencial de Gestação:** Aplicação da primeira derivada das curvas de deposição fetal para determinar exigências diárias exatas de Energia e Proteína.
*   **Trilha de Auditoria (White-Box):** Laudos técnicos em PDF que expõem o memorial de cálculo e as fórmulas científicas utilizadas.
*   **Módulo Planejador 4.0:** Simulação longitudinal do ciclo de confinamento dividido em 3 fases (Adaptação, Crescimento e Terminação).
*   **BioSecurity Middleware:** Travas automáticas para Ureia (<1%), Extrato Etéreo (<7%), Cobre em Ovinos e limites físicos de FDN.

---

## 🛠️ Tecnologias Utilizadas

*   **Frontend:** React 18 + TypeScript
*   **Estilização:** Tailwind CSS (Mobile First / High Contrast)
*   **Banco de Dados:** IndexedDB (via `idb` e `Dexie.js`) para operação 100% offline.
*   **Relatórios:** `html2pdf.js` para geração de documentos técnicos auditáveis.
*   **Ambiente:** Vite + Google AI Studio

---

## 📂 Estrutura do Repositório

```text
src/
├── components/        # Componentes de UI (AuditLaudo, PlanningUI, etc.)
├── services/          # Motores de Cálculo (Engine, Solver, Inventory)
├── types.ts           # Definições de interfaces e biometria
├── db.ts              # Configuração do Banco de Dados Local
└── App.tsx            # Orquestrador principal da aplicação

📄 Propriedade Intelectual e Contato
© 2024 Nicolas Oliveira.
Todos os direitos reservados.

Este software foi desenvolvido como parte de pesquisa e inovação tecnológica na área de Zootecnia. O código-fonte e a arquitetura lógica são de propriedade exclusiva do autor.
