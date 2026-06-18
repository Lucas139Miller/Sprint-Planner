#!/usr/bin/env node
// =====================================================================
// gen-data.mjs — gera data.json (isSample=false) a partir de artefatos REAIS
//
// LÊ:
//   1) backend/coverage/coverage-summary.json  (Istanbul / `jest --coverage`)
//   2) saída do Jest em JSON                    (`jest --json --outputFile=...`)
//   3) relatório mochawesome do Cypress (JSON)  (`cypress run` + mochawesome)
//
// EMITE:
//   data.json  no formato do contrato, com meta.isSample = false
//
// REGRA DE OURO — VERACIDADE:
//   Este script SÓ deve rodar sobre artefatos de uma execução real.
//   Campos ainda desconhecidos (grupo, data de apresentação, papéis e
//   contribuições dos membros) permanecem como "a definir" / null.
//   JAMAIS inventa número.
//
// USO:
//   node gen-data.mjs \
//     --coverage backend/coverage/coverage-summary.json \
//     --jest     backend/jest-results.json \
//     --cypress  backend/cypress/results/mochawesome.json \
//     --out      data.json
//
//   (todos os caminhos têm defaults; ajuste conforme o layout do repo)
// =====================================================================

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------
// 0) Parsing simples de argumentos --chave valor
// ---------------------------------------------------------------------
function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
      out[key] = val;
    }
  }
  return out;
}
const args = parseArgs(process.argv);

// Caminhos dos artefatos. TODO: ajustar aos caminhos reais do repo backend.
const PATHS = {
  coverage: args.coverage || "backend/coverage/coverage-summary.json",
  jest:     args.jest     || "backend/jest-results.json",
  cypress:  args.cypress  || "backend/cypress/results/mochawesome.json",
  out:      args.out      || "data.json",
};

const THRESHOLD = Number(args.threshold || 80);
const TBD = "a definir";

// Os 9 arquivos de origem reais cuja cobertura interessa exibir.
// (auth.js, projects.js, sprints.js, stories.js, invitations.js,
//  dashboard.js, ai.js, middleware/auth.js, database.js)
const SOURCE_FILES = [
  "src/routes/auth.js",
  "src/routes/projects.js",
  "src/routes/sprints.js",
  "src/routes/stories.js",
  "src/routes/invitations.js",
  "src/routes/dashboard.js",
  "src/routes/ai.js",
  "src/middleware/auth.js",
  "src/database.js",
];

// ---------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------
async function readJSON(p) {
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(await readFile(p, "utf8"));
  } catch (e) {
    console.warn(`[gen-data] aviso: falha ao ler/parsear ${p}: ${e.message}`);
    return null;
  }
}
function round1(n) {
  return n == null ? null : Math.round(Number(n) * 10) / 10;
}
// Normaliza um caminho absoluto do Istanbul para o caminho relativo "src/..."
function normalizeFile(absPath) {
  const norm = String(absPath).replace(/\\/g, "/");
  const idx = norm.lastIndexOf("/src/");
  if (idx >= 0) return norm.slice(idx + 1); // remove a "/" inicial -> "src/..."
  // fallback: tenta achar pela base
  const base = norm.split("/").slice(-2).join("/");
  return base;
}

