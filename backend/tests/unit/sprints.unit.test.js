// ============================================================================
// tests/unit/sprints.unit.test.js — TESTES DE UNIDADE de domain/sprints.js
// ============================================================================
// Base da pirâmide (Cap. 8, Eng. de Software Moderna — Marco Túlio Valente):
// testam FUNÇÕES PURAS de forma ISOLADA. Importamos SÓ o módulo de domínio —
// NÃO subimos o app, NÃO usamos supertest, NÃO tocamos no banco nem na rede.
//
// Lição de "Testabilidade" do livro (IMCServlet -> IMCModel): a regra de
// domínio (montar o objeto pro banco a partir do body) foi extraída da rota
// (apresentação) para domain/sprints.js, podendo ser testada sem framework web.
//
// Técnicas de "Seleção de Dados de Teste" aplicadas aqui:
//   - Particionamento por Classe de Equivalência: 1 caso por classe de entrada
//     (ex.: campo truthy vs. campo vazio/ausente vs. campo fora da whitelist).
//   - Análise de Valor-Limite: fronteiras das classes (ex.: '' não entra,
//     null entra/é preservado, projectId string -> Number).
//
// FIRST: rápidos (sem I/O), Isolados (sem estado externo), Determinísticos.
// Estilo AAA explícito (Arrange / Act / Assert) e comentários em PT-BR.
// ============================================================================

const {
  montarInsertSprint,
  montarUpdatesSprint,
} = require('../../src/domain/sprints');

// ============================================================================
// montarInsertSprint(projectId, body) -> objeto pronto pro insert
// ============================================================================
describe('montarInsertSprint(projectId, body)', () => {
  test('com APENAS name (entrada mínima) -> só project_id + name + goal vazio, sem datas/status', () => {
    // Verifica: classe de equivalência "body mínimo" — só o campo obrigatório.
    // Técnica: Particionamento por Classe de Equivalência (entrada mínima válida).
    // Arrange: projectId numérico e body só com name.
    const projectId = 7;
    const body = { name: 'Sprint 1' };

    // Act
    const resultado = montarInsertSprint(projectId, body);

    // Assert: campos opcionais omitidos NÃO aparecem (banco aplica defaults).
    expect(resultado).toEqual({ project_id: 7, name: 'Sprint 1', goal: '' });
    expect(resultado).not.toHaveProperty('start_date');
    expect(resultado).not.toHaveProperty('end_date');
    expect(resultado).not.toHaveProperty('status');
  });

  test('com body COMPLETO (todos truthy) -> todos os campos entram no insert', () => {
    // Verifica: classe de equivalência "body completo" — todos os campos válidos.
    // Técnica: Particionamento por Classe de Equivalência (entrada completa válida).
    // Arrange: todos os campos presentes e truthy.
    const body = {
      name: 'Sprint Q3',
      goal: 'Entregar o checkout',
      start_date: '2026-06-01',
      end_date: '2026-06-15',
      status: 'active',
    };

    // Act
    const resultado = montarInsertSprint(42, body);

    // Assert: objeto reflete fielmente o body, com project_id já como Number.
    expect(resultado).toEqual({
      project_id: 42,
      name: 'Sprint Q3',
      goal: 'Entregar o checkout',
      start_date: '2026-06-01',
      end_date: '2026-06-15',
      status: 'active',
    });
  });

  test('projectId vindo como STRING (como no :param da rota) -> convertido para Number', () => {
    // Verifica: project_id sai numérico mesmo recebendo string do parâmetro da URL.
    // Técnica: Análise de Valor-Limite (fronteira de tipo string -> number).
    // Arrange: projectId é string, como chega em req.params.projectId.
    const projectId = '15';

    // Act
    const resultado = montarInsertSprint(projectId, { name: 'S' });

    // Assert: tipo e valor convertidos via Number().
    expect(resultado.project_id).toBe(15);
    expect(typeof resultado.project_id).toBe('number');
  });

  test('start_date/end_date/status como string VAZIA (falsy) -> NÃO entram no objeto', () => {
    // Verifica: fronteira do "if (truthy)": '' é falsy, então os campos são omitidos.
    // Técnica: Análise de Valor-Limite (string vazia na fronteira do truthy).
    // Arrange: campos opcionais presentes porém vazios.
    const body = { name: 'A', start_date: '', end_date: '', status: '' };

    // Act
    const resultado = montarInsertSprint(1, body);

    // Assert: campos vazios não vazam pro insert (banco usa defaults).
    expect(resultado).not.toHaveProperty('start_date');
    expect(resultado).not.toHaveProperty('end_date');
    expect(resultado).not.toHaveProperty('status');
  });

  test('body AUSENTE (undefined) -> não quebra; retorna estrutura mínima', () => {
    // Verifica: robustez — body undefined é tolerado (body || {}).
    // Técnica: Análise de Valor-Limite / robustez (entrada nula/ausente).
    // Arrange: nenhum body.
    // Act
    const resultado = montarInsertSprint(3 /* sem body */);

    // Assert: name fica undefined (rota valida antes), goal '' e sem opcionais.
    expect(resultado).toEqual({ project_id: 3, name: undefined, goal: '' });
  });
});

