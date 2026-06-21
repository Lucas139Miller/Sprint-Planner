# Contrato de dados — `data.json`

O dashboard (`index.html`) renderiza **exclusivamente** a partir de um arquivo
`data.json` que segue este contrato. O mesmo formato vale para o exemplo
(`isSample: true`) e para os dados reais gerados por `gen-data.mjs`
(`isSample: false`).

> **Regra de ouro — veracidade.** Número só é apresentado como real quando
> `meta.isSample === false`. Com `true`, o dashboard exibe a tarja
> *"PRÉVIA — DADOS DE EXEMPLO"* e o carimbo *"NÃO AFERIDO"*. Campos
> desconhecidos (grupo, data de apresentação, papéis e contribuições) usam o
> literal `"a definir"` (ou `null` para `commits`). **Nunca inventar.**

---

## Visão geral

```jsonc
{
  "meta":           { ... },        // identificação + estado de veracidade
  "summary":        { ... },        // números-herói (cobertura, unidade, e2e)
  "coverageByFile": [ ... ],        // cobertura linha a linha por arquivo
  "suites":         [ ... ],        // testes de unidade/integração (Jest)
  "e2e":            [ ... ],        // 4 testes ponta a ponta (Cypress)
  "pyramid":        { ... },        // distribuição da suíte
  "ai":             { ... },        // relatório de uso de IA
  "team":           [ ... ]         // membros e divisão de trabalho
}
```

---

## `meta`

| Campo              | Tipo      | Notas |
|--------------------|-----------|-------|
| `project`          | string    | `"Sprint-Planner"`. |
| `course`           | string    | Ex.: `"DCC603 — Engenharia de Software · UFMG"`. |
| `tp`               | string    | Ex.: `"TP2 — Testes Automatizados"`. |
| `generatedAt`      | string    | ISO 8601 (`new Date().toISOString()`). |
| `isSample`         | boolean   | **`true` ⇒ tarja+carimbo de prévia.** `false` ⇒ "AFERIDO". |
| `group`            | string    | Número/identificação do grupo, ou `"a definir"`. |
| `presentationDate` | string    | Data da apresentação, ou `"a definir"`. |

---

## `summary`

```jsonc
"summary": {
  "coverage": {
    "statements": 85.4,   // % comandos        (number | null)
    "branches":   81.2,   // % ramos           (number | null)
    "functions":  87.9,   // % funções         (number | null)
    "lines":      86.1,   // % linhas          (number | null) — numeral-herói
    "threshold":  80      // meta mínima (number) — desenha a cota
  },
  "unit": {
    "passed":     20,     // testes que passaram   (number | null)
    "failed":     0,      // testes que falharam   (number | null)
    "skipped":    1,      // testes pulados/pendentes (number | null) — exibido se > 0
    "total":      21,     // total = passed+failed+skipped (Jest numTotalTests inclui pendentes)
    "durationMs": 2342    // duração total em ms    (number | null)
  },
  "e2e": {
    "passed": 4,
    "failed": 0,
    "total":  4           // fixo em 4 neste TP
  }
}
```

- O **numeral colossal** da seção 01 usa `coverage.lines` (cai para
  `statements` se `lines` faltar). Vira **verde-petróleo `--good`** quando
  `≥ threshold` (estado positivo, frio) e **vermelho `--accent`** quando
  abaixo da meta. A cota de 80% é uma linha de referência **neutra** (não
  vermelha): a meta vira posição, não cor.
- `unit.total` deve fechar com `passed + failed + skipped` (o Jest conta
  pendentes em `numTotalTests`). `skipped > 0` aparece no placar como
  "N pulado(s)" — nunca escondido.
- `coverage` ausente ⇒ "cobertura não disponível" (sem 0% falso).

---

## `coverageByFile[]`

Uma entrada por arquivo de origem. Os 9 arquivos reais esperados:

```
src/routes/auth.js   src/routes/projects.js   src/routes/sprints.js
src/routes/stories.js   src/routes/invitations.js   src/routes/dashboard.js
src/routes/ai.js   src/middleware/auth.js   src/database.js
```

```jsonc
{ "file": "src/routes/auth.js", "statements": 91.3, "branches": 84.6, "functions": 95.0, "lines": 92.1 }
```

Percentuais `< threshold` recebem destaque (`--accent-ink` + triângulo `▸`).
Cada coluna é **ordenável** (clique/teclado, com `aria-sort`).
Distingue cobertura de **comando** (statements) vs **ramo** (branches).

