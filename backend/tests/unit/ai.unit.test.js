// ============================================================================
// tests/unit/ai.unit.test.js — TESTES DE UNIDADE PUROS de src/domain/ai.js
// ============================================================================
// Base da PIRÂMIDE de testes (Cap. 8, Eng. de Software Moderna — Marco Tulio
// Valente). Aqui testamos a LÓGICA DE DOMÍNIO extraída das rotas de IA de forma
// ISOLADA: importamos SÓ as funções puras, SEM subir o app (sem Express), SEM
// supertest, SEM banco e SEM rede. Isso é a lição de TESTABILIDADE do livro
// (IMCServlet -> IMCModel): separar a regra de domínio da apresentação para
// poder testá-la diretamente, rápido e determinístico (princípio FIRST).
//
// Técnicas de SELEÇÃO DE DADOS aplicadas em cada caso:
//   - Partição por Classe de Equivalência: um representante de cada classe de
//     entrada (válida / inválida) que tende a ter "a mesma chance de bug".
//   - Análise de Valor-Limite: foco nas FRONTEIRAS (ex.: total = 0, corte >= 3),
//     onde os bugs costumam se esconder.
// Cada teste tem AAA explícito (Arrange / Act / Assert) e UM comentário PT-BR
// dizendo O QUE verifica E QUAL técnica usa.
// ============================================================================

// Importa SOMENTE o módulo de domínio puro — nada de app/supertest/database.
const {
  calcularMetricasSprint,
  limparCercasJson,
  parsearStories,
  tentarParsearStories,
  deveGerarHistorias,
} = require('../../src/domain/ai');

// ----------------------------------------------------------------------------
// calcularMetricasSprint(stories)
// ----------------------------------------------------------------------------
describe('calcularMetricasSprint', () => {
  test('lista vazia -> tudo zerado (valor-limite: total = 0, sem divisão por zero -> 0%)', () => {
    // Verifica a FRONTEIRA total=0: percentDone deve ser 0 sem dividir por zero. (valor-limite)
    // Arrange
    const stories = [];
    // Act
    const r = calcularMetricasSprint(stories);
    // Assert
    expect(r).toEqual({
      totalPoints: 0,
      donePoints: 0,
      percentDone: 0,
      inProgressCount: 0,
      inReviewCount: 0,
      storiesCount: 0,
    });
  });

  test('mistura de status -> agrega cada métrica corretamente (partição: caso típico / caminho feliz)', () => {
    // Verifica a agregação no caso típico, com histórias em vários status. (partição de equivalência / caminho feliz)
    // Arrange
    const stories = [
      { status: 'to_do', story_points: 5 },
      { status: 'in_progress', story_points: 3 },
      { status: 'in_review', story_points: 2 },
      { status: 'done', story_points: 8 },
      { status: 'done', story_points: 2 },
    ];
    // Act
    const r = calcularMetricasSprint(stories);
    // Assert
    expect(r).toEqual({
      totalPoints: 20, // 5+3+2+8+2
      donePoints: 10, // 8+2 (só 'done')
      percentDone: 50, // round(10/20*100)
      inProgressCount: 1,
      inReviewCount: 1,
      storiesCount: 5,
    });
  });

  test('1 de 3 pontos done -> 33% via Math.round (valor-limite: arredondamento de fração)', () => {
    // Verifica o arredondamento: 1/3 = 33.33% deve virar 33 (Math.round arredonda pra baixo aqui). (valor-limite)
    // Também cobre a fronteira "há pontos no total mas nada 100% concluído".
    // Arrange
    const stories = [
      { status: 'done', story_points: 1 },
      { status: 'to_do', story_points: 2 },
    ];
    // Act
    const r = calcularMetricasSprint(stories);
    // Assert
    expect(r.percentDone).toBe(33); // round(1/3*100) = round(33.33) = 33
  });

  test('story_points null/ausente conta como 0 (partição inválida: ponto faltando)', () => {
    // Verifica a classe de entrada com pontos faltando: null e undefined viram 0 na soma. (partição de equivalência)
    // Também é a fronteira superior 100% (tudo done).
    // Arrange
    const stories = [
      { status: 'done', story_points: null }, // null -> 0
      { status: 'done' }, // ausente -> 0
      { status: 'done', story_points: 7 }, // único que soma
    ];
    // Act
    const r = calcularMetricasSprint(stories);
    // Assert
    expect(r.totalPoints).toBe(7);
    expect(r.donePoints).toBe(7);
    expect(r.percentDone).toBe(100);
  });

  test('undefined -> zeros sem quebrar (partição inválida / robustez: entrada não-array)', () => {
    // Verifica robustez: entrada não-array (undefined) é tolerada e devolve zeros. (partição de equivalência / robustez)
    // Arrange
    const entrada = undefined;
    // Act
    const r = calcularMetricasSprint(entrada);
    // Assert
    expect(r).toEqual({
      totalPoints: 0,
      donePoints: 0,
      percentDone: 0,
      inProgressCount: 0,
      inReviewCount: 0,
      storiesCount: 0,
    });
  });
});

