@echo off
chcp 65001 >nul
title Sprint Planner - Testes Automatizados
cd /d "%~dp0backend"

echo ============================================================
echo   SPRINT PLANNER - Suite de Testes
echo   Unidade + Integracao (banco FAKE em memoria)
echo   NAO inclui o E2E do site (Cypress)
echo ============================================================
echo.

if not exist "node_modules" (
  echo [setup] Instalando dependencias do backend pela primeira vez...
  call npm install
  echo.
)

echo [run] Rodando Jest com cobertura...
echo.
call npm run test:coverage
set "RESULTADO=%errorlevel%"

echo.
if "%RESULTADO%"=="0" (
  echo ============================================================
  echo   [OK] TODOS OS TESTES PASSARAM ^(cobertura ^>= 80%%^)
  echo   Relatorio HTML: backend\coverage\lcov-report\index.html
  echo ============================================================
) else (
  echo ============================================================
  echo   [X] ALGUM TESTE FALHOU - veja o log acima
  echo ============================================================
)
echo.
pause