// ---------------------------------------------------------------------
// 1) COBERTURA (Istanbul coverage-summary.json)
//    Estrutura: { total: {...}, "<absPath>": { lines:{pct}, statements:{pct}, functions:{pct}, branches:{pct} }, ... }
// ---------------------------------------------------------------------
function mapCoverage(istanbul) {
  if (!istanbul) {
    return { summary: null, byFile: [] };
  }
  const total = istanbul.total || {};
  const summary = {
    statements: round1(total.statements?.pct),
    branches:   round1(total.branches?.pct),
    functions:  round1(total.functions?.pct),
    lines:      round1(total.lines?.pct),
    threshold:  THRESHOLD,
  };

  // mapeia por arquivo, indexando pelo caminho normalizado
  const indexed = {};
  for (const [k, v] of Object.entries(istanbul)) {
    if (k === "total") continue;
    const rel = normalizeFile(k);
    indexed[rel] = {
      file: rel,
      statements: round1(v.statements?.pct),
      branches:   round1(v.branches?.pct),
      functions:  round1(v.functions?.pct),
      lines:      round1(v.lines?.pct),
    };
  }

  // monta a lista na ordem canônica dos 9 arquivos; só inclui os presentes
  const byFile = [];
  for (const f of SOURCE_FILES) {
    if (indexed[f]) byFile.push(indexed[f]);
  }
  // inclui também arquivos extras que apareçam no relatório (sem inventar)
  for (const rel of Object.keys(indexed)) {
    if (!SOURCE_FILES.includes(rel) && rel.startsWith("src/")) {
      byFile.push(indexed[rel]);
    }
  }

  return { summary, byFile };
}

// ---------------------------------------------------------------------
// 2) UNIDADE / INTEGRAÇÃO (Jest --json)
//    Estrutura: { numPassedTests, numFailedTests, numTotalTests,
//                 testResults: [ { name, assertionResults:[ {title, status, duration} ] } ] }
// ---------------------------------------------------------------------
function mapJest(jest) {
  if (!jest) {
    return {
      unit: { passed: null, failed: null, skipped: null, total: null, durationMs: null },
      suites: [],
    };
  }

  const unit = {
    passed: jest.numPassedTests ?? null,
    failed: jest.numFailedTests ?? null,
    // pulados/pendentes (it.skip / it.todo) — Jest os conta em numTotalTests,
    // então NUNCA escondemos um pulado: o total fecha com passed+failed+skipped.
    skipped: (jest.numPendingTests ?? 0) + (jest.numTodoTests ?? 0),
    total:  jest.numTotalTests ?? null,
    // duração total: diferença entre fim e início, se disponível
    durationMs:
      jest.startTime && jest.testResults?.length
        ? Math.max(
            0,
            Math.max(...jest.testResults.map((t) => t.endTime || 0)) - jest.startTime
          )
        : null,
  };

  const suites = (jest.testResults || []).map((suite) => {
    const file = normalizeFile(suite.name || suite.testFilePath || "");
    // nome amigável da suíte: usa o describe de topo se houver, senão o arquivo
    const topTitle =
      suite.assertionResults?.[0]?.ancestorTitles?.[0] || path.basename(file);

    const tests = (suite.assertionResults || []).map((a) => ({
      name: a.title,
      status:
        a.status === "passed"
          ? "passed"
          : a.status === "failed"
          ? "failed"
          : "skipped", // pending/skipped/todo
      durationMs: a.duration != null ? Math.round(a.duration) : 0,
      // TODO: Jest --json NÃO inclui o código-fonte do teste, explicação, nem o
      // flag `pinned` (usado pelo dashboard p/ a pill "apresentar" + <details>
      // pré-expandido nos 2 testes que o grupo vai explicar na banca).
      // Esses 3 campos (code, explanation, pinned) vêm do ENRIQUECIMENTO abaixo.
      code: "",
      explanation: "",
      pinned: false,
    }));

    return { name: topTitle, file, tests };
  });

  return { unit, suites };
}

