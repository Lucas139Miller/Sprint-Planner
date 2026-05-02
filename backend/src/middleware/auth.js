// Middleware de autenticação JWT
// Intercepta requisições protegidas, verifica o token e valida que o usuário
// ainda existe no banco. Anexa os dados em req.user para uso nas rotas.
const jwt = require('jsonwebtoken');
const supabase = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'sprint-planner-secret-dev';

// Cache simples de validação de user_id → evita 1 query a cada requisição.
// Token JWT é cacheado por 60s (suficiente para uma sessão ativa).
const userCache = new Map();
const CACHE_TTL_MS = 60_000;

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Token não fornecido' });

  const token = header.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }

  // Valida que o usuário do token ainda existe no banco.
  // Necessário porque token pode ser válido mas apontar para user deletado
  // (ex: banco recriado, conta apagada). Sem isso, queries com FK falham
  // misteriosamente em vez de retornar 401.
  const cached = userCache.get(decoded.id);
  if (cached && cached.expiresAt > Date.now()) {
    req.user = decoded;
    return next();
  }

  const { data: user } = await supabase
    .from('sp_users').select('id').eq('id', decoded.id).maybeSingle();

  if (!user) {
    return res.status(401).json({ error: 'Usuário não encontrado. Faça login novamente.' });
  }

  // Cacheia o user_id como válido por CACHE_TTL_MS para acelerar requisições subsequentes
  userCache.set(decoded.id, { expiresAt: Date.now() + CACHE_TTL_MS });
  req.user = decoded;
  next();
}

module.exports = authMiddleware;
