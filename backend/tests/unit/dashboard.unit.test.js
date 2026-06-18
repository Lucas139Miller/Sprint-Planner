// ============================================================================
// tests/unit/dashboard.unit.test.js — TESTES DE UNIDADE (puros) de
//                                       src/domain/dashboard.js
// ============================================================================
// BASE DA PIRÂMIDE DE TESTES (Cap. 8, "Engenharia de Software Moderna",
// Marco Tulio Valente). Aqui exercitamos a LÓGICA DE DOMÍNIO ISOLADA:
//   - importamos APENAS as funções puras de domain/dashboard.js;
//   - NÃO subimos o app, NÃO usamos supertest, NÃO tocamos banco nem rede;
//   - logo NÃO precisamos de mocks/stubs (não há dependência externa a simular).
//
// LIÇÃO DE TESTABILIDADE (IMCServlet -> IMCModel, Cap. 8): a regra de cálculo
// foi EXTRAÍDA do handler HTTP (routes/dashboard.js) para uma função pura, que
// recebe a lista já buscada do banco e devolve números. Por ser pura, é
// rapidíssima e determinística de testar (princípios FIRST).
//
// TÉCNICAS DE SELEÇÃO DE DADOS (Cap. 8) usadas em cada teste:
//   - PARTIÇÃO DE EQUIVALÊNCIA: um representante de cada classe de entrada
//     (válida/inválida) — ex.: lista típica, lista vazia, dado incompleto.
//   - ANÁLISE DE VALOR-LIMITE: as fronteiras onde bugs se escondem — ex.:
//     0 pontos (sem divisão por zero), 100% (tudo concluído), arredondamento
//     no .5 do Math.round.
//   - ROBUSTEZ: entradas fora do contrato (null/undefined) não devem quebrar.
//
// Estrutura AAA explícita em todo teste: Arrange (preparar) / Act (executar) /
// Assert (verificar).
// ============================================================================

// Importa SÓ o módulo de domínio — nada de app, banco ou rede (unidade isolada).
const {
  agregarDashboardSprint,
  pontosConcluidosPorSprint,
  calcularVelocity,
} = require('../../src/domain/dashboard');

// ----------------------------------------------------------------------------
// agregarDashboardSprint(stories)
//   -> { totalPoints, completedPoints, progress, byStatus, storiesCount }
// ----------------------------------------------------------------------------
describe('domain/dashboard - agregarDashboardSprint', () => {
  test('mistura de status -> soma pontos, conta por coluna e calcula progresso', () => {
    // TÉCNICA: partição de equivalência (classe TÍPICA — sprint real com
    // histórias em várias colunas e pontos variados). Verifica o caminho feliz.
    // Arrange: 5 histórias, 8 de 20 pontos concluídos (status 'done').
    const stories = [
      { status: 'done', story_points: 5 },
      { status: 'done', story_points: 3 },
      { status: 'in_progress', story_points: 2 },
      { status: 'in_review', story_points: 0 },
      { status: 'to_do', story_points: 10 },
    ];
    // Act
    const r = agregarDashboardSprint(stories);
    // Assert
    expect(r.totalPoints).toBe(20);
    expect(r.completedPoints).toBe(8);
    expect(r.progress).toBe(40); // 8/20 = 40%
    expect(r.byStatus).toEqual({ to_do: 1, in_progress: 1, in_review: 1, done: 2 });
    expect(r.storiesCount).toBe(5);
  });

  test('sprint vazio -> estrutura totalmente zerada', () => {
    // TÉCNICA: valor-limite (fronteira INFERIOR — nenhuma história). A UI
    // depende dessa estrutura zerada para não quebrar.
    // Arrange
    const stories = [];
    // Act
    const r = agregarDashboardSprint(stories);
    // Assert: todos os campos zerados e byStatus com as 4 colunas em 0.
    expect(r).toEqual({
      totalPoints: 0,
      completedPoints: 0,
      progress: 0,
      byStatus: { to_do: 0, in_progress: 0, in_review: 0, done: 0 },
      storiesCount: 0,
    });
  });

  test('todas as histórias done -> progresso 100%', () => {
    // TÉCNICA: valor-limite (fronteira SUPERIOR do progresso — 100%).
    // Arrange
    const stories = [
      { status: 'done', story_points: 2 },
      { status: 'done', story_points: 6 },
    ];
    // Act
    const r = agregarDashboardSprint(stories);
    // Assert
    expect(r.completedPoints).toBe(8);
    expect(r.progress).toBe(100);
    expect(r.byStatus.done).toBe(2);
  });

  test('story_points ausente/null contam 0 e não há divisão por zero', () => {
    // TÉCNICA: partição de equivalência (classe DADO INCOMPLETO — histórias
    // sem pontos) combinada com valor-limite (totalPoints = 0 com histórias
    // presentes -> progress deve ser 0, sem 0/0 = NaN).
    // Arrange: uma sem o campo, outra com null explícito.
    const stories = [
      { status: 'to_do' },
      { status: 'done', story_points: null },
    ];
    // Act
    const r = agregarDashboardSprint(stories);
    // Assert
    expect(r.totalPoints).toBe(0);
    expect(r.completedPoints).toBe(0);
    expect(r.progress).toBe(0); // protegido contra divisão por zero
    expect(r.storiesCount).toBe(2);
    expect(r.byStatus.done).toBe(1); // a coluna ainda é contada
  });

  test('progresso é arredondado com Math.round (1 de 3 done = 33%)', () => {
    // TÉCNICA: valor-limite no ARREDONDAMENTO (1/3 = 33,33... -> 33).
    // Arrange: 1 done (1pt) de 3 pontos totais.
    const stories = [
      { status: 'done', story_points: 1 },
      { status: 'to_do', story_points: 1 },
      { status: 'to_do', story_points: 1 },
    ];
    // Act
    const r = agregarDashboardSprint(stories);
    // Assert
    expect(r.progress).toBe(33); // Math.round(33.33) = 33
  });

  test('entrada não-array (null) -> zeros (robustez)', () => {
    // TÉCNICA: robustez (entrada fora do contrato não pode quebrar a função).
    // Arrange + Act
    const r = agregarDashboardSprint(null);
    // Assert
    expect(r.totalPoints).toBe(0);
    expect(r.completedPoints).toBe(0);
    expect(r.progress).toBe(0);
    expect(r.storiesCount).toBe(0);
    expect(r.byStatus).toEqual({ to_do: 0, in_progress: 0, in_review: 0, done: 0 });
  });
});

