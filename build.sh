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
# Install CPU-specific torch to save memory on Render Free Tier
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r backend/requirements.txt
python -m spacy download en_core_web_sm

# --- Model Pre-downloading ---
echo "Downloading Models..."
python backend/download_models.py

echo "Build Complete!"
