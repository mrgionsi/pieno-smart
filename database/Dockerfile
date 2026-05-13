# Database Dockerfile for CI/CD
FROM postgis/postgis:18-3.6

# Set environment variables
ENV POSTGRES_DB=pienosmart
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=postgres

# Copy initialization scripts
COPY init-db.sh /docker-entrypoint-initdb.d/
COPY alembic-init.sh /docker-entrypoint-initdb.d/

# Make scripts executable
RUN chmod +x /docker-entrypoint-initdb.d/init-db.sh \
    && chmod +x /docker-entrypoint-initdb.d/alembic-init.sh

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD sh -c 'pg_isready -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-pienosmart}" || exit 1'

# Expose PostgreSQL port
EXPOSE 5432