// ----------------------------------------------------------------------------
// pontosConcluidosPorSprint(sprints, doneStories) -> [{ id, name, completed }]
// ----------------------------------------------------------------------------
describe('domain/dashboard - pontosConcluidosPorSprint', () => {
  test('associa histórias done ao sprint certo por sprint_id e soma os pontos', () => {
    // TÉCNICA: partição de equivalência (classe TÍPICA — várias histórias
    // distribuídas entre sprints distintos). Caminho feliz da associação.
    // Arrange
    const sprints = [
      { id: 1, name: 'Sprint A' },
      { id: 2, name: 'Sprint B' },
    ];
    const doneStories = [
      { sprint_id: 1, story_points: 3 },
      { sprint_id: 1, story_points: 5 },
      { sprint_id: 2, story_points: 2 },
    ];
    // Act
    const r = pontosConcluidosPorSprint(sprints, doneStories);
    // Assert: 3+5 no A, 2 no B.
    expect(r).toEqual([
      { id: 1, name: 'Sprint A', completed: 8 },
      { id: 2, name: 'Sprint B', completed: 2 },
    ]);
  });

  test('story_points null conta como 0 na soma', () => {
    // TÉCNICA: partição de equivalência (classe DADO INCOMPLETO — ponto null).
    // Arrange
    const sprints = [{ id: 1, name: 'S' }];
    const doneStories = [
      { sprint_id: 1, story_points: null },
      { sprint_id: 1, story_points: 4 },
    ];
    // Act
    const r = pontosConcluidosPorSprint(sprints, doneStories);
    // Assert
    expect(r[0].completed).toBe(4); // 0 + 4
  });

  test('ambos argumentos não-array -> [] (robustez)', () => {
    // TÉCNICA: robustez (entradas fora do contrato nos dois parâmetros).
    // Arrange + Act
    const r = pontosConcluidosPorSprint(null, undefined);
    // Assert
    expect(r).toEqual([]);
  });
});

// ----------------------------------------------------------------------------
// calcularVelocity(resultados) -> number (média arredondada de completed)
// ----------------------------------------------------------------------------
describe('domain/dashboard - calcularVelocity', () => {
  test('média arredondada dos pontos concluídos por sprint', () => {
    // TÉCNICA: partição de equivalência (classe TÍPICA — média inteira exata).
    // Arrange: (8 + 2 + 5) / 3 = 5.
    const resultados = [{ completed: 8 }, { completed: 2 }, { completed: 5 }];
    // Act
    const v = calcularVelocity(resultados);
    // Assert
    expect(v).toBe(5);
  });

  test('arredonda com Math.round no .5 — (3 + 4)/2 = 3.5 -> 4', () => {
    // TÉCNICA: valor-limite no ARREDONDAMENTO (fronteira exata do .5).
    // Arrange + Act + Assert
    expect(calcularVelocity([{ completed: 3 }, { completed: 4 }])).toBe(4);
  });

  test('um único sprint -> retorna o próprio valor', () => {
    // TÉCNICA: valor-limite (fronteira INFERIOR de tamanho útil — 1 elemento).
    // Arrange + Act + Assert
    expect(calcularVelocity([{ completed: 7 }])).toBe(7);
  });

  test('lista vazia -> 0 (sem divisão por zero)', () => {
    // TÉCNICA: valor-limite (fronteira — nenhum sprint; protege contra n/0).
    // Arrange + Act + Assert
    expect(calcularVelocity([])).toBe(0);
  });

  test('entrada undefined -> 0 (robustez)', () => {
    // TÉCNICA: robustez (argumento ausente não deve quebrar nem virar NaN).
    // Arrange + Act + Assert
    expect(calcularVelocity(undefined)).toBe(0);
  });

  test('completed null/ausente conta 0 na média', () => {
    // TÉCNICA: partição de equivalência (classe DADO INCOMPLETO — completed
    // null). (0 + 6) / 2 = 3.
    // Arrange + Act + Assert
    expect(calcularVelocity([{ completed: null }, { completed: 6 }])).toBe(3);
  });
});
