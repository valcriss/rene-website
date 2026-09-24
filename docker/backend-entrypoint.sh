#!/bin/sh
set -eu

cd /app/backend

load_secret() {
  variable_name="$1"
  file_variable_name="${variable_name}_FILE"
  direct_value="$(printenv "$variable_name" 2>/dev/null || true)"
  file_path="$(printenv "$file_variable_name" 2>/dev/null || true)"

  if [ -n "$direct_value" ] && [ -n "$file_path" ]; then
    echo "Configuration error: ${variable_name} and ${file_variable_name} cannot both be set." >&2
    exit 1
  fi

  if [ -n "$file_path" ]; then
    if [ ! -r "$file_path" ]; then
      echo "Configuration error: ${file_variable_name} is not readable." >&2
      exit 1
    fi
    secret_value="$(cat "$file_path")"
    if [ -z "$secret_value" ]; then
      echo "Configuration error: ${file_variable_name} is empty." >&2
      exit 1
    fi
    export "${variable_name}=${secret_value}"
    unset "$file_variable_name"
  fi
}

load_secret DATABASE_URL
load_secret JWT_SECRET
load_secret CRON_SECRET
load_secret SMTP_PASSWORD

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Configuration error: DATABASE_URL is required." >&2
  exit 1
fi

if [ -z "${MIGRATION_DATABASE_URL_FILE:-}" ] || [ ! -r "$MIGRATION_DATABASE_URL_FILE" ]; then
  echo "Configuration error: MIGRATION_DATABASE_URL_FILE is required and must be readable." >&2
  exit 1
fi

app_database_url="$DATABASE_URL"
migration_database_url="$(cat "$MIGRATION_DATABASE_URL_FILE")"
unset MIGRATION_DATABASE_URL_FILE

if [ -z "$migration_database_url" ]; then
  echo "Configuration error: MIGRATION_DATABASE_URL_FILE is empty." >&2
  exit 1
fi

max_attempts="${PRISMA_MIGRATE_MAX_ATTEMPTS:-30}"
retry_delay="${PRISMA_MIGRATE_RETRY_DELAY:-2}"
attempt=1

echo "Running Prisma migrations..."
until DATABASE_URL="$migration_database_url" npx prisma migrate deploy --schema prisma/schema.prisma; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Prisma migrate deploy failed after ${attempt} attempts."
    exit 1
  fi

  echo "Prisma migrate deploy failed. Retrying in ${retry_delay}s (${attempt}/${max_attempts})..."
  attempt=$((attempt + 1))
  sleep "$retry_delay"
done

echo "Prisma migrations applied."

echo "Importing communes referential data..."
DATABASE_URL="$app_database_url" npm run communes:import
echo "Communes referential data ready."

export DATABASE_URL="$app_database_url"
exec "$@"
