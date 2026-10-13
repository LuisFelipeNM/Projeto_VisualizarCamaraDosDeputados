@echo off

echo [SISTEMA] Iniciando API Python (FastAPI)...
start "API Python" cmd /k "call visualizar_camara\Scripts\activate && python -m uvicorn api_analise:app --reload --port 8000"

echo [SISTEMA] Iniciando Servidor Node.js...
start "Backend Node" cmd /k "node server.js"

echo [SISTEMA] Iniciando Frontend...
npm run dev

pause