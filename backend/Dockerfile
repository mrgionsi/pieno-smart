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

ENV TZ=Europe/Rome
ENV DEBIAN_FRONTEND=noninteractive

# Install runtime system dependencies (PostgreSQL client, cron, time zone support)
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    cron \
    tzdata \
    && ln -fs /usr/share/zoneinfo/${TZ} /etc/localtime \
    dpkg-reconfigure -f noninteractive tzdata \
    && rm -rf /var/lib/apt/lists/* /var/cache/debconf/*

# Copy wheels from builder
COPY --from=builder /build/wheels /wheels

# Copy application code
COPY . .

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Install Python dependencies from wheels
RUN pip install --no-cache /wheels/*

# Create cron job for daily ingestion at 08:15 Europe/Rome
RUN printf 'CRON_TZ=Europe/Rome\n' > /etc/cron.d/pienosmart-ingestion \
    && printf '15 8 * * * root cd /app && python -m app.jobs.ingestion >> /var/log/pienosmart-ingestion.log 2>&1\n' >> /etc/cron.d/pienosmart-ingestion \
    && chmod 0644 /etc/cron.d/pienosmart-ingestion \
    && crontab /etc/cron.d/pienosmart-ingestion

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/api', timeout=2)" || exit 1

# Expose API port
EXPOSE 8000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
