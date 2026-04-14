#!/bin/sh
set -eu

cd /app/backend

max_attempts="${PRISMA_MIGRATE_MAX_ATTEMPTS:-30}"
retry_delay="${PRISMA_MIGRATE_RETRY_DELAY:-2}"
attempt=1

echo "Running Prisma migrations..."
until npx prisma migrate deploy --schema prisma/schema.prisma; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Prisma migrate deploy failed after ${attempt} attempts."
    exit 1
  fi

  echo "Prisma migrate deploy failed. Retrying in ${retry_delay}s (${attempt}/${max_attempts})..."
  attempt=$((attempt + 1))
  sleep "$retry_delay"
done

echo "Prisma migrations applied."
exec "$@"