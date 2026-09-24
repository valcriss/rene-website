#!/bin/sh
set -eu

if [ -z "${APP_DATABASE_USER:-}" ]; then
  echo "APP_DATABASE_USER is required." >&2
  exit 1
fi

if [ -z "${APP_DATABASE_PASSWORD_FILE:-}" ] || [ ! -r "$APP_DATABASE_PASSWORD_FILE" ]; then
  echo "APP_DATABASE_PASSWORD_FILE is required and must be readable." >&2
  exit 1
fi

app_database_password="$(cat "$APP_DATABASE_PASSWORD_FILE")"
if [ -z "$app_database_password" ]; then
  echo "APP_DATABASE_PASSWORD_FILE must not be empty." >&2
  exit 1
fi

PSQL_APP_PASSWORD="$app_database_password" psql --set=ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set=app_user="$APP_DATABASE_USER" \
  --set=migration_user="$POSTGRES_USER" <<'SQL'
\getenv app_password PSQL_APP_PASSWORD
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'app_user', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_user') \gexec

SELECT format('ALTER ROLE %I NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L', :'app_user', :'app_password') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), :'app_user') \gexec
SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'app_user') \gexec
SELECT format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I', :'app_user') \gexec
SELECT format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I', :'app_user') \gexec
SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I', :'migration_user', :'app_user') \gexec
SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I', :'migration_user', :'app_user') \gexec
SQL
