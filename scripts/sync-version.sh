#!/usr/bin/env bash
# sync-version.sh — called by npm "version" lifecycle hook
# Syncs the version from package.json to all satellite files:
#   - .codebuddy-plugin/plugin.json
#   - .codebuddy-plugin/marketplace.json
#   - docs/CODEBUDDY.md (OMC:VERSION marker)
#
# Usage: automatically invoked by `npm version <bump>`
#        or manually: ./scripts/sync-version.sh [version]

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="${1:-$(node -p "require('$ROOT/package.json').version")}"

echo "🔄 Syncing version $VERSION to satellite files..."

# 1. .codebuddy-plugin/plugin.json
PLUGIN="$ROOT/.codebuddy-plugin/plugin.json"
if [ -f "$PLUGIN" ]; then
  perl -i -pe "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" "$PLUGIN"
  echo "  ✓ plugin.json → $VERSION"
fi

# 2. .codebuddy-plugin/marketplace.json (has 2 version fields)
MARKET="$ROOT/.codebuddy-plugin/marketplace.json"
if [ -f "$MARKET" ]; then
  perl -i -pe "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/g" "$MARKET"
  echo "  ✓ marketplace.json → $VERSION"
fi

# 3. docs/CODEBUDDY.md version marker
CODEBUDDY_MD="$ROOT/docs/CODEBUDDY.md"
if [ -f "$CODEBUDDY_MD" ]; then
  perl -i -pe "s/<!-- OMC:VERSION:[^ ]* -->/<!-- OMC:VERSION:$VERSION -->/" "$CODEBUDDY_MD"
  echo "  ✓ docs/CODEBUDDY.md → $VERSION"
fi

# Stage the changed files so they're included in the version commit
git add "$PLUGIN" "$MARKET" "$CODEBUDDY_MD" 2>/dev/null || true

echo "✅ Version sync complete: $VERSION"