// ---------------------------------------------------------------------
// 3) E2E (Cypress + mochawesome JSON)
//    Estrutura mochawesome: { results:[ { suites:[ { tests:[ {title, state, duration, code} ] } ] } ] }
//    Os 4 testes esperados: Registro+Login, Criar projeto,
//    Backlog (criar história + mover Kanban To Do->Done), Criar sprint + mover história.
// ---------------------------------------------------------------------
function mapCypress(mocha) {
  if (!mocha) return [];

  // achata todos os testes de todas as suítes de todos os results
  const flat = [];
  function walkSuite(suite) {
    (suite.tests || []).forEach((t) => flat.push(t));
    (suite.suites || []).forEach(walkSuite);
  }
  (mocha.results || []).forEach((r) => {
    (r.suites || []).forEach(walkSuite);
    // mochawesome às vezes coloca tests direto em result
    (r.tests || []).forEach((t) => flat.push(t));
  });

  return flat.map((t) => {
    const status =
      t.state === "passed" ? "passed" : t.state === "failed" ? "failed" : "skipped";
    return {
      name: t.fullTitle || t.title,
      status,
      durationMs: t.duration != null ? Math.round(t.duration) : 0,
      // TODO: passos legíveis não vêm do mochawesome — descrever manualmente
      // ou extrair de cy.log()/título. Deixe como [] se ainda não houver.
      steps: [],
      // TODO: apontar para o screenshot/vídeo reais gerados pelo Cypress
      // (ex.: cypress/screenshots/<spec>/<title>.png e cypress/videos/<spec>.mp4).
      // Mantém vazio => o dashboard mostra "captura/vídeo não disponível" honestamente.
      screenshot: "",
      video: "",
      code: t.code || "",
      explanation: "",
    };
  });
}

// ---------------------------------------------------------------------
// 4) PIRÂMIDE — derivada dos dados reais
//    e2e fixo em 4 (conforme contrato). unit/integration: heurística a
//    partir do total de testes Jest. Como o Jest não rotula
//    "unidade" vs "integração", documentamos a divisão.
// ---------------------------------------------------------------------
function mapPyramid(suites, e2eCount) {
  // Semântica: `unit` = SÓ testes de unidade pura; `integration` = SÓ integração.
  // NÃO jogar o total do Jest em `unit` (isso contaria a integração duas vezes
  // e a barra "Integração" cairia para 0 silenciosamente).
  //
  // Heurística por etiqueta real: se a suíte estiver sob tests/unit/ vs
  // tests/integration/ (ou o file contiver esses segmentos), some por etiqueta.
  // Sem QUALQUER etiqueta, deixamos AMBOS como null => o dashboard mostra
  // "a definir" em vez de números inventados.
  let unit = 0,
    integration = 0,
    labeled = false;
  for (const s of suites || []) {
    const f = String(s.file || "").replace(/\\/g, "/");
    const n = (s.tests || []).length;
    if (/\/unit\/|\.unit\./.test(f) || /tests\/unit/.test(f)) {
      unit += n;
      labeled = true;
    } else if (/\/integration\/|\.int(egration)?\./.test(f) || /tests\/integration/.test(f)) {
      integration += n;
      labeled = true;
    }
  }
  return {
    unit: labeled ? unit : null, // a definir se não houver etiqueta
    integration: labeled ? integration : null, // idem
    e2e: e2eCount != null ? e2eCount : 4,
  };
}

