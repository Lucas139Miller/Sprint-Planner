// ============================================================================
// CONFIGURACAO DO CYPRESS (testes end-to-end / E2E)
// ============================================================================
// O que e E2E: em vez de testar uma funcao isolada (teste de unidade), aqui
// abrimos o site de verdade no navegador e agimos como um usuario real
// (digitar, clicar, ler a tela). Isso valida o fluxo COMPLETO: frontend React
// -> backend Express -> banco. Nos testes, o banco e o FAKE em memoria
// (USE_FAKE_DB=1), entao tudo roda offline, rapido e sem sujar dados reais.
//
// baseUrl = endereco do FRONTEND (Vite, porta 5173). Quando um teste faz
// cy.visit('/'), o Cypress completa com http://localhost:5173/. O frontend, por
// sua vez, chama o backend em http://localhost:3001 (ver frontend/src/api.ts).
const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    // Endereco base do app no navegador (frontend Vite em dev).
    baseUrl: 'http://localhost:5173',
    // Onde ficam os arquivos de teste (.cy.js).
    specPattern: 'cypress/e2e/**/*.cy.js',
    // Arquivo carregado antes de cada teste (comandos reutilizaveis).
    supportFile: 'cypress/support/e2e.js',
    // Grava video de cada spec (cypress/videos/*.mp4) para mostrar no dashboard.
    video: true,
    // Tempo maximo (ms) esperando um elemento aparecer antes de falhar.
    defaultCommandTimeout: 8000,
    setupNodeEvents() {
      // Sem plugins extras: mantemos a config simples e explicavel.
    },
  },
})
