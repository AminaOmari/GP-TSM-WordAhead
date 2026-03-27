# Stage 1: Build the React frontend
FROM node:20 AS frontend-builder
WORKDIR /app/frontend
# Copy package files first for better caching
COPY frontend/package*.json ./
RUN npm install
# Copy the rest of the frontend source code
COPY frontend/ .
# Build the production optimized frontend
RUN npm run build

# Stage 2: Serve with Python backend
FROM python:3.12-slim
WORKDIR /app
# Install backend dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend files and the GP-TSM folder
COPY backend/ ./backend/
COPY GP-TSM/ ./GP-TSM/

# Crucial step: Copy the built frontend from Stage 1 into the correct path
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose port (Render or other platforms will override this if configured through ENV)
EXPOSE 8000
CMD ["python", "backend/main.py"]
