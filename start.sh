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
python -m spacy download en_core_web_sm

# Start Backend
echo "Starting Backend (FastAPI)..."
python backend/main.py &
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
