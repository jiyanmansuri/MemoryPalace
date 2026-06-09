@echo off
echo Starting Backend...
start cmd /k "cd backend && .\.venv\Scripts\uvicorn main:app --reload --port 8000"

echo Starting Elder UI...
start cmd /k "cd frontend-elder && npm run dev -- --port 3000"

echo Starting Family Dashboard...
start cmd /k "cd frontend-family && npm run dev -- --port 3001"

echo All services started!
echo Backend: http://localhost:8000
echo Elder UI: http://localhost:3000
echo Family UI: http://localhost:3001
