#!/bin/bash

# Resolve the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Paths relative to script's location
DATA_JSON="$SCRIPT_DIR/data.json"
CATS_JSON="$SCRIPT_DIR/../cats.json"

# Combine and minify
jq -s . "$DATA_JSON" > "$CATS_JSON"
minify "$CATS_JSON" -o "$CATS_JSON"
