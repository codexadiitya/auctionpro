FROM python:3.11-slim

WORKDIR /app/backend

# Prevent Python from writing .pyc files & enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install backend dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY backend/ ./

# Expose default port
EXPOSE 8000

# Start uvicorn server — use PORT env var if set by Railway, else 8000
CMD uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}
