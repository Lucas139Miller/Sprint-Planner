// ============================================================================
// tests/unit/stories.unit.test.js — TESTES DE UNIDADE PUROS de src/domain/stories.js
// ============================================================================
// Base da pirâmide (Cap. 8 — Eng. de Software Moderna, Marco Tulio Valente).
//
// Estes testes exercitam SÓ a lógica de domínio extraída das rotas, ISOLADA:
//   - NÃO sobem o app Express, NÃO usam supertest, NÃO tocam banco/rede.
//   - Importam apenas as funções puras de src/domain/stories.js.
// É a lição da "Testabilidade" (IMCServlet -> IMCModel): a regra de negócio sai
// da camada de apresentação (a rota) para uma função pura, fácil de testar.
//
// Técnicas de SELEÇÃO DE DADOS DE TESTE aplicadas (Cap. 8):
//   - PARTIÇÃO POR CLASSE DE EQUIVALÊNCIA: um representante por classe de entrada
//     (entradas válidas vs. inválidas, "campo enviado" vs. "campo ausente"...).
//   - ANÁLISE DE VALOR-LIMITE: as fronteiras e o que está logo abaixo/acima delas
//     (backlog vazio, max=0, null vs. undefined, body vazio, todos os campos juntos).
//
// FIRST: Fast (sem I/O), Isolated (sem estado externo), Repeatable/Deterministic
// (mesma entrada -> mesma saída sempre), Self-validating (expects), Timely.
//
// Estrutura AAA explícita em cada teste: Arrange (prepara) / Act (executa) /
// Assert (verifica).
// ============================================================================

const {
  VALID_STATUSES,
  statusValido,
  proximaPrioridade,
  montarUpdatesStory,
} = require('../../src/domain/stories');

// ----------------------------------------------------------------------------
// statusValido(status) — valida o status do board Kanban (US6).
// ----------------------------------------------------------------------------
describe('statusValido — valida status do Kanban (US6)', () => {
  // PARTIÇÃO DE EQUIVALÊNCIA — classe VÁLIDA: cada um dos 4 status do board é um
  // representante da classe "status conhecido" e deve retornar true.
  // (test.each percorre a própria lista exportada para não duplicar valores.)
  test.each(VALID_STATUSES)(
    'classe válida: status conhecido "%s" -> true',
    (statusConhecido) => {
      // Arrange: o status já é o caso de teste vindo do test.each.
      // Act
      const resultado = statusValido(statusConhecido);
      // Assert
      expect(resultado).toBe(true);
    }
  );

  // VALOR-LIMITE / sensibilidade a caixa: "DONE" maiúsculo está na fronteira de
  // um válido, mas a comparação é case-sensitive -> inválido. (representa também
  // o caso "done " com espaço: string parecida mas diferente, sem trim implícito).
  test('valor-limite: "DONE" maiúsculo -> false (comparação é case-sensitive)', () => {
    // Arrange
    const maiusculo = 'DONE';
    // Act
    const resultado = statusValido(maiusculo);
    // Assert
    expect(resultado).toBe(false);
  });

  // PARTIÇÃO DE EQUIVALÊNCIA — classe INVÁLIDA + robustez: representantes da
  // classe "status desconhecido / ausente / tipo errado" devem retornar false.
  test.each([
    ['archived', 'string fora da lista de status'],
    [undefined, 'undefined (campo não enviado / tipo errado)'],
  ])('classe inválida/robustez: %p (%s) -> false', (entradaInvalida) => {
    // Arrange: entrada inválida vem do test.each.
    // Act
    const resultado = statusValido(entradaInvalida);
    // Assert
    expect(resultado).toBe(false);
  });
});

// ----------------------------------------------------------------------------
// proximaPrioridade(maxAtual) — próxima priority = (maxAtual || 0) + 1.
// O "|| 0" trata backlog vazio (null/undefined) E o número 0 como "ausência".
// ----------------------------------------------------------------------------
describe('proximaPrioridade — próxima priority (max + 1)', () => {
  // VALOR-LIMITE: backlog vazio sinalizado por null -> primeira história é 1.
  test('valor-limite: backlog vazio (null) -> 1 (primeira história)', () => {
    // Arrange
    const maxAtual = null;
    // Act
    const proxima = proximaPrioridade(maxAtual);
    // Assert
    expect(proxima).toBe(1);
  });

  // VALOR-LIMITE no operador ||: o número 0 é "falsy", então é tratado como
  // ausência -> 1 (e NÃO 0+1... que coincide em 1, mas a intenção é a fronteira
  // de "0 conta como vazio"). Caso clássico de borda do "|| 0".
  test('valor-limite: maxAtual 0 -> 1 (|| trata 0 como ausência)', () => {
    // Arrange
    const maxAtual = 0;
    // Act
    const proxima = proximaPrioridade(maxAtual);
    // Assert
    expect(proxima).toBe(1);
  });

  // PARTIÇÃO TÍPICA (caminho feliz): há histórias; o maior priority é 5 -> 6.
  test('classe típica (caminho feliz): maxAtual 5 -> 6', () => {
    // Arrange
    const maxAtual = 5;
    // Act
    const proxima = proximaPrioridade(maxAtual);
    // Assert
    expect(proxima).toBe(6);
  });
});