// ---------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------
async function main() {
  const [istanbul, jest, mocha] = await Promise.all([
    readJSON(PATHS.coverage),
    readJSON(PATHS.jest),
    readJSON(PATHS.cypress),
  ]);

  if (!istanbul && !jest && !mocha) {
    console.error(
      "[gen-data] ERRO: nenhum artefato encontrado. Rode os testes primeiro:\n" +
        "  cd backend && npx jest --coverage --json --outputFile=jest-results.json\n" +
        "  npx cypress run   (com reporter mochawesome)\n" +
        "Caminhos esperados:\n" +
        `  ${PATHS.coverage}\n  ${PATHS.jest}\n  ${PATHS.cypress}`
    );
    process.exit(1);
  }

  const { summary: coverageSummary, byFile } = mapCoverage(istanbul);
  const { unit, suites } = mapJest(jest);
  const e2e = mapCypress(mocha);

  const e2ePassed = e2e.filter((e) => e.status === "passed").length;
  const e2eTotal = e2e.length || 4;

  const data = {
    meta: {
      project: "Sprint-Planner",
      course: "DCC603 — Engenharia de Software · UFMG",
      tp: "TP2 — Testes Automatizados",
      generatedAt: new Date().toISOString(),
      isSample: false, // <<< artefatos REAIS
      group: TBD, // ainda não conhecido — jamais inventar
      presentationDate: TBD, // idem
    },
    summary: {
      coverage: coverageSummary || {
        statements: null,
        branches: null,
        functions: null,
        lines: null,
        threshold: THRESHOLD,
      },
      unit,
      e2e: { passed: e2ePassed, failed: e2eTotal - e2ePassed, total: e2eTotal },
    },
    coverageByFile: byFile,
    suites,
    e2e,
    pyramid: mapPyramid(suites, e2eTotal),
    ai: {
      // TODO: este texto é o relatório de uso de IA da equipe. Não é número
      // de execução — preencha com o relato real do grupo (mantido fora dos
      // artefatos de teste de propósito).
      summary: TBD,
      pros: [],
      cons: [],
    },
    team: [
      { name: "Gabriel Camargos da Silveira", role: TBD, contributions: [TBD], commits: null },
      { name: "Lucas Miller dos Santos Sousa", role: TBD, contributions: [TBD], commits: null },
      { name: "Miguel Eduardo Tang", role: TBD, contributions: [TBD], commits: null },
      { name: "Rafael Araujo Camargo Pinheiro", role: TBD, contributions: [TBD], commits: null },
    ],
  };

  await writeFile(PATHS.out, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`[gen-data] data.json gerado em ${path.resolve(PATHS.out)} (isSample=false)`);
  console.log(
    `[gen-data] cobertura(linhas): ${data.summary.coverage.lines ?? "—"}% · ` +
      `unidade: ${unit.passed ?? "—"}/${unit.total ?? "—"} · E2E: ${e2ePassed}/${e2eTotal}`
  );

  // Lembrete honesto de campos que continuam "a definir"
  console.log(
    "[gen-data] LEMBRETE: group, presentationDate, ai.summary e team[].role/contributions " +
      "permanecem 'a definir' — preencha manualmente quando conhecidos. Nada foi inventado."
  );
}

// =====================================================================
// ENRIQUECIMENTO (opcional, recomendado para a apresentação)
// ---------------------------------------------------------------------
// O Jest --json e o mochawesome não trazem o CÓDIGO-FONTE de cada teste,
// uma EXPLICAÇÃO em PT-BR, nem o flag `pinned`. Para o dashboard mostrar
// `code` + `explanation` e marcar os 2 testes que o grupo vai EXPLICAR na
// banca (`pinned: true` => pill "apresentar" + <details> pré-expandido),
// há 2 caminhos, ambos SEM inventar resultado:
//
//   (a) Manter um arquivo `enrich.json` no repo, mapeando
//       { "nome exato do teste": { code, explanation, pinned } }, e fundir aqui.
//   (b) Ler o arquivo-fonte do teste e extrair o bloco it()/describe()
//       pelo título (parsing por regex/AST).
//
// Exemplo de fusão por (a) — descomente e ajuste o caminho.
// O Object.assign abaixo cobre code/explanation/pinned de uma vez:
//
//   const enrich = (await readJSON("enrich.json")) || {};
//   for (const suite of suites)
//     for (const t of suite.tests)
//       if (enrich[t.name]) Object.assign(t, enrich[t.name]); // <- pinned incluído
//   for (const e of e2e)
//       if (enrich[e.name]) Object.assign(e, enrich[e.name]);
//
// Isto NÃO afeta os números (passa/falha/cobertura) — apenas anexa
// descrição textual e o destaque de apresentação. O flag isSample continua false.
// =====================================================================

main().catch((e) => {
  console.error("[gen-data] ERRO fatal:", e);
  process.exit(1);
});
