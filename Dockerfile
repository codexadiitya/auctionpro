FROM python:3.11-slim

WORKDIR /app

# Prevent Python from writing .pyc files & enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install backend dependencies
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy backend application source
COPY backend /app/backend

# Expose default port
EXPOSE 8000

# Set Python path to include backend
ENV PYTHONPATH=/app/backend

# Start uvicorn server
CMD ["uvicorn", "backend.server:app", "--host", "0.0.0.0", "--port", "8000"]
