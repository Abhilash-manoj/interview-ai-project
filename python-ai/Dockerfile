FROM python:3.10-slim

WORKDIR /usr/src/ai-service

# Install system dependencies if your AI models need them
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy your Python source files
COPY . .

EXPOSE 8000

# Run FastAPI with live reloading for development
CMD ["uvicorn", "aiendpoints:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]