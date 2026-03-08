#!/usr/bin/env bash
# exit on error
set -o errexit

# --- Frontend Build ---
echo "Building Frontend..."
cd frontend
npm install
npm run build
cd ..

# --- Backend Dependencies ---
echo "Installing Backend Dependencies..."
pip install -r backend/requirements.txt

echo "Build Complete!"