// ----------------------------------------------------------------------------
// montarUpdatesStory(body) — monta o objeto de UPDATE parcial (PUT /stories/:id).
// Regra: copia só os campos da lista branca que NÃO são undefined; null É
// preservado (ex.: limpar assignee); campos fora da lista branca são ignorados.
// ----------------------------------------------------------------------------
describe('montarUpdatesStory — UPDATE parcial (whitelist de campos)', () => {
  // PARTIÇÃO DE EQUIVALÊNCIA: classe "campo enviado" entra; classe "campo
  // undefined (não enviado)" é descartada -> garante PATCH parcial.
  test('classe enviado vs. ausente: campos definidos entram, undefined some', () => {
    // Arrange: title/story_points enviados; label explicitamente undefined.
    const body = { title: 'Novo título', story_points: 5, label: undefined };
    // Act
    const updates = montarUpdatesStory(body);
    // Assert: só os definidos entraram; 'label' não foi incluído.
    expect(updates).toEqual({ title: 'Novo título', story_points: 5 });
    expect('label' in updates).toBe(false);
  });

  // VALOR-LIMITE entre "não enviado" (undefined) e "enviado como null": null é
  // valor de domínio válido (remover responsável) e DEVE ser preservado.
  test('valor-limite: assignee_id null é PRESERVADO (remover responsável)', () => {
    // Arrange
    const body = { assignee_id: null };
    // Act
    const updates = montarUpdatesStory(body);
    // Assert: a chave existe e o valor é null (não foi tratado como ausência).
    expect(updates).toEqual({ assignee_id: null });
    expect('assignee_id' in updates).toBe(true);
  });

  // PARTIÇÃO DE EQUIVALÊNCIA — classe "fora da whitelist": campos que a rota não
  // deve atualizar (priority/project_id/id) e até um campo malicioso são ignorados.
  test('classe fora da whitelist: priority/project_id/id/hacker são ignorados', () => {
    // Arrange: só 'title' é atualizável; o resto deve ser descartado.
    const body = { title: 'X', priority: 99, project_id: 7, id: 1, hacker: true };
    // Act
    const updates = montarUpdatesStory(body);
    // Assert
    expect(updates).toEqual({ title: 'X' });
  });

  // ROBUSTEZ (valor-limite de ausência total): body undefined não deve quebrar;
  // a função tem guarda (body || {}) e devolve {}.
  test('robustez/valor-limite: body undefined -> {} (não lança)', () => {
    // Arrange
    const body = undefined;
    // Act
    const updates = montarUpdatesStory(body);
    // Assert
    expect(updates).toEqual({});
  });

  // PARTIÇÃO "tudo de uma vez" (caminho feliz amplo): todos os 6 campos da
  // whitelist enviados devem aparecer integralmente no update.
  test('caminho feliz: os 6 campos atualizáveis enviados juntos entram todos', () => {
    // Arrange
    const body = {
      title: 'Título',
      description: 'Descrição',
      acceptance_criteria: 'Critérios',
      story_points: 3,
      label: 'bug',
      assignee_id: 42,
    };
    // Act
    const updates = montarUpdatesStory(body);
    // Assert: o update é igual ao body (todos os campos são atualizáveis).
    expect(updates).toEqual(body);
  });

  // VALOR-LIMITE numérico: story_points = 0 é "falsy", mas NÃO é undefined,
  // então DEVE entrar no update (0 pontos é um valor válido a persistir).
  test('valor-limite: story_points 0 (falsy mas != undefined) é preservado', () => {
    // Arrange
    const body = { story_points: 0 };
    // Act
    const updates = montarUpdatesStory(body);
    // Assert
    expect(updates).toEqual({ story_points: 0 });
    expect('story_points' in updates).toBe(true);
  });
});
