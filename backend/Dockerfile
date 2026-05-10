# Build stage
FROM python:3.13-slim as builder

WORKDIR /build

# Install system dependencies required for building Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy pyproject.toml and build wheel
COPY pyproject.toml .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /build/wheels -e .

# Runtime stage
FROM python:3.13-slim

WORKDIR /app

# Install runtime system dependencies (PostgreSQL client, PostGIS libraries if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy wheels from builder
COPY --from=builder /build/wheels /wheels

# Copy application code
COPY . .

# Install Python dependencies from wheels
RUN pip install --no-cache /wheels/*

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/api', timeout=2)" || exit 1

# Expose API port
EXPOSE 8000

# Run FastAPI application with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
