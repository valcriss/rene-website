#!/usr/bin/env bash
set -euo pipefail
umask 077

: "${BACKUP_DIR:?BACKUP_DIR must point to encrypted backup storage}"
: "${BACKUP_DATABASE_URL_FILE:?BACKUP_DATABASE_URL_FILE is required}"
: "${BACKUP_UPLOADS_DIR:?BACKUP_UPLOADS_DIR is required}"
: "${AGE_RECIPIENT_FILE:?AGE_RECIPIENT_FILE is required}"

command -v age >/dev/null
command -v pg_dump >/dev/null
command -v sha256sum >/dev/null

database_url="$(<"$BACKUP_DATABASE_URL_FILE")"
recipient="$(<"$AGE_RECIPIENT_FILE")"
test -n "$database_url"
test -n "$recipient"
test -d "$BACKUP_UPLOADS_DIR"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
destination="$BACKUP_DIR/$timestamp"
mkdir -p "$BACKUP_DIR"
temporary="$(mktemp -d "${BACKUP_DIR%/}/.backup-${timestamp}.XXXXXX")"
cleanup() { rm -rf "$temporary"; }
trap cleanup EXIT

mkdir -p "$destination"
pg_dump --dbname="$database_url" --format=custom --no-owner --no-privileges |
  age --recipient "$recipient" --output "$temporary/database.dump.age"
tar --create --directory "$BACKUP_UPLOADS_DIR" --file - . |
  age --recipient "$recipient" --output "$temporary/uploads.tar.age"

(
  cd "$temporary"
  sha256sum database.dump.age uploads.tar.age > SHA256SUMS
)
printf 'createdAt=%s\nformat=postgres-custom+tar\n' "$timestamp" > "$temporary/manifest.txt"
mv "$temporary"/* "$destination/"
printf 'backup=%s\n' "$destination"
