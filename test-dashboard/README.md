# Dashboard de Resultados de Testes — Sprint-Planner (TP2 · DCC603 · UFMG)

Dashboard estático, em **um único `index.html` autocontido**, que apresenta os
resultados de testes do projeto **Sprint-Planner** (app de gestão Scrum):

- **Cobertura** do backend (meta ≥ 80%) — numeral colossal + régua com a cota de 80%
- **Unidade & integração** (Jest + supertest) — placar + suítes expansíveis com código e explicação
- **4 testes E2E** (Cypress) — passos, captura, vídeo, código
- **Pirâmide de testes** — distribuição da suíte
- **Uso de IA** — relatório crítico (pontos positivos/limitações)
- **Equipe** — divisão de trabalho por membro

Direção visual: *"prova de impressão de relatório técnico de auditoria"* — grade
Swiss, tinta sobre papel creme, crop marks, numerais editoriais. Sem build, sem
dependências instaladas: abre com **duplo-clique** e hospeda como estático.

> **Regra de ouro — veracidade.** Nenhum resultado é inventado. Enquanto os dados
> forem de exemplo, `data.json` traz `meta.isSample: true` e o dashboard exibe a
> tarja **"PRÉVIA — DADOS DE EXEMPLO"** e o carimbo **"NÃO AFERIDO"**. Os números
> só são apresentados como reais quando `isSample: false` (gerado de artefatos
> reais por `gen-data.mjs`). Grupo, data de apresentação, papéis e contribuições
> ficam como **"a definir"** até serem conhecidos.

---

## Arquivos

| Arquivo           | O que é |
|-------------------|---------|
| `index.html`      | O dashboard inteiro (HTML + CSS + JS inline). Faz `fetch('./data.json')` e renderiza. |
| `data.json`       | Dados de **exemplo** (`isSample: true`) — para a prévia visual. |
| `gen-data.mjs`    | Script Node que lê artefatos reais (Istanbul + Jest + Cypress) e emite `data.json` com `isSample: false`. |
| `data.schema.md`  | Documentação do contrato de dados. |
| `README.md`       | Este arquivo. |

---

## 1) Abrir localmente (sem servidor)

Basta **duplo-clique** em `index.html`.

- O dashboard tenta `fetch('./data.json')`. Quando aberto via `file://`, alguns
  navegadores **bloqueiam** esse fetch por política de CORS. Para isso há um
  **fallback embutido**: `window.__DATA__` dentro do próprio `index.html` é usado
  automaticamente quando o fetch falha. **Funciona offline, sem nada instalado.**
- O fallback é mantido em sincronia com o `data.json` de exemplo.

### Servir local (recomendado para ver o `data.json` real ser carregado)

```bash
# qualquer um destes, na pasta do projeto:
npx serve .
# ou
python -m http.server 8080
# ou
php -S localhost:8080
```
Depois abra `http://localhost:8080`.

> Quando servido por HTTP, o `fetch('./data.json')` funciona e o `window.__DATA__`
> não é usado — útil para validar dados reais sem reabrir o HTML.

---

## 2) Plugar dados REAIS (rodar testes → `gen-data.mjs` → `data.json`)

O `gen-data.mjs` converte os artefatos da execução real para o contrato e marca
`meta.isSample: false`.

### 2.1 Gerar os artefatos no backend

```bash
cd backend

# Jest + cobertura Istanbul + saída JSON
npx jest --coverage --json --outputFile=jest-results.json
#   -> coverage/coverage-summary.json   (Istanbul)
#   -> jest-results.json                (resultados Jest)

# Cypress com reporter mochawesome (ajuste seu cypress.config)
npx cypress run --reporter mochawesome --reporter-options "json=true"
#   -> cypress/results/mochawesome.json
```

> Garanta no `jest.config`/`package.json`:
> `coverageReporters: ["json-summary", "text"]` (para gerar `coverage-summary.json`).
> No `cypress.config`, configure o reporter `mochawesome` com `json: true`.

### 2.2 Rodar o gerador

```bash
# a partir da raiz deste dashboard:
node gen-data.mjs \
  --coverage backend/coverage/coverage-summary.json \
  --jest     backend/jest-results.json \
  --cypress  backend/cypress/results/mochawesome.json \
  --out      data.json
```

Todos os caminhos têm defaults; ajuste aos do repositório real (procure os
`TODO` comentados em PT-BR dentro de `gen-data.mjs`).

O script:
- Mapeia cobertura total + por arquivo (os 9 arquivos de rota/middleware/db reais).
- Mapeia testes Jest para `suites[]` (passa/falha/pulado + duração).
- Mapeia os 4 testes Cypress para `e2e[]`.
- Deriva a pirâmide e o `summary`.
- Mantém **`group`, `presentationDate`, `ai.summary` e `team[].role/contributions`
  como "a definir"** — você preenche manualmente quando souber. **Nada é inventado.**

### 2.3 Enriquecer `code` + `explanation` (opcional, recomendado)

Jest/Cypress JSON **não** trazem o código-fonte de cada teste nem a explicação
PT-BR. Para exibi-los (apoia o "explicar 2 testes" na banca), use um
`enrich.json` mapeando `nome do teste → { code, explanation }` e funda no script
(há um exemplo comentado no fim de `gen-data.mjs`). Isso **não** altera números.

### 2.4 Sincronizar o fallback offline

Se for usar o arquivo via `file://` com dados reais, atualize também o bloco
`window.__DATA__` no `index.html` com o conteúdo do novo `data.json` (ou sempre
sirva por HTTP/Vercel, onde o fetch funciona e o fallback é dispensável).

---

## 3) Publicar estático na Vercel

Projeto 100% estático — sem framework, sem build.

### Via dashboard da Vercel
1. Suba esta pasta para um repositório Git (GitHub/GitLab).
2. Na Vercel: **Add New… → Project → Import** o repositório.
3. **Framework Preset:** `Other`. **Build Command:** *(vazio)*.
   **Output Directory:** `.` (raiz). **Install Command:** *(vazio)*.
4. Deploy. A Vercel serve `index.html` na raiz e o `fetch('./data.json')` funciona.

### Via CLI
```bash
npm i -g vercel
vercel        # preview
vercel --prod # produção
```

> Opcional: um `vercel.json` mínimo não é necessário — a detecção estática já
> serve `index.html` + `data.json` corretamente. Como é servido por HTTPS, o
> `fetch('./data.json')` sempre funciona (o fallback `window.__DATA__` só entra
> em cena no `file://`).

---

## Acessibilidade & responsividade

- Contraste AA/AAA; status por **glifo + texto + tom** (não só cor).
- Navegável por teclado (colunas ordenáveis, linhas de teste e fichas focáveis,
  `<dialog>` com ESC).
- `prefers-reduced-motion`: desliga todo movimento e mostra os valores finais.
- `prefers-contrast: more`: remove grão e reforça as hairlines.
- Responsivo do mobile ao **projetor de sala** (≥1600px com numerais ampliados).
