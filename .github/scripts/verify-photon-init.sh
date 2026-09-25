#!/bin/sh
# Exercises docker/photon-init.sh end to end against a local HTTPS fixture server, without
# downloading the real (multi-gigabyte) Photon database dump. Covers:
#   - the happy path: download, checksum verification, extraction, marker-based caching
#   - every guard clause: missing config, malformed checksum, checksum mismatch, a non-HTTPS
#     URL, and a tar archive containing an unsafe (path-traversal) entry
# Run from the repository root: sh .github/scripts/verify-photon-init.sh
set -eu

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
script_under_test="$repo_root/docker/photon-init.sh"
work_dir="$(mktemp -d)"
server_pid=""

cleanup() {
  if [ -n "$server_pid" ]; then
    kill "$server_pid" 2>/dev/null || true
  fi
  rm -rf "$work_dir"
  sudo rm -rf /photon 2>/dev/null || rm -rf /photon 2>/dev/null || true
}
trap cleanup EXIT INT TERM

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

reset_photon_dir() {
  sudo rm -rf /photon 2>/dev/null || rm -rf /photon 2>/dev/null || true
  sudo install -d -o "$(id -u)" -g "$(id -g)" /photon 2>/dev/null || mkdir -p /photon
}

run_init() {
  # Runs the real script with the given env, capturing combined output for assertions. Needs
  # root, exactly like it runs for real (photon-init has the run of its own debian-slim
  # container): the script's own last step chowns to a fixed uid/gid it doesn't run as, which
  # only root can do. The redirect below still runs as the invoking (non-root) user, which is
  # fine: it owns work_dir, so creating output.log in it needs no elevated permission.
  # shellcheck disable=SC2024
  if ! sudo env "$@" sh "$script_under_test" >"$work_dir/output.log" 2>&1; then
    echo "--- photon-init.sh exited non-zero unexpectedly; captured output ---" >&2
    cat "$work_dir/output.log" >&2
    fail "photon-init.sh failed on what should have been a successful run"
  fi
}

run_init_expect_failure() {
  # shellcheck disable=SC2024
  if sudo env "$@" sh "$script_under_test" >"$work_dir/output.log" 2>&1; then
    fail "expected photon-init.sh to fail, but it exited 0 ($*)"
  fi
}

assert_output_contains() {
  grep -qF "$1" "$work_dir/output.log" || {
    echo "--- captured output ---" >&2
    cat "$work_dir/output.log" >&2
    fail "expected output to contain: $1"
  }
}

echo "== Building fixtures =="

mkdir -p "$work_dir/serve" "$work_dir/cert"

# A small, real, previously-published Photon jar (~70MB) so the checksum-verification path is
# exercised against genuine artifact bytes, not a stand-in blob.
jar_version="0.7.4"
jar_url="https://github.com/komoot/photon/releases/download/${jar_version}/photon-opensearch-${jar_version}.jar"
curl --fail --location --proto '=https' --tlsv1.2 --retry 3 --output "$work_dir/serve/photon.jar" "$jar_url"
jar_sha256="$(sha256sum "$work_dir/serve/photon.jar" | cut -d' ' -f1)"

# photon-init.sh only checks that the archive is a valid bzip2 file with no unsafe paths and
# contains the expected index directory — it never validates the index content itself, so a tiny
# synthetic fixture with that exact directory shape exercises the same code path as a real dump.
mkdir -p "$work_dir/build/photon_data/node_1/data/nodes/0/indices"
echo "fixture" >"$work_dir/build/photon_data/node_1/data/nodes/0/indices/placeholder"
tar -C "$work_dir/build" -cjf "$work_dir/serve/photon-db.tar.bz2" photon_data
db_sha256="$(sha256sum "$work_dir/serve/photon-db.tar.bz2" | cut -d' ' -f1)"

# A tar with a path-traversal entry, to prove the safety guard actually rejects it.
mkdir -p "$work_dir/evil-build/photon_data/node_1/data/nodes/0/indices"
echo "fixture" >"$work_dir/evil-build/photon_data/node_1/data/nodes/0/indices/placeholder"
tar -C "$work_dir/evil-build" -cjf "$work_dir/serve/photon-db-evil.tar.bz2" \
  --transform 's,^photon_data,../../../tmp/photon-escape,' photon_data
evil_sha256="$(sha256sum "$work_dir/serve/photon-db-evil.tar.bz2" | cut -d' ' -f1)"

