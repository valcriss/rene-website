#!/bin/sh
set -eu

required() {
  variable_name="$1"
  eval "variable_value=\${$variable_name:-}"
  if [ -z "$variable_value" ]; then
    echo "Configuration error: $variable_name is required." >&2
    exit 1
  fi
}

validate_sha256() {
  checksum="$1"
  if ! printf '%s' "$checksum" | grep -Eq '^[a-fA-F0-9]{64}$'; then
    echo "Configuration error: checksum must be a SHA-256 hexadecimal digest." >&2
    exit 1
  fi
}

download_and_verify() {
  url="$1"
  checksum="$2"
  destination="$3"
  temporary_file="${destination}.download"

  rm -f "$temporary_file"
  if ! curl --fail --location --proto '=https' --tlsv1.2 --retry 3 --output "$temporary_file" "$url"; then
    rm -f "$temporary_file"
    exit 1
  fi
  echo "Verifying checksum..."
  if ! printf '%s  %s\n' "$checksum" "$temporary_file" | sha256sum -c -; then
    rm -f "$temporary_file"
    echo "Photon artifact checksum verification failed." >&2
    exit 1
  fi
  echo "Checksum verified."
  mv "$temporary_file" "$destination"
}

required PHOTON_VERSION
required PHOTON_JAR_URL
required PHOTON_JAR_SHA256
required PHOTON_DB_URL
required PHOTON_DB_SHA256
validate_sha256 "$PHOTON_JAR_SHA256"
validate_sha256 "$PHOTON_DB_SHA256"

for url in "$PHOTON_JAR_URL" "$PHOTON_DB_URL"; do
  case "$url" in
    https://*) ;;
    *)
    echo "Configuration error: Photon artifact URLs must use HTTPS." >&2
    exit 1
    ;;
  esac
done

mkdir -p /photon/bin /photon/data
jar_versioned="/photon/bin/photon-${PHOTON_VERSION}.jar"
jar="/photon/bin/photon.jar"

if [ ! -f "$jar_versioned" ] || ! printf '%s  %s\n' "$PHOTON_JAR_SHA256" "$jar_versioned" | sha256sum -c -; then
  echo "Downloading verified Photon jar ${PHOTON_VERSION}..."
  download_and_verify "$PHOTON_JAR_URL" "$PHOTON_JAR_SHA256" "$jar_versioned"
fi
ln -sfn "$(basename "$jar_versioned")" "$jar"

marker="/photon/data/.photon-db-source"
expected_source="${PHOTON_VERSION}:${PHOTON_JAR_SHA256}:${PHOTON_DB_URL}:${PHOTON_DB_SHA256}"
index_directory="/photon/data/photon_data/node_1/data/nodes/0/indices"

if [ -d "$index_directory" ] && [ -f "$marker" ] && \
  [ "$(cat "$marker")" = "$expected_source" ] && \
  find "$index_directory" -mindepth 1 -print -quit | grep -q .; then
  echo "Verified Photon index already present, skipping DB download."
else
  archive="/photon/data/.photon-db.tar.bz2"
  staging_directory="/photon/data/.photon-extract"
  rm -rf "$staging_directory" "$archive"
  echo "Downloading verified Photon DB dump..."
  download_and_verify "$PHOTON_DB_URL" "$PHOTON_DB_SHA256" "$archive"
  echo "Verifying archive integrity (bzip2 -t)..."
  bzip2 -t "$archive"
  echo "Archive integrity OK."
  echo "Checking archive for unsafe paths..."
  if tar -tjf "$archive" | grep -Eq '(^/|(^|/)\.\.(/|$))'; then
    echo "Photon DB archive contains an unsafe path." >&2
    exit 1
  fi
  echo "No unsafe paths found."
  mkdir -p "$staging_directory"
  echo "Extracting Photon database (this can take several minutes)..."
  tar -xjf "$archive" -C "$staging_directory" --no-same-owner --no-same-permissions
  echo "Extraction complete."
  if [ ! -d "$staging_directory/photon_data/node_1/data/nodes/0/indices" ]; then
    echo "Photon DB archive does not contain the expected index." >&2
    exit 1
  fi
  rm -rf /photon/data/photon_data
  mv "$staging_directory/photon_data" /photon/data/photon_data
  rm -rf "$staging_directory" "$archive"
  printf '%s' "$expected_source" > "$marker"
fi

echo "Fixing ownership..."
chown -R 65532:65532 /photon
echo "Photon initialization complete."
