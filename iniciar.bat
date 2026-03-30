@echo off

echo [SISTEMA] Iniciando Servidor e Frontend...
:: O comando abaixo roda o server em segundo plano e o dev na janela atual
start /min "Backend" cmd /c "node server.js"
npm run dev

pause