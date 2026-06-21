// ============================================================================
// jest.config.js — configuração dos testes (Jest)
// ============================================================================
// Mantida simples e comentada para a equipe explicar cada linha.
// ============================================================================

module.exports = {
  // Backend Node puro (sem DOM/navegador).
  testEnvironment: 'node',

  // Roda tests/setup.js antes de cada arquivo de teste:
  // liga o banco fake, fixa o JWT_SECRET e limpa o banco no beforeEach.
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Mede cobertura apenas do código-fonte da aplicação.
  collectCoverageFrom: ['src/**/*.js'],

  // Formatos do relatório de cobertura gerados em backend/coverage/.
  //  - text        : tabela resumida no terminal (a que aparece ao rodar);
  //  - lcov        : relatório HTML navegável (coverage/lcov-report/index.html);
  //  - json-summary: gera coverage/coverage-summary.json com os totais
  //    (statements/branches/functions/lines) — fácil de ler por scripts/CI.
  coverageReporters: ['text', 'lcov', 'json-summary'],

  // Arquivos que NÃO entram na cobertura:
  //  - server.js  : só dá app.listen (entrypoint, não tem lógica testável);
  //  - api/index.js: handler serverless da Vercel (idem);
  //  - database.js : no teste é substituído pelo fake, então medir não faz sentido.
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/server.js',
    '<rootDir>/api/index.js',
    '<rootDir>/src/database.js',
  ],

  // Meta de qualidade combinada com o cliente: >= 80% nos quatro indicadores.
  // Se a cobertura cair abaixo disso, o `npm run test:coverage` falha.
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
};
