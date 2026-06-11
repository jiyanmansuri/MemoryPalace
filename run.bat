@echo off
echo Starting Backend...
start cmd /k "cd backend && .\.venv\Scripts\uvicorn main:app --reload --port 8000"

echo Starting Unified Frontend...
start cmd /k "cd frontend && npm run dev -- --port 3000"

echo Waiting for servers to start...
timeout /t 3 /nobreak > nul

echo Opening browser tabs...
start http://localhost:3000
start http://localhost:8000/docs

echo All services started!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
