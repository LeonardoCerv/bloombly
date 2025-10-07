# Multi-stage build for Python API
FROM python:3.11-slim as base

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Ensure the existing trained model is present (if it exists)
# This avoids retraining on every deployment
RUN if [ -f "app/bloom_model_v2.pkl" ]; then \
        echo "✅ Using existing trained model"; \
        ls -lh app/bloom_model_v2.pkl; \
    else \
        echo "⚠️  No pre-trained model found - will train on startup"; \
    fi

# Make startup script executable
RUN chmod +x startup.sh

# Create non-root user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=180s --retries=3 \
    CMD curl -f http://localhost:5001/api/health || exit 1

# Start the application with training first
CMD ["./startup.sh"]
