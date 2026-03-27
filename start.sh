#!/bin/bash
echo "Starting GP-TSM Project..."

# Ensure venv exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# Install dependencies (fast if already installed)
echo "Checking dependencies..."
pip install -r backend/requirements.txt

# Start Backend
echo "Starting Backend (FastAPI)..."
uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-5000} --workers 1 &
BACKEND_PID=$!

# Start Frontend
echo "Starting Frontend (Vite)..."
cd frontend
npm run dev -- --host &
FRONTEND_PID=$!

echo "------------------------------------------------"
echo "App running!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "------------------------------------------------"
echo "Press Ctrl+C to stop."

trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM

wait
