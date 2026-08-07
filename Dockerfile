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

ENV PORT=8000
EXPOSE 8000

# Start uvicorn server on 0.0.0.0:8000
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
