// Entry point para desenvolvimento local. Em produção (Vercel), o handler
// serverless é api/index.js, que importa diretamente o app sem listen.
const app = require('./app');
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Sprint Planner API rodando na porta ${PORT}`);
});
