#!/usr/bin/env bash
set -euo pipefail
umask 077

: "${RESTORE_TARGET_CONFIRM:?Set RESTORE_TARGET_CONFIRM=isolated for a disposable environment}"
: "${RESTORE_DATABASE_URL_FILE:?RESTORE_DATABASE_URL_FILE is required}"
: "${BACKUP_PATH:?BACKUP_PATH must name one backup directory}"
: "${AGE_IDENTITY_FILE:?AGE_IDENTITY_FILE is required}"
: "${RESTORE_UPLOADS_DIR:?RESTORE_UPLOADS_DIR is required}"

test "$RESTORE_TARGET_CONFIRM" = "isolated"
command -v age >/dev/null
command -v pg_restore >/dev/null
command -v sha256sum >/dev/null
test -f "$BACKUP_PATH/SHA256SUMS"
test -f "$BACKUP_PATH/database.dump.age"
test -f "$BACKUP_PATH/uploads.tar.age"

(
  cd "$BACKUP_PATH"
  sha256sum --check SHA256SUMS
)
database_url="$(<"$RESTORE_DATABASE_URL_FILE")"
test -n "$database_url"
mkdir -p "$RESTORE_UPLOADS_DIR"

age --decrypt --identity "$AGE_IDENTITY_FILE" "$BACKUP_PATH/database.dump.age" |
  pg_restore --dbname="$database_url" --clean --if-exists --no-owner --exit-on-error
age --decrypt --identity "$AGE_IDENTITY_FILE" "$BACKUP_PATH/uploads.tar.age" |
  tar --extract --directory "$RESTORE_UPLOADS_DIR"
printf 'restoration verified from %s\n' "$BACKUP_PATH"
