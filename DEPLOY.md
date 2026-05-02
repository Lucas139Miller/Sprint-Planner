# Deploy na Vercel

## ⚡ Auto-deploy a cada `git push`

O repo tem um hook git em `.githooks/pre-push` que **dispara deploy de produção na Vercel toda vez que você dá `git push`**. Se o deploy falhar, o push é cancelado.

### Setup (1x após clone)
```bash
bash scripts/setup.sh
```

Ou manual:
```bash
git config core.hooksPath .githooks
```

### Pular deploy num push específico
```bash
git push --no-verify
```

---


## Arquitetura
- **Frontend**: build estático do Vite servido pela CDN da Vercel
- **Backend**: Express convertido em **serverless function** (`api/index.js`)
- **Mesmo domínio**: `/api/*` é roteado internamente para a função (sem CORS)
- **Banco**: Supabase (já está na nuvem, nada a mudar)

```
┌────────────────────────────────────────────┐
│ Vercel (CDN)                               │
│  ├─ frontend/dist/* (HTML, JS, CSS)        │
│  └─ /api/* → serverless function           │
│             └─ backend/src/app.js (Express)│
│                  └─ Supabase + Gemini      │
└────────────────────────────────────────────┘
```

## Passo a passo

### 1. Importar repositório na Vercel
1. Acesse https://vercel.com/new
2. Selecione o repo **Lucas139Miller/Sprint-Planner**
3. Framework Preset: **Other** (a Vercel detecta `vercel.json` automaticamente)
4. Não mude **Build/Output/Install Command** — já configurados em `vercel.json`

### 2. Configurar variáveis de ambiente

Em **Project Settings → Environment Variables**, adicione (todas em "Production, Preview, Development"):

| Nome | Valor |
|------|-------|
| `SUPABASE_URL` | `https://smncejhkzlpajujkvton.supabase.co` |
| `SUPABASE_KEY` | `sb_publishable_Px-UJsiIQos_NMb8IYnQgg_Rq0wMUTX` |
| `JWT_SECRET` | gere com `openssl rand -base64 32` |
| `GEMINI_API_KEY` | sua chave do Google AI Studio |

> ⚠️ **NÃO** commite essas variáveis. O arquivo `backend/.env` está no `.gitignore`.

### 3. Deploy

Cliquem em **Deploy**. Após ~1 min:
- Frontend acessível em `https://<seu-projeto>.vercel.app`
- Backend em `https://<seu-projeto>.vercel.app/api/*`

### 4. Verificar

```bash
curl https://<seu-projeto>.vercel.app/api/health
# {"status":"ok"}
```

## Como funciona localmente

Não muda nada — o setup local continua usando `backend/.env` e o servidor Express tradicional na porta 3001:

```bash
# Terminal 1
cd backend && npm install && npm run dev

# Terminal 2
cd frontend && npm install && npx vite --port 5173
```

Em dev, o frontend lê `VITE_API_URL` (default `http://localhost:3001`).
Em prod (Vercel), `frontend/.env.production` define `VITE_API_URL=""` para usar paths relativos.

## Arquivos-chave do deploy

- `vercel.json` — config de build, output, rewrites e função serverless
- `api/index.js` — entry point serverless que reusa o Express app
- `backend/src/app.js` — Express app sem `listen` (reusável)
- `backend/src/server.js` — listen para dev local (chama o app)
- `frontend/.env.production` — `VITE_API_URL=""` para paths relativos

## Limites da Vercel (free tier)

- Função serverless: **10s de timeout** (configurado pra 30s no `vercel.json`, mas free tier reverte para 10s)
- **Cold start** após inatividade — primeira requisição é mais lenta
- Para evitar limites em produção real, considere:
  - Render.com / Railway para backend always-on
  - Upgrade Vercel Pro para funções de 60s+