---

## `suites[]` — unidade & integração (Jest + supertest)

```jsonc
{
  "name": "Autenticação — registro e login",
  "file": "tests/auth.test.js",
  "tests": [
    {
      "name": "registra um novo usuário e retorna token JWT",
      "status": "passed",            // "passed" | "failed" | "skipped"
      "durationMs": 142,
      "pinned": true,                // (opcional) fixa expandido + pill "apresentar".
                                     //   Não vem do Jest --json: é enriquecimento
                                     //   manual (enrich.json) — ver gen-data.mjs.
      "code": "it('...', () => { ... })",   // código-fonte do teste (string)
      "explanation": "Verifica que ..."     // explicação PT-BR (nota de revisor)
    }
  ]
}
```

- **Glifos de status (nunca só cor):** passou = `─` (tinta), falhou = `●`
  (vermelho, sempre óbvio), pulado = `┄` (cinza).
- Testes `failed` sobem ao topo da suíte.
- `pinned: true` ⇒ fita lateral vermelha + pré-expandido (apoia "explicar 2 testes").
- `<details>` mostra a `explanation` como nota recuada + o `code` com numeração de linha.

---

## `e2e[]` — ponta a ponta (Cypress) — **4 itens**

Ordem esperada:
1. Registro + Login
2. Criar projeto
3. Backlog: criar história + mover no Kanban (To Do → Done)
4. Criar sprint + mover história

```jsonc
{
  "name": "Backlog: criar história e mover no Kanban (To Do → Done)",
  "status": "passed",
  "durationMs": 4106,
  "steps": [ "Acessa o backlog", "Cria história", "Arrasta To Do → Done", "Confirma após recarregar" ],
  "screenshot": "cypress/screenshots/backlog.png",   // "" ⇒ "captura não disponível"
  "video": "cypress/videos/backlog.mp4",             // "" ⇒ "vídeo não disponível"
  "code": "it('...', () => { ... })",
  "explanation": "É o teste E2E mais completo: ..."
}
```

- **Screenshot ausente ⇒ placeholder honesto hachurado** (nunca imagem falsa).
- **Vídeo** abre em `<dialog>` modal (ESC fecha; fallback: abre em nova aba).

---

## `pyramid`

```jsonc
{ "unit": 14, "integration": 7, "e2e": 4 }   // e2e fixo em 4; unit + integration = total Jest
```

Três faixas horizontais, largura ∝ contagem, em tinta pura (sem cores de
gráfico). `unit` é **só unidade pura** e `integration` é **só integração** —
o `gen-data.mjs` os deriva por etiqueta (`tests/unit/` vs `tests/integration/`)
e **nunca** despeja o total do Jest em `unit`. Se não houver etiqueta, `unit`
**e** `integration` ficam `null` e o dashboard renderiza **"a definir"** (barra
zerada) — o script não inventa a divisão.

---

## `ai`

```jsonc
{
  "summary": "A equipe utilizou IA (Gemini) como par de programação ...",
  "pros":    [ "Acelerou ...", "Ajudou ..." ],
  "cons":    [ "Sugeriu asserts genéricos ...", "APIs desatualizadas ..." ]
}
```

`summary` com **dropcap** vermelho (detalhe editorial); `pros` com traço `─`,
`cons` com ponto `●` vermelho. Selo discreto "GEMINI". Sem emoji/robô.

---

## `team[]` — **4 membros reais**

```jsonc
{
  "name": "Rafael Araujo Camargo Pinheiro",
  "role": "a definir",                 // string | "a definir"
  "contributions": ["a definir"],      // string[] | ["a definir"]
  "commits": null                      // number | null  (null ⇒ "—", nunca 0)
}
```

Nomes (do README, exatos):
`Gabriel Camargos da Silveira`, `Lucas Miller dos Santos Sousa`,
`Miguel Eduardo Tang`, `Rafael Araujo Camargo Pinheiro`.

`role`/`contributions === "a definir"` e `commits === null` são renderizados
pelo sentinela `renderField()` como itálico apagado / `—` — **jamais inventa**.

---

## Sentinela de honestidade (`renderField`)

No `index.html`:

```js
function isTBD(v){ return v == null || v === "a definir"; }
function renderField(v){
  if (isTBD(v)) return '<span class="tbd">a definir</span>';
  return esc(v);
}
```

Qualquer campo desconhecido cai aqui e aparece como **"a definir"** literal,
nunca como um valor fabricado.