// ============================================================================
// montarUpdatesSprint(body) -> PATCH parcial só com campos enviados
// ============================================================================
describe('montarUpdatesSprint(body)', () => {
  test('só os campos ENVIADOS entram; os ausentes (undefined) somem', () => {
    // Verifica: PATCH parcial — campos não enviados não são tocados.
    // Técnica: Particionamento por Classe de Equivalência (enviado vs. ausente).
    // Arrange: body com 2 dos 5 campos da whitelist.
    const body = { name: 'Novo nome', status: 'completed' };

    // Act
    const resultado = montarUpdatesSprint(body);

    // Assert: só os 2 campos enviados aparecem.
    expect(resultado).toEqual({ name: 'Novo nome', status: 'completed' });
    expect(resultado).not.toHaveProperty('goal');
    expect(resultado).not.toHaveProperty('start_date');
    expect(resultado).not.toHaveProperty('end_date');
  });

  test('valor null é PRESERVADO (ex.: limpar a meta com goal: null)', () => {
    // Verifica: null != undefined; null é um valor enviado e deve passar.
    // Técnica: Análise de Valor-Limite (fronteira null vs. undefined).
    // Arrange: goal explicitamente null.
    const body = { goal: null };

    // Act
    const resultado = montarUpdatesSprint(body);

    // Assert: chave goal presente com valor null.
    expect(resultado).toHaveProperty('goal', null);
  });

  test('campos FORA da whitelist (project_id, id, hacker) são IGNORADOS', () => {
    // Verifica: só passam name/goal/start_date/end_date/status; o resto é descartado.
    // Técnica: Particionamento por Classe de Equivalência (dentro vs. fora da whitelist).
    // Arrange: mistura de campos válidos e proibidos.
    const body = { name: 'OK', project_id: 999, id: 5, hacker: true };

    // Act
    const resultado = montarUpdatesSprint(body);

    // Assert: só o campo da whitelist sobrevive.
    expect(resultado).toEqual({ name: 'OK' });
    expect(resultado).not.toHaveProperty('project_id');
    expect(resultado).not.toHaveProperty('id');
    expect(resultado).not.toHaveProperty('hacker');
  });

  test('body AUSENTE (undefined) -> não quebra; retorna {}', () => {
    // Verifica: robustez — undefined é tolerado (body || {}).
    // Técnica: Análise de Valor-Limite / robustez (entrada nula/ausente).
    // Arrange: nenhum body.
    // Act
    const resultado = montarUpdatesSprint(undefined);

    // Assert
    expect(resultado).toEqual({});
  });
});