// ----------------------------------------------------------------------------
// limparCercasJson(text)
// ----------------------------------------------------------------------------
describe('limparCercasJson', () => {
  test('texto com cercas ```json ... ``` -> remove cercas e apara (partição válida: resposta cercada)', () => {
    // Verifica a classe "Gemini embrulhou em markdown": cercas removidas e trim aplicado. (partição de equivalência / caminho feliz)
    // Arrange
    const text = '```json\n{"stories":[]}\n```';
    // Act
    const r = limparCercasJson(text);
    // Assert
    expect(r).toBe('{"stories":[]}');
  });

  test('texto puro só leva trim (partição válida: sem cercas)', () => {
    // Verifica a classe "texto já limpo": só os espaços nas pontas são removidos. (partição de equivalência)
    // Arrange
    const text = '   {"a":1}   ';
    // Act
    const r = limparCercasJson(text);
    // Assert
    expect(r).toBe('{"a":1}');
  });

  test('cerca ``` genérica (sem "json") também é removida (partição válida: cerca sem rótulo)', () => {
    // Verifica que a cerca sem o rótulo "json" também é tratada pelo segundo replace. (partição de equivalência)
    // Arrange
    const text = '```\n[1,2,3]\n```';
    // Act
    const r = limparCercasJson(text);
    // Assert
    expect(r).toBe('[1,2,3]');
  });

  test('null -> string vazia (valor-limite / robustez: entrada não-string)', () => {
    // Verifica robustez na fronteira: entrada null não quebra e retorna ''. (valor-limite / robustez)
    // Arrange
    const text = null;
    // Act
    const r = limparCercasJson(text);
    // Assert
    expect(r).toBe('');
  });

});

// ----------------------------------------------------------------------------
// parsearStories(text)
// ----------------------------------------------------------------------------
describe('parsearStories', () => {
  test('JSON válido com stories (e cercas) -> devolve o array (partição válida: caminho feliz)', () => {
    // Verifica o caminho feliz: limpa cercas, faz parse e devolve o array stories. (partição de equivalência / caminho feliz)
    // Arrange
    const text = '```json\n{"stories":[{"title":"A"},{"title":"B"}]}\n```';
    // Act
    const r = parsearStories(text);
    // Assert
    expect(r).toEqual([{ title: 'A' }, { title: 'B' }]);
  });

  test('JSON válido sem a chave stories -> [] (partição válida: default da rota)', () => {
    // Verifica o default: JSON válido sem a chave 'stories' devolve [] (parsed.stories || []). (partição de equivalência)
    // Arrange
    const text = '{"outraCoisa": true}';
    // Act
    const r = parsearStories(text);
    // Assert
    expect(r).toEqual([]);
  });

  test('JSON inválido -> propaga erro de parse (partição inválida: contrato 500 da rota)', () => {
    // Verifica o contrato: JSON inválido LANÇA (a rota captura e responde 500). (partição de equivalência / robustez)
    // Arrange
    const text = 'isto não é json';
    // Act + Assert (a chamada deve lançar)
    expect(() => parsearStories(text)).toThrow();
  });
});

