#!/bin/sh
# Script de setup pós-clone. Configura hooks do git para auto-deploy na Vercel.
# Rode uma vez após clonar o repo: bash scripts/setup.sh

set -e

echo "📌 Configurando hooks do git..."
git config core.hooksPath .githooks
chmod +x .githooks/pre-push 2>/dev/null || true

echo "✅ Hooks instalados. Toda vez que rodar 'git push':"
echo "   1. Vercel CLI faz deploy de produção"
echo "   2. Se deploy passar, push prossegue"
echo "   3. Se falhar, push é cancelado"
echo ""
echo "   Para pular deploy num push específico: git push --no-verify"
