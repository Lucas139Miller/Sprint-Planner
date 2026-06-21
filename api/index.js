// Handler serverless da Vercel. Captura todas as requisições /api/* via
// rewrite no vercel.json e delega ao Express app que já tem as rotas montadas.
// O Express é compatível porque sua signature (req, res, next) já é o que
// a Vercel espera de uma serverless function.
module.exports = require('../backend/src/app');
