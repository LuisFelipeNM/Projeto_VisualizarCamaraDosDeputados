echo "[SISTEMA] Iniciando Servidor e Frontend..."

node server.js &
BACKEND_PID=$!

npm run dev

trap "kill $BACKEND_PID" EXIT