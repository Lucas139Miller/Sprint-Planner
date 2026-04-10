// Middleware de autenticação JWT
// Intercepta requisições protegidas e verifica se o token é válido
// Se válido, anexa os dados do usuário em req.user para uso nas rotas
const jwt = require('jsonwebtoken');

// Mesma chave secreta usada para assinar os tokens em routes/auth.js
const JWT_SECRET = process.env.JWT_SECRET || 'sprint-planner-secret-dev';

function authMiddleware(req, res, next) {
  // O token vem no header Authorization no formato: "Bearer eyJhbGci..."
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  // Extrai apenas o token, removendo o prefixo "Bearer "
  const token = header.split(' ')[1];

  try {
    // jwt.verify decodifica o token e verifica a assinatura
    // Se o token foi alterado ou expirou, lança um erro
    const decoded = jwt.verify(token, JWT_SECRET);

    // Anexa os dados do usuário (id, username) ao objeto da requisição
    // Assim, qualquer rota protegida pode acessar req.user.id
    req.user = decoded;
    next(); // Continua para a próxima função (a rota em si)
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

module.exports = authMiddleware;
