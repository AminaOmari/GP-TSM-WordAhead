# Use a Python 3.9 image as base
FROM python:3.9-slim

# Install system dependencies and Node.js
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && curl -sL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Set up a new user 'user' with UID 1000 (Required for Hugging Face Spaces)
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"
WORKDIR /home/user/app

# Copy project files and change ownership
COPY --chown=user:user . .

# Build the Frontend
WORKDIR /home/user/app/frontend
RUN npm install
RUN npm run build

# Install Backend dependencies
WORKDIR /home/user/app
RUN pip install --no-cache-dir -r backend/requirements.txt

# The app listens on port 7860 for Hugging Face Spaces
ENV PORT=7860

# Command to start the unified app
CMD gunicorn backend.main:app -w 1 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:7860
