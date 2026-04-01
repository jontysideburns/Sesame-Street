FROM postgres:16-alpine

# init.sql runs ONLY on first database creation (empty data directory)
COPY postgres/init.sql /docker-entrypoint-initdb.d/01-init.sql

# migrations.sql is available inside the container for on-demand execution
# Run via: docker compose exec postgres psql -U sesame -d sesamestreet -f /migrations/migrations.sql
COPY postgres/migrations.sql /migrations/migrations.sql