openssl req -x509 -newkey rsa:2048 -keyout "$work_dir/cert/key.pem" -out "$work_dir/cert/cert.pem" \
  -days 1 -nodes -subj "/CN=127.0.0.1" -addext "subjectAltName=IP:127.0.0.1" >/dev/null 2>&1

echo "== Starting local HTTPS fixture server =="
python3 "$(dirname "$0")/https_fixture_server.py" 8443 "$work_dir/serve" "$work_dir/cert/cert.pem" "$work_dir/cert/key.pem" &
server_pid=$!
for _ in $(seq 1 20); do
  CURL_CA_BUNDLE="$work_dir/cert/cert.pem" curl -sS --fail "https://127.0.0.1:8443/photon.jar" -o /dev/null -r 0-0 2>/dev/null && break
  sleep 0.5
done

base_env="CURL_CA_BUNDLE=$work_dir/cert/cert.pem PHOTON_VERSION=$jar_version PHOTON_JAR_URL=https://127.0.0.1:8443/photon.jar PHOTON_JAR_SHA256=$jar_sha256 PHOTON_DB_URL=https://127.0.0.1:8443/photon-db.tar.bz2 PHOTON_DB_SHA256=$db_sha256"

echo "== Happy path: first run downloads, verifies and extracts everything =="
reset_photon_dir
# shellcheck disable=SC2086 # base_env is a deliberate space-separated list of KEY=VALUE words
# (none of which contain spaces or glob characters) meant to word-split into env's arguments.
run_init $base_env
assert_output_contains "Photon initialization complete."
[ -f /photon/bin/photon.jar ] || fail "expected /photon/bin/photon.jar to exist"
[ -d /photon/data/photon_data/node_1/data/nodes/0/indices ] || fail "expected the extracted index directory to exist"

echo "== Re-run: marker-based cache must skip the DB re-download =="
# shellcheck disable=SC2086
run_init $base_env
assert_output_contains "Verified Photon index already present, skipping DB download."

echo "== Guard clause: missing required variable =="
run_init_expect_failure
assert_output_contains "is required."

echo "== Guard clause: malformed checksum =="
run_init_expect_failure \
  CURL_CA_BUNDLE="$work_dir/cert/cert.pem" PHOTON_VERSION="$jar_version" \
  PHOTON_JAR_URL="https://127.0.0.1:8443/photon.jar" PHOTON_JAR_SHA256="not-a-checksum" \
  PHOTON_DB_URL="https://127.0.0.1:8443/photon-db.tar.bz2" PHOTON_DB_SHA256="$db_sha256"
assert_output_contains "checksum must be a SHA-256 hexadecimal digest"

echo "== Guard clause: checksum mismatch =="
reset_photon_dir
wrong_sha256="$(printf '0%.0s' $(seq 1 64))"
run_init_expect_failure \
  CURL_CA_BUNDLE="$work_dir/cert/cert.pem" PHOTON_VERSION="$jar_version" \
  PHOTON_JAR_URL="https://127.0.0.1:8443/photon.jar" PHOTON_JAR_SHA256="$wrong_sha256" \
  PHOTON_DB_URL="https://127.0.0.1:8443/photon-db.tar.bz2" PHOTON_DB_SHA256="$db_sha256"
assert_output_contains "Photon artifact checksum verification failed."

echo "== Guard clause: non-HTTPS URL is rejected before any download =="
run_init_expect_failure \
  PHOTON_VERSION="$jar_version" \
  PHOTON_JAR_URL="http://127.0.0.1:8443/photon.jar" PHOTON_JAR_SHA256="$jar_sha256" \
  PHOTON_DB_URL="https://127.0.0.1:8443/photon-db.tar.bz2" PHOTON_DB_SHA256="$db_sha256"
assert_output_contains "must use HTTPS"

echo "== Guard clause: archive with a path-traversal entry is rejected =="
reset_photon_dir
run_init_expect_failure \
  CURL_CA_BUNDLE="$work_dir/cert/cert.pem" PHOTON_VERSION="$jar_version" \
  PHOTON_JAR_URL="https://127.0.0.1:8443/photon.jar" PHOTON_JAR_SHA256="$jar_sha256" \
  PHOTON_DB_URL="https://127.0.0.1:8443/photon-db-evil.tar.bz2" PHOTON_DB_SHA256="$evil_sha256"
assert_output_contains "Photon DB archive contains an unsafe path."
[ ! -e /tmp/photon-escape ] || fail "the path-traversal entry was actually extracted outside the staging directory"

echo "All photon-init.sh checks passed."
