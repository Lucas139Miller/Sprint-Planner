// ============================================================================
// fakeSupabase.js — BANCO DE TESTE FAKE EM MEMÓRIA
// ============================================================================
//
// COMO FUNCIONA (leia isto antes de explicar pro professor):
//
// O código real usa o cliente @supabase/supabase-js, que escreve queries com
// métodos ENCADEADOS, por exemplo:
//
//     await supabase.from('sp_users').select('*').eq('email', x).maybeSingle()
//
// Este arquivo é um SUBSTITUTO em memória que entende essa mesma "linguagem":
//   1. Guardamos os dados em objetos JavaScript comuns (a const `db`),
//      um array por tabela. Nada de rede, nada de SQL.
//   2. `from(tabela)` devolve um objeto "Query" que vai ACUMULANDO os filtros
//      conforme você encadeia (.eq, .in, .is, .order, .limit, .select...).
//      Cada método guarda o que foi pedido e devolve `this`, então dá pra
//      continuar encadeando.
//   3. A Query é "thenable": ela tem um método `.then()`. Por isso o `await`
//      funciona direto nela — quando você dá await, ela EXECUTA tudo que foi
//      acumulado e resolve com o contrato do Supabase: SEMPRE { data, error }.
//      - select + filtros (await direto)      -> data = ARRAY
//      - .maybeSingle()                        -> data = linha | null
//      - .single()                             -> data = linha (error se 0 linhas)
//      - insert(...).select().single()         -> a linha criada
//      - update(...).eq(...).select()          -> array atualizado
//      - delete().eq(...)                      -> { data, error: null }
//   4. Regras de banco que importam pros testes:
//      - id é auto-incremento (bigint) por tabela;
//      - defaults são aplicados no insert (ex.: status 'to_do', created_at=agora);
//      - UNIQUE é enforçado: insert duplicado devolve { error: { code: '23505' } }
//        (mesmo código do Postgres) para os branches de 409 ficarem testáveis.
//
// HELPERS DE TESTE (não existem no supabase real):
//   __reset()             -> zera todas as tabelas e os contadores de id.
//   __seed(tabela, linhas) -> insere linhas direto (aplica defaults + id),
//                             devolve as linhas inseridas (array).
//
// ============================================================================

// ---------------------------------------------------------------------------
// 1) Armazenamento em memória: um array por tabela + contador de id por tabela.
// ---------------------------------------------------------------------------
const TABLES = [
  'sp_users',
  'sp_projects',
  'sp_project_members',
  'sp_sprints',
  'sp_user_stories',
  'sp_invitations',
];

let db = {};        // { sp_users: [linhas...], ... }
let counters = {};  // { sp_users: 3, ... } -> próximo id é counters[t] + 1

function blankDb() {
  const fresh = {};
  const freshCounters = {};
  for (const t of TABLES) {
    fresh[t] = [];
    freshCounters[t] = 0;
  }
  return { fresh, freshCounters };
}

// Inicializa vazio já na carga do módulo.
(() => {
  const { fresh, freshCounters } = blankDb();
  db = fresh;
  counters = freshCounters;
})();

// ---------------------------------------------------------------------------
// 2) Defaults por tabela (aplicados no insert, igual às DEFAULTs do schema).
//    Só preenchem se o campo NÃO veio no objeto inserido.
// ---------------------------------------------------------------------------
function defaultsFor(tabela) {
  switch (tabela) {
    case 'sp_user_stories':
      return { status: 'to_do', story_points: 0, label: 'feature', priority: 0, sprint_id: null, assignee_id: null };
    case 'sp_sprints':
      return { status: 'planning' };
    case 'sp_invitations':
      return { status: 'pending' };
    default:
      return {};
  }
}

// ---------------------------------------------------------------------------
// 3) Regras de UNIQUE por tabela. Cada regra é uma lista de colunas que, juntas,
//    precisam ser únicas. Se uma nova linha colidir com uma existente -> 23505.
// ---------------------------------------------------------------------------
const UNIQUE_RULES = {
  sp_users: [['email'], ['username']],
  sp_project_members: [['project_id', 'user_id']],
};