// ----------------------------------------------------------------------------
// tentarParsearStories(text)
// ----------------------------------------------------------------------------
describe('tentarParsearStories', () => {
  test('JSON válido com stories -> devolve o array (partição válida: gerar histórias)', () => {
    // Verifica a classe "deu pra gerar": JSON válido com 'stories' devolve o array. (partição de equivalência / caminho feliz)
    // Arrange
    const text = '{"stories":[{"title":"X"}]}';
    // Act
    const r = tentarParsearStories(text);
    // Assert
    expect(r).toEqual([{ title: 'X' }]);
  });

  test('JSON válido sem stories -> null (partição válida: sinaliza fallback de pergunta)', () => {
    // Verifica que JSON válido SEM 'stories' devolve null, sinalizando "próxima pergunta". (partição de equivalência)
    // Arrange
    const text = '{"reply":"qual o objetivo do projeto?"}';
    // Act
    const r = tentarParsearStories(text);
    // Assert
    expect(r).toBeNull();
  });

  test('texto natural (JSON inválido) -> null sem lançar (partição inválida: tolerante)', () => {
    // Verifica a tolerância: JSON inválido NÃO lança, devolve null (cai no fallback). (partição de equivalência / robustez)
    // Arrange
    const text = 'Olá! Pode me contar mais sobre o projeto?';
    // Act
    const r = tentarParsearStories(text);
    // Assert
    expect(r).toBeNull();
  });
});

// ----------------------------------------------------------------------------
// deveGerarHistorias(messages)
// ----------------------------------------------------------------------------
describe('deveGerarHistorias', () => {
  test('2 turnos do usuário -> false (valor-limite: logo ABAIXO do corte >= 3)', () => {
    // Verifica a fronteira inferior do corte: 2 turnos ainda NÃO gera (< 3). (valor-limite)
    // Arrange
    const messages = [
      { role: 'user', content: 'oi' },
      { role: 'assistant', content: 'pergunta' },
      { role: 'user', content: 'resposta' },
    ];
    // Act
    const r = deveGerarHistorias(messages);
    // Assert
    expect(r).toBe(false);
  });

  test('3 turnos do usuário -> true (valor-limite: EXATAMENTE no corte >= 3)', () => {
    // Verifica a fronteira exata: 3 turnos do usuário já dispara a geração (>= 3). (valor-limite)
    // Arrange
    const messages = [
      { role: 'user', content: 'a' },
      { role: 'assistant', content: '?' },
      { role: 'user', content: 'b' },
      { role: 'assistant', content: '?' },
      { role: 'user', content: 'c' },
    ];
    // Act
    const r = deveGerarHistorias(messages);
    // Assert
    expect(r).toBe(true);
  });

  test('só conta role "user"; assistant é ignorado (partição válida: filtro por papel)', () => {
    // Verifica que mensagens do assistant não contam — só 'user' entra na contagem. (partição de equivalência)
    // Arrange: 5 mensagens, mas só 2 são do usuário -> abaixo do corte
    const messages = [
      { role: 'assistant', content: 'a' },
      { role: 'assistant', content: 'b' },
      { role: 'user', content: 'c' },
      { role: 'assistant', content: 'd' },
      { role: 'user', content: 'e' },
    ];
    // Act
    const r = deveGerarHistorias(messages);
    // Assert
    expect(r).toBe(false);
  });

  test('undefined -> false sem quebrar (partição inválida / robustez: entrada não-array)', () => {
    // Verifica robustez: entrada não-array (undefined) é tolerada e devolve false. (partição de equivalência / robustez)
    // Arrange
    const messages = undefined;
    // Act
    const r = deveGerarHistorias(messages);
    // Assert
    expect(r).toBe(false);
  });
});