// Verifica se inserir `linha` em `tabela` viola algum UNIQUE.
function violatesUnique(tabela, linha) {
  const rules = UNIQUE_RULES[tabela] || [];
  for (const cols of rules) {
    const colide = db[tabela].some(existente =>
      cols.every(c => existente[c] === linha[c])
    );
    if (colide) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// 4) Insere UMA linha já validada: aplica defaults, id e created_at.
//    Devolve a linha gravada (ou lança o "erro" 23505 via objeto sentinela).
// ---------------------------------------------------------------------------
const UNIQUE_VIOLATION = { code: '23505', message: 'duplicate key value violates unique constraint' };

function inserirUma(tabela, obj) {
  const defaults = defaultsFor(tabela);
  // Ordem importa: defaults primeiro, depois o que o usuário mandou sobrescreve.
  const linha = { ...defaults, ...obj };

  if (violatesUnique(tabela, linha)) {
    return { erro: UNIQUE_VIOLATION };
  }

  counters[tabela] += 1;
  linha.id = counters[tabela];
  if (linha.created_at === undefined) linha.created_at = new Date().toISOString();

  db[tabela].push(linha);
  return { linha };
}

// ---------------------------------------------------------------------------
// 5) A Query encadeável e "thenable".
//    Guarda a operação (select/insert/update/delete) e a lista de filtros.
//    Só executa quando recebe await (.then) OU .maybeSingle()/.single().
// ---------------------------------------------------------------------------
class Query {
  constructor(tabela) {
    this.tabela = tabela;
    this.op = 'select';      // select | insert | update | delete
    this.payload = null;     // dados de insert/update
    this.filters = [];       // { tipo: 'eq'|'in'|'is', col, val }
    this.orderBy = null;     // { col, ascending }
    this.limitN = null;      // número do .limit()
    this.wantSelect = false; // se houve .select() depois de insert/update/delete
  }

  // ---- operações ----
  select(/* cols */) {
    // No fake, ignoramos a lista de colunas: devolvemos a linha inteira.
    // (Os testes não dependem de projeção de colunas; isso mantém tudo simples.)
    if (this.op === 'select') {
      // select() inicial só marca a intenção; nada a fazer.
    } else {
      this.wantSelect = true; // insert/update/delete + .select() = retornar linhas
    }
    return this;
  }

  insert(objOrArray) {
    this.op = 'insert';
    this.payload = objOrArray;
    return this;
  }

  update(obj) {
    this.op = 'update';
    this.payload = obj;
    return this;
  }

  delete() {
    this.op = 'delete';
    return this;
  }

  // ---- filtros (acumulam e devolvem this) ----
  eq(col, val) {
    this.filters.push({ tipo: 'eq', col, val });
    return this;
  }

  in(col, arr) {
    this.filters.push({ tipo: 'in', col, val: arr });
    return this;
  }

  is(col, val) {
    this.filters.push({ tipo: 'is', col, val });
    return this;
  }

  order(col, opts = {}) {
    this.orderBy = { col, ascending: opts.ascending !== false };
    return this;
  }

  limit(n) {
    this.limitN = n;
    return this;
  }

  // ---- aplica todos os filtros/ordenação/limite numa lista de linhas ----
  _aplicarLeitura(linhas) {
    let resultado = linhas;
    for (const f of this.filters) {
      if (f.tipo === 'eq') {
        // Supabase compara com coerção leve (id numérico vs string da URL).
        // Usamos == proposital para casar Number(5) com "5".
        resultado = resultado.filter(r => r[f.col] == f.val); // eslint-disable-line eqeqeq
      } else if (f.tipo === 'in') {
        resultado = resultado.filter(r => f.val.some(v => v == r[f.col])); // eslint-disable-line eqeqeq
      } else if (f.tipo === 'is') {
        // .is('col', null) -> só linhas onde a coluna é null/undefined
        resultado = resultado.filter(r => (f.val === null ? r[f.col] == null : r[f.col] === f.val));
      }
    }
    if (this.orderBy) {
      const { col, ascending } = this.orderBy;
      resultado = [...resultado].sort((a, b) => {
        if (a[col] < b[col]) return ascending ? -1 : 1;
        if (a[col] > b[col]) return ascending ? 1 : -1;
        return 0;
      });
    }
    if (this.limitN != null) resultado = resultado.slice(0, this.limitN);
    return resultado;
  }

  // ---- executa a query e devolve SEMPRE { data, error } ----
  // `modo` indica como empacotar o data: 'array' | 'maybeSingle' | 'single'.
  _executar(modo) {
    // ----- INSERT -----
    if (this.op === 'insert') {
      const entradas = Array.isArray(this.payload) ? this.payload : [this.payload];
      const criadas = [];
      for (const obj of entradas) {
        const r = inserirUma(this.tabela, obj);
        if (r.erro) return { data: null, error: r.erro };
        criadas.push(r.linha);
      }
      // insert sem .select() -> data null; com .select() -> as linhas criadas
      if (!this.wantSelect) return { data: null, error: null };
      if (modo === 'single') return { data: criadas[0], error: null };
      if (modo === 'maybeSingle') return { data: criadas[0] || null, error: null };
      return { data: criadas, error: null };
    }

    // ----- UPDATE -----
    if (this.op === 'update') {
      const alvos = this._aplicarLeitura(db[this.tabela]);
      for (const linha of alvos) Object.assign(linha, this.payload);
      if (!this.wantSelect) return { data: null, error: null };
      if (modo === 'single') {
        if (alvos.length === 0) return { data: null, error: { code: 'PGRST116', message: 'no rows' } };
        return { data: alvos[0], error: null };
      }
      if (modo === 'maybeSingle') return { data: alvos[0] || null, error: null };
      return { data: alvos, error: null };
    }

    // ----- DELETE -----
    if (this.op === 'delete') {
      const alvos = this._aplicarLeitura(db[this.tabela]);
      const idsParaRemover = new Set(alvos.map(l => l.id));
      db[this.tabela] = db[this.tabela].filter(l => !idsParaRemover.has(l.id));
      return { data: null, error: null };
    }

    // ----- SELECT -----
    const linhas = this._aplicarLeitura(db[this.tabela]);
    if (modo === 'maybeSingle') return { data: linhas[0] || null, error: null };
    if (modo === 'single') {
      if (linhas.length === 0) return { data: null, error: { code: 'PGRST116', message: 'no rows' } };
      return { data: linhas[0], error: null };
    }
    return { data: linhas, error: null };
  }

  // ---- terminadores explícitos ----
  maybeSingle() {
    return Promise.resolve(this._executar('maybeSingle'));
  }

  single() {
    return Promise.resolve(this._executar('single'));
  }

  // ---- torna a Query "thenable": await espera por ela executando como array ----
  then(onFulfilled, onRejected) {
    return Promise.resolve(this._executar('array')).then(onFulfilled, onRejected);
  }
}

// ---------------------------------------------------------------------------
// 6) A API pública do fake: .from(tabela) + os helpers de teste.
// ---------------------------------------------------------------------------
const fakeSupabase = {
  from(tabela) {
    return new Query(tabela);
  },

  // Zera tudo (chamado no beforeEach global de tests/setup.js).
  __reset() {
    const { fresh, freshCounters } = blankDb();
    db = fresh;
    counters = freshCounters;
  },

  // Semeia linhas direto na tabela (aplica defaults + id, igual ao insert).
  // Devolve as linhas efetivamente gravadas (com id), úteis nos testes.
  __seed(tabela, linhas) {
    const arr = Array.isArray(linhas) ? linhas : [linhas];
    const gravadas = [];
    for (const obj of arr) {
      const r = inserirUma(tabela, obj);
      if (r.erro) throw new Error(`__seed: violação de UNIQUE em ${tabela}: ${JSON.stringify(obj)}`);
      gravadas.push(r.linha);
    }
    return gravadas;
  },
};

module.exports = fakeSupabase;
